import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageProvider } from '../storage.interface';

/**
 * 本地磁碟儲存（開發環境用）
 * 檔案儲存在 UPLOAD_PATH 目錄下，透過靜態路由提供存取
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadPath: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadPath = this.configService.get<string>('UPLOAD_PATH', './uploads');
    const port = this.configService.get<string>('PORT', '3001');
    this.baseUrl = this.configService.get<string>(
      'API_BASE_URL',
      `http://localhost:${port}`,
    );
  }

  /**
   * OWASP A03: 驗證檔案路徑不包含目錄遍歷攻擊（../）
   */
  private validateKey(key: string): string {
    const resolved = path.resolve(this.uploadPath, key);
    const uploadRoot = path.resolve(this.uploadPath);
    if (!resolved.startsWith(uploadRoot + path.sep) && resolved !== uploadRoot) {
      throw new BadRequestException('Invalid file path');
    }
    return resolved;
  }

  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const filePath = this.validateKey(key);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);
    this.logger.debug(`檔案已儲存至本地: ${filePath}`);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.validateKey(key);
    try {
      await fs.unlink(filePath);
      this.logger.debug(`檔案已刪除: ${filePath}`);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      this.logger.warn(`檔案不存在，無需刪除: ${filePath}`);
    }
  }

  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    // 本地模式直接回傳公開 URL
    return this.getPublicUrl(key);
  }

  getPublicUrl(key: string): string {
    return `${this.baseUrl}/uploads/${key}`;
  }
}
