import {
  PipeTransform,
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as path from 'path';

/**
 * OWASP 檔案上傳安全驗證 Pipe
 *
 * 驗證項目：
 * 1. 檔案是否存在
 * 2. 檔案大小限制
 * 3. 檔案類型白名單（MIME type + 副檔名）
 * 4. 檔案名稱清理（防止路徑遍歷）
 */
export interface FileValidationOptions {
  /** 允許的 MIME types */
  allowedMimeTypes?: string[];
  /** 允許的副檔名（含點號，如 '.xlsx'） */
  allowedExtensions?: string[];
  /** 最大檔案大小（bytes），預設 10MB */
  maxSize?: number;
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly logger = new Logger(FileValidationPipe.name);
  private readonly options: Required<FileValidationOptions>;

  constructor(options?: FileValidationOptions) {
    this.options = {
      allowedMimeTypes: options?.allowedMimeTypes ?? [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
      ],
      allowedExtensions: options?.allowedExtensions ?? [
        '.xlsx', '.xls', '.csv',
      ],
      maxSize: options?.maxSize ?? 10 * 1024 * 1024, // 10MB
    };
  }

  transform(file: Express.Multer.File): Express.Multer.File {
    // 1. 檢查檔案是否存在
    if (!file) {
      throw new BadRequestException('請選擇要上傳的檔案');
    }

    // 2. 檢查檔案大小
    if (file.size > this.options.maxSize) {
      const maxMB = Math.round(this.options.maxSize / 1024 / 1024);
      throw new BadRequestException(
        `檔案大小超過限制（最大 ${maxMB}MB），目前檔案大小為 ${Math.round(file.size / 1024 / 1024)}MB`,
      );
    }

    // 3. 檢查 MIME type
    if (this.options.allowedMimeTypes.length > 0 &&
        !this.options.allowedMimeTypes.includes(file.mimetype)) {
      this.logger.warn(
        `檔案類型被拒絕: mimetype=${file.mimetype}, filename=${file.originalname}`,
      );
      throw new BadRequestException(
        `不支援的檔案類型: ${file.mimetype}。允許的類型: ${this.options.allowedExtensions.join(', ')}`,
      );
    }

    // 3b. OWASP A03: 當 MIME type 為 application/octet-stream 時，驗證 magic bytes
    if (file.mimetype === 'application/octet-stream' && file.buffer) {
      if (!this.validateMagicBytes(file)) {
        this.logger.warn(
          `Magic bytes 驗證失敗: mimetype=${file.mimetype}, filename=${file.originalname}`,
        );
        throw new BadRequestException(
          `檔案內容與格式不符。請確認上傳的是有效的 ${this.options.allowedExtensions.join(' / ')} 檔案`,
        );
      }
    }

    // 4. 檢查副檔名
    const ext = path.extname(file.originalname).toLowerCase();
    if (this.options.allowedExtensions.length > 0 &&
        !this.options.allowedExtensions.includes(ext)) {
      this.logger.warn(
        `檔案副檔名被拒絕: ext=${ext}, filename=${file.originalname}`,
      );
      throw new BadRequestException(
        `不支援的檔案格式: ${ext}。允許的格式: ${this.options.allowedExtensions.join(', ')}`,
      );
    }

    // 5. 清理檔案名稱（防止路徑遍歷攻擊）
    const sanitizedFilename = this.sanitizeFilename(file.originalname);
    file.originalname = sanitizedFilename;

    return file;
  }

  /**
   * 清理檔案名稱
   * - 移除路徑分隔符號
   * - 移除特殊字元
   * - 防止路徑遍歷攻擊（../ 等）
   */
  private sanitizeFilename(filename: string): string {
    // 取得純檔案名稱（移除路徑）
    const basename = path.basename(filename);

    // 移除不安全字元，僅保留字母、數字、中文、底線、連字號、點號
    const sanitized = basename.replace(/[^\w\u4e00-\u9fff.\-]/g, '_');

    // 防止以點號開頭（隱藏檔案）
    return sanitized.replace(/^\.+/, '');
  }

  /**
   * OWASP A03: 驗證檔案 magic bytes
   * 當 MIME type 為 application/octet-stream 時，透過檔案頭確認實際格式
   */
  private validateMagicBytes(file: Express.Multer.File): boolean {
    const buffer = file.buffer;
    if (!buffer || buffer.length < 4) return false;

    const ext = path.extname(file.originalname).toLowerCase();

    // XLSX: ZIP 格式（PK header: 50 4B 03 04）
    if (ext === '.xlsx') {
      return buffer[0] === 0x50 && buffer[1] === 0x4B &&
             buffer[2] === 0x03 && buffer[3] === 0x04;
    }

    // XLS: OLE Compound Document（D0 CF 11 E0）
    if (ext === '.xls') {
      return buffer[0] === 0xD0 && buffer[1] === 0xCF &&
             buffer[2] === 0x11 && buffer[3] === 0xE0;
    }

    // CSV: 純文字（檢查前 1024 bytes 是否為有效文字，不含 null bytes）
    if (ext === '.csv') {
      const sample = buffer.slice(0, Math.min(1024, buffer.length));
      for (let i = 0; i < sample.length; i++) {
        if (sample[i] === 0) return false;
      }
      return true;
    }

    return false;
  }
}

/**
 * 建立 Excel 檔案專用的驗證 pipe
 */
export function ExcelFileValidationPipe() {
  return new FileValidationPipe({
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/octet-stream', // 部分瀏覽器上傳 xlsx 時使用此 type
    ],
    allowedExtensions: ['.xlsx', '.xls', '.csv'],
    maxSize: 10 * 1024 * 1024, // 10MB
  });
}

/**
 * 建立圖片檔案專用的驗證 pipe
 * OWASP A08: 僅允許安全的圖片格式
 */
export function ImageFileValidationPipe() {
  return new FileValidationPipe({
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
    maxSize: 10 * 1024 * 1024, // 10MB
  });
}
