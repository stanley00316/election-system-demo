import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { MapsService } from '../maps/maps.service';
import { UserRole, PoliticalStance, PoliticalParty } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { Readable } from 'stream';

// ==================== 型別定義 ====================

export type ImportErrorType =
  | 'HEADER_ERROR'
  | 'REQUIRED_FIELD'
  | 'FORMAT_ERROR'
  | 'DUPLICATE'
  | 'SYSTEM_ERROR';

export interface ImportError {
  row: number;
  column?: string;
  type: ImportErrorType;
  message: string;
  suggestion?: string;
  currentValue?: string;
  acceptedValues?: string[];
}

export interface HeaderValidation {
  valid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  unrecognized: Array<{ column: string; suggestion?: string }>;
  mappedColumns: Record<string, string>;
}

export interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  totalRows: number;
  errors: ImportError[];
  headerValidation: HeaderValidation;
}

export interface ValidateResult {
  headerValidation: HeaderValidation;
  previewRows: Record<string, string>[];
  totalRows: number;
}

interface VoterRow {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  village?: string;
  politicalParty?: string;
  stance?: string;
  age?: number;
  gender?: string;
  occupation?: string;
  tags?: string;
  notes?: string;
}

// ==================== 常數 ====================

/** 系統支援的所有欄位名稱對應 */
const COLUMN_ALIASES: Record<string, string[]> = {
  '姓名': ['姓名', 'name', '名稱', '名字', '全名'],
  '電話': ['電話', 'phone', '手機', '連絡電話', '聯絡電話', '電話號碼', '手機號碼', 'tel', 'mobile'],
  'email': ['email', 'e-mail', '電子郵件', '信箱', '電郵', 'mail'],
  '地址': ['地址', 'address', '通訊地址', '住址', '居住地址'],
  '縣市': ['縣市', 'city', '城市', '縣/市'],
  '區': ['區', 'district', '鄉鎮市區', '鄉鎮區'],
  '里': ['里', 'village', '村里', '村/里'],
  '政黨': ['政黨', 'party', '所屬政黨', '政黨傾向'],
  '政治傾向': ['政治傾向', 'stance', '傾向', '立場', '支持度'],
  '年齡': ['年齡', 'age', '歲數'],
  '性別': ['性別', 'gender', 'sex'],
  '職業': ['職業', 'occupation', '工作', 'job'],
  '標籤': ['標籤', 'tags', 'tag', '分類'],
  '備註': ['備註', 'notes', 'note', '備注', '說明', '附註'],
};

const REQUIRED_COLUMNS = ['姓名'];

const VALID_STANCES = ['強力支持', '支持', '傾向支持', '中立', '未表態', '傾向反對', '反對', '強烈反對'];
const VALID_PARTIES = ['國民黨', '民進黨', '民眾黨', '時代力量', '台灣基進', '無黨籍', '其他', 'KMT', 'DPP', 'TPP', 'NPP', 'TSP'];
const VALID_GENDERS = ['男', '女', 'M', 'F', 'male', 'female'];

// ==================== 服務 ====================

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);

  constructor(
    private prisma: PrismaService,
    private campaignsService: CampaignsService,
    private mapsService: MapsService,
  ) {}

  // ==================== 公開方法 ====================

  /**
   * 僅驗證檔案（不寫入資料庫），回傳標題驗證結果 + 前幾列預覽
   */
  async validateImport(
    file: Express.Multer.File,
    campaignId: string,
    userId: string,
  ): Promise<ValidateResult> {
    await this.campaignsService.checkCampaignAccess(
      campaignId, userId, [UserRole.ADMIN, UserRole.EDITOR],
    );

    if (!file) throw new BadRequestException('請上傳檔案');

    const { worksheet } = await this.loadWorkbook(file);
    const rawHeaders = this.extractRawHeaders(worksheet);
    const headerValidation = this.validateHeaders(rawHeaders);

    // 讀取前 5 列作為預覽
    const previewRows: Record<string, string>[] = [];
    const maxPreview = Math.min(worksheet.rowCount, 6); // row 1 = header
    for (let r = 2; r <= maxPreview; r++) {
      const row = worksheet.getRow(r);
      const obj: Record<string, string> = {};
      row.eachCell((cell, colNumber) => {
        const header = rawHeaders[colNumber] || `欄${colNumber}`;
        obj[header] = String(cell.value ?? '');
      });
      if (Object.values(obj).some(v => v.trim() !== '')) {
        previewRows.push(obj);
      }
    }

    return {
      headerValidation,
      previewRows,
      totalRows: Math.max(0, worksheet.rowCount - 1),
    };
  }

  /**
   * 完整匯入選民資料
   */
  async importVoters(
    file: Express.Multer.File,
    campaignId: string,
    userId: string,
  ): Promise<ImportResult> {
    await this.campaignsService.checkCampaignAccess(
      campaignId, userId, [UserRole.ADMIN, UserRole.EDITOR],
    );

    if (!file) throw new BadRequestException('請上傳檔案');

    const { worksheet } = await this.loadWorkbook(file);
    const rawHeaders = this.extractRawHeaders(worksheet);
    const headerValidation = this.validateHeaders(rawHeaders);

    const result: ImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      totalRows: Math.max(0, worksheet.rowCount - 1),
      errors: [],
      headerValidation,
    };

    // 若缺少必要欄位，提前終止
    if (headerValidation.missingRequired.length > 0) {
      result.errors.push({
        row: 0,
        type: 'HEADER_ERROR',
        message: `缺少必要欄位：${headerValidation.missingRequired.join('、')}`,
        suggestion: '請確認檔案第一列包含必要的欄位標題。可下載範例檔案作為參考。',
      });
      result.failed = result.totalRows;
      return result;
    }

    // 未辨識欄位警告
    for (const u of headerValidation.unrecognized) {
      result.errors.push({
        row: 1,
        column: u.column,
        type: 'HEADER_ERROR',
        message: `欄位「${u.column}」無法辨識，該欄資料將被忽略`,
        suggestion: u.suggestion
          ? `您是否是指「${u.suggestion}」？請修正欄位名稱後重新匯入。`
          : '請參考範例檔案中的欄位名稱。',
      });
    }

    // 建立 header index mapping
    const headerMap = this.buildHeaderMap(rawHeaders);

    // 處理每一列
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      // 跳過完全空白列
      let hasData = false;
      row.eachCell(() => { hasData = true; });
      if (!hasData) continue;

      try {
        const voterData = this.parseRowWithMap(row, headerMap);

        // 逐欄驗證
        const rowErrors = this.validateRow(voterData, rowNumber);
        if (rowErrors.some(e => e.type === 'REQUIRED_FIELD')) {
          result.errors.push(...rowErrors);
          result.failed++;
          continue;
        }
        // 格式錯誤只是警告，不阻止匯入，但記錄
        const formatErrors = rowErrors.filter(e => e.type === 'FORMAT_ERROR');
        if (formatErrors.length > 0) {
          result.errors.push(...formatErrors);
        }

        // 檢查重複（依電話）
        if (voterData.phone) {
          const existing = await this.prisma.voter.findFirst({
            where: { campaignId, phone: voterData.phone },
          });
          if (existing) {
            result.duplicates++;
            result.errors.push({
              row: rowNumber,
              column: '電話',
              type: 'DUPLICATE',
              message: `電話「${voterData.phone}」已存在於資料庫中`,
              suggestion: '此列已跳過。如需更新現有資料，請使用編輯功能。',
              currentValue: voterData.phone,
            });
            continue;
          }
        }

        // Geocoding
        let latitude: number | undefined;
        let longitude: number | undefined;
        if (voterData.address) {
          try {
            const coords = await this.mapsService.geocode(voterData.address);
            latitude = coords.latitude;
            longitude = coords.longitude;
          } catch {
            // Geocoding 失敗不阻止匯入
          }
        }

        // 建立選民
        await this.prisma.voter.create({
          data: {
            campaignId,
            name: voterData.name,
            phone: voterData.phone,
            email: voterData.email,
            address: voterData.address,
            city: voterData.city,
            districtName: voterData.district,
            village: voterData.village,
            latitude,
            longitude,
            politicalParty: this.parseParty(voterData.politicalParty),
            stance: this.parseStance(voterData.stance),
            age: voterData.age,
            gender: this.parseGender(voterData.gender),
            occupation: voterData.occupation,
            tags: voterData.tags ? voterData.tags.split(',').map(t => t.trim()) : [],
            notes: voterData.notes,
            createdBy: userId,
          },
        });

        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          type: 'SYSTEM_ERROR',
          message: error instanceof Error ? error.message : '未知錯誤',
          suggestion: '此列匯入失敗。請檢查資料格式是否正確，或聯絡系統管理員。',
        });
      }
    }

    return result;
  }

  /**
   * 匯出選民資料
   */
  async exportVoters(campaignId: string, userId: string): Promise<Buffer> {
    await this.campaignsService.checkCampaignAccess(
      campaignId, userId, [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER],
    );

    const voters = await this.prisma.voter.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('選民資料');

    worksheet.columns = [
      { header: '姓名', key: 'name', width: 15 },
      { header: '電話', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: '地址', key: 'address', width: 40 },
      { header: '縣市', key: 'city', width: 10 },
      { header: '區', key: 'district', width: 10 },
      { header: '里', key: 'village', width: 10 },
      { header: '政黨', key: 'politicalParty', width: 10 },
      { header: '政治傾向', key: 'stance', width: 12 },
      { header: '影響力', key: 'influenceScore', width: 10 },
      { header: '年齡', key: 'age', width: 8 },
      { header: '性別', key: 'gender', width: 8 },
      { header: '職業', key: 'occupation', width: 15 },
      { header: '標籤', key: 'tags', width: 20 },
      { header: '接觸次數', key: 'contactCount', width: 10 },
      { header: '最後接觸', key: 'lastContactAt', width: 15 },
      { header: '備註', key: 'notes', width: 30 },
    ];

    for (const voter of voters) {
      worksheet.addRow({
        name: voter.name,
        phone: voter.phone,
        email: voter.email,
        address: voter.address,
        city: voter.city,
        district: voter.districtName,
        village: voter.village,
        politicalParty: this.formatParty(voter.politicalParty),
        stance: this.formatStance(voter.stance),
        influenceScore: voter.influenceScore,
        age: voter.age,
        gender: this.formatGender(voter.gender),
        occupation: voter.occupation,
        tags: voter.tags.join(', '),
        contactCount: voter.contactCount,
        lastContactAt: voter.lastContactAt?.toLocaleDateString('zh-TW'),
        notes: voter.notes,
      });
    }

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  // ==================== 私有方法：檔案載入 ====================

  /**
   * 智能載入工作簿（支援 xlsx/xls/csv）
   */
  private async loadWorkbook(file: Express.Multer.File): Promise<{ workbook: ExcelJS.Workbook; worksheet: ExcelJS.Worksheet }> {
    const ext = path.extname(file.originalname).toLowerCase();
    const workbook = new ExcelJS.Workbook();

    try {
      if (ext === '.csv') {
        // CSV 解析
        const stream = new Readable();
        stream.push(file.buffer);
        stream.push(null);
        await workbook.csv.read(stream);
      } else {
        // Excel 解析（xlsx / xls）
        await workbook.xlsx.load(file.buffer as any);
      }
    } catch (error) {
      this.logger.warn(`檔案解析失敗: ${file.originalname}, error: ${error}`);
      if (ext === '.csv') {
        throw new BadRequestException(
          'CSV 檔案解析失敗。請確認檔案為正確的 CSV 格式（UTF-8 編碼、逗號分隔）。',
        );
      }
      throw new BadRequestException(
        'Excel 檔案解析失敗。請確認檔案為正確的 .xlsx 或 .xls 格式，且未受密碼保護。',
      );
    }

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet || worksheet.rowCount < 1) {
      throw new BadRequestException(
        '檔案中沒有找到資料工作表。請確認檔案至少包含一個有資料的工作表。',
      );
    }

    return { workbook, worksheet };
  }

  // ==================== 私有方法：標題驗證 ====================

  private extractRawHeaders(worksheet: ExcelJS.Worksheet): string[] {
    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value || '').trim();
    });
    return headers;
  }

  /**
   * 驗證標題列：辨識欄位對應、偵測缺失與未知欄位
   */
  private validateHeaders(rawHeaders: string[]): HeaderValidation {
    const mappedColumns: Record<string, string> = {};
    const matchedSystemCols = new Set<string>();
    const unmatchedRaw: string[] = [];

    // 對每個原始標題，嘗試找到系統欄位對應
    for (let i = 1; i < rawHeaders.length; i++) {
      const raw = rawHeaders[i];
      if (!raw) continue;
      const rawLower = raw.toLowerCase();

      let found = false;
      for (const [systemCol, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (aliases.some(a => a.toLowerCase() === rawLower)) {
          mappedColumns[raw] = systemCol;
          matchedSystemCols.add(systemCol);
          found = true;
          break;
        }
      }
      if (!found) {
        unmatchedRaw.push(raw);
      }
    }

    // 找出缺少的必要欄位
    const missingRequired = REQUIRED_COLUMNS.filter(c => !matchedSystemCols.has(c));

    // 找出缺少的可選欄位
    const allSystemCols = Object.keys(COLUMN_ALIASES);
    const missingOptional = allSystemCols.filter(
      c => !matchedSystemCols.has(c) && !REQUIRED_COLUMNS.includes(c),
    );

    // 對未辨識欄位嘗試模糊比對
    const unrecognized = unmatchedRaw.map(col => {
      const suggestion = this.fuzzyMatch(col);
      return { column: col, suggestion };
    });

    return {
      valid: missingRequired.length === 0,
      missingRequired,
      missingOptional,
      unrecognized,
      mappedColumns,
    };
  }

  /**
   * 模糊比對：找出最接近的系統欄位名稱
   */
  private fuzzyMatch(input: string): string | undefined {
    const inputLower = input.toLowerCase();
    let bestMatch: string | undefined;
    let bestScore = 0;

    for (const [systemCol, aliases] of Object.entries(COLUMN_ALIASES)) {
      for (const alias of [systemCol, ...aliases]) {
        const score = this.similarity(inputLower, alias.toLowerCase());
        if (score > bestScore && score >= 0.5) {
          bestScore = score;
          bestMatch = systemCol;
        }
      }
    }

    return bestMatch;
  }

  /**
   * 簡易字串相似度計算（Dice coefficient）
   */
  private similarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    const bigramsA = new Set<string>();
    for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.substring(i, i + 2));
    let intersection = 0;
    for (let i = 0; i < b.length - 1; i++) {
      if (bigramsA.has(b.substring(i, i + 2))) intersection++;
    }
    return (2 * intersection) / (a.length - 1 + b.length - 1);
  }

  // ==================== 私有方法：列解析 ====================

  private buildHeaderMap(rawHeaders: string[]): Record<number, string> {
    const map: Record<number, string> = {};
    for (let i = 1; i < rawHeaders.length; i++) {
      const raw = rawHeaders[i];
      if (!raw) continue;
      const rawLower = raw.toLowerCase();
      for (const [systemCol, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (aliases.some(a => a.toLowerCase() === rawLower)) {
          map[i] = systemCol;
          break;
        }
      }
    }
    return map;
  }

  private parseRowWithMap(row: ExcelJS.Row, headerMap: Record<number, string>): VoterRow {
    const data: Record<string, any> = {};
    row.eachCell((cell, colNumber) => {
      const systemCol = headerMap[colNumber];
      if (systemCol) {
        data[systemCol] = cell.value;
      }
    });

    return {
      name: String(data['姓名'] || '').trim(),
      phone: data['電話'] ? String(data['電話']).trim() : undefined,
      email: data['email'] ? String(data['email']).trim() : undefined,
      address: data['地址'] ? String(data['地址']).trim() : undefined,
      city: data['縣市'] ? String(data['縣市']).trim() : undefined,
      district: data['區'] ? String(data['區']).trim() : undefined,
      village: data['里'] ? String(data['里']).trim() : undefined,
      politicalParty: data['政黨'] ? String(data['政黨']).trim() : undefined,
      stance: data['政治傾向'] ? String(data['政治傾向']).trim() : undefined,
      age: data['年齡'] != null ? Number(data['年齡']) : undefined,
      gender: data['性別'] ? String(data['性別']).trim() : undefined,
      occupation: data['職業'] ? String(data['職業']).trim() : undefined,
      tags: data['標籤'] ? String(data['標籤']).trim() : undefined,
      notes: data['備註'] ? String(data['備註']).trim() : undefined,
    };
  }

  // ==================== 私有方法：逐列驗證 ====================

  private validateRow(data: VoterRow, rowNumber: number): ImportError[] {
    const errors: ImportError[] = [];

    // 必填：姓名
    if (!data.name) {
      errors.push({
        row: rowNumber,
        column: '姓名',
        type: 'REQUIRED_FIELD',
        message: '「姓名」為必填欄位，此列無法匯入',
        suggestion: '請在該列的「姓名」欄位填入選民姓名。',
      });
    }

    // Email 格式
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push({
        row: rowNumber,
        column: 'Email',
        type: 'FORMAT_ERROR',
        message: `Email 格式不正確：「${data.email}」`,
        suggestion: '請使用正確的 Email 格式，例如：example@gmail.com',
        currentValue: data.email,
      });
    }

    // 年齡驗證
    if (data.age != null) {
      if (isNaN(data.age)) {
        errors.push({
          row: rowNumber,
          column: '年齡',
          type: 'FORMAT_ERROR',
          message: `年齡必須為數字，目前值：「${data.age}」`,
          suggestion: '請輸入正確的數字年齡，例如：35',
          currentValue: String(data.age),
        });
      } else if (data.age < 0 || data.age > 150) {
        errors.push({
          row: rowNumber,
          column: '年齡',
          type: 'FORMAT_ERROR',
          message: `年齡值不合理：${data.age}`,
          suggestion: '年齡應在 0～150 之間。',
          currentValue: String(data.age),
        });
      }
    }

    // 性別驗證
    if (data.gender && !VALID_GENDERS.some(g => g.toLowerCase() === data.gender!.toLowerCase())) {
      errors.push({
        row: rowNumber,
        column: '性別',
        type: 'FORMAT_ERROR',
        message: `性別值「${data.gender}」無法辨識`,
        suggestion: '可接受的性別值如下：',
        currentValue: data.gender,
        acceptedValues: ['男', '女'],
      });
    }

    // 政治傾向驗證
    if (data.stance && !VALID_STANCES.includes(data.stance)) {
      errors.push({
        row: rowNumber,
        column: '政治傾向',
        type: 'FORMAT_ERROR',
        message: `政治傾向「${data.stance}」無法辨識，將自動設為「未表態」`,
        suggestion: '可接受的政治傾向值如下：',
        currentValue: data.stance,
        acceptedValues: VALID_STANCES,
      });
    }

    // 政黨驗證
    if (data.politicalParty && !VALID_PARTIES.some(p => p.toLowerCase() === data.politicalParty!.toLowerCase())) {
      errors.push({
        row: rowNumber,
        column: '政黨',
        type: 'FORMAT_ERROR',
        message: `政黨「${data.politicalParty}」無法辨識，將自動設為「不明」`,
        suggestion: '可接受的政黨值如下：',
        currentValue: data.politicalParty,
        acceptedValues: ['國民黨', '民進黨', '民眾黨', '時代力量', '台灣基進', '無黨籍', '其他'],
      });
    }

    return errors;
  }

  // ==================== 私有方法：值解析（保持向後相容） ====================

  private parseParty(value?: string): PoliticalParty | undefined {
    if (!value) return undefined;
    const map: Record<string, PoliticalParty> = {
      '國民黨': PoliticalParty.KMT,
      'kmt': PoliticalParty.KMT,
      '民進黨': PoliticalParty.DPP,
      'dpp': PoliticalParty.DPP,
      '民眾黨': PoliticalParty.TPP,
      'tpp': PoliticalParty.TPP,
      '時代力量': PoliticalParty.NPP,
      'npp': PoliticalParty.NPP,
      '台灣基進': PoliticalParty.TSP,
      'tsp': PoliticalParty.TSP,
      '無黨籍': PoliticalParty.INDEPENDENT,
      '其他': PoliticalParty.OTHER,
    };
    return map[value.toLowerCase()] || PoliticalParty.UNKNOWN;
  }

  private parseStance(value?: string): PoliticalStance {
    if (!value) return PoliticalStance.UNDECIDED;
    const map: Record<string, PoliticalStance> = {
      '強力支持': PoliticalStance.STRONG_SUPPORT,
      '支持': PoliticalStance.SUPPORT,
      '傾向支持': PoliticalStance.LEAN_SUPPORT,
      '中立': PoliticalStance.NEUTRAL,
      '未表態': PoliticalStance.UNDECIDED,
      '傾向反對': PoliticalStance.LEAN_OPPOSE,
      '反對': PoliticalStance.OPPOSE,
      '強烈反對': PoliticalStance.STRONG_OPPOSE,
    };
    return map[value] || PoliticalStance.UNDECIDED;
  }

  private parseGender(value?: string): 'M' | 'F' | 'OTHER' | undefined {
    if (!value) return undefined;
    const v = value.toLowerCase();
    if (['男', 'm', 'male'].includes(v)) return 'M';
    if (['女', 'f', 'female'].includes(v)) return 'F';
    return 'OTHER';
  }

  private formatParty(party: PoliticalParty | null): string {
    if (!party) return '';
    const map: Record<PoliticalParty, string> = {
      [PoliticalParty.KMT]: '國民黨',
      [PoliticalParty.DPP]: '民進黨',
      [PoliticalParty.TPP]: '民眾黨',
      [PoliticalParty.NPP]: '時代力量',
      [PoliticalParty.TSP]: '台灣基進',
      [PoliticalParty.OTHER]: '其他',
      [PoliticalParty.INDEPENDENT]: '無黨籍',
      [PoliticalParty.UNKNOWN]: '不明',
    };
    return map[party];
  }

  private formatStance(stance: PoliticalStance): string {
    const map: Record<PoliticalStance, string> = {
      [PoliticalStance.STRONG_SUPPORT]: '強力支持',
      [PoliticalStance.SUPPORT]: '支持',
      [PoliticalStance.LEAN_SUPPORT]: '傾向支持',
      [PoliticalStance.NEUTRAL]: '中立',
      [PoliticalStance.UNDECIDED]: '未表態',
      [PoliticalStance.LEAN_OPPOSE]: '傾向反對',
      [PoliticalStance.OPPOSE]: '反對',
      [PoliticalStance.STRONG_OPPOSE]: '強烈反對',
    };
    return map[stance];
  }

  private formatGender(gender: string | null): string {
    if (!gender) return '';
    return gender === 'M' ? '男' : gender === 'F' ? '女' : '其他';
  }
}
