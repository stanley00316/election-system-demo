import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { MapsService } from '../maps/maps.service';
import { UserRole, PoliticalStance, PoliticalParty } from '@prisma/client';
import * as ExcelJS from 'exceljs';

export interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: Array<{ row: number; message: string }>;
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

@Injectable()
export class ExcelService {
  constructor(
    private prisma: PrismaService,
    private campaignsService: CampaignsService,
    private mapsService: MapsService,
  ) {}

  async importVoters(
    file: Express.Multer.File,
    campaignId: string,
    userId: string,
  ): Promise<ImportResult> {
    await this.campaignsService.checkCampaignAccess(
      campaignId,
      userId,
      [UserRole.ADMIN, UserRole.EDITOR],
    );

    if (!file) {
      throw new BadRequestException('請上傳檔案');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new BadRequestException('Excel 檔案格式錯誤');
    }

    const result: ImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [],
    };

    // 取得欄位對應（第一列為標題）
    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value || '').trim().toLowerCase();
    });

    // 處理每一列資料
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      try {
        const voterData = this.parseRow(row, headers);
        
        if (!voterData.name) {
          result.errors.push({ row: rowNumber, message: '姓名為必填欄位' });
          result.failed++;
          continue;
        }

        // 檢查是否重複（依電話）
        if (voterData.phone) {
          const existing = await this.prisma.voter.findFirst({
            where: {
              campaignId,
              phone: voterData.phone,
            },
          });

          if (existing) {
            result.duplicates++;
            result.errors.push({ row: rowNumber, message: `電話 ${voterData.phone} 已存在` });
            continue;
          }
        }

        // Geocoding（批次處理時可考慮使用佇列）
        let latitude: number | undefined;
        let longitude: number | undefined;

        if (voterData.address) {
          try {
            const coords = await this.mapsService.geocode(voterData.address);
            latitude = coords.latitude;
            longitude = coords.longitude;
          } catch {
            // Geocoding 失敗不影響匯入
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
          message: error instanceof Error ? error.message : '未知錯誤',
        });
      }
    }

    return result;
  }

  async exportVoters(campaignId: string, userId: string): Promise<Buffer> {
    await this.campaignsService.checkCampaignAccess(
      campaignId,
      userId,
      [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER],
    );

    const voters = await this.prisma.voter.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('選民資料');

    // 設定欄位
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

    // 加入資料
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

    // 設定標題列樣式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  private parseRow(row: ExcelJS.Row, headers: string[]): VoterRow {
    const data: Record<string, any> = {};

    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        data[header] = cell.value;
      }
    });

    return {
      name: String(data['姓名'] || data['name'] || ''),
      phone: data['電話'] || data['phone'] ? String(data['電話'] || data['phone']) : undefined,
      email: data['email'] ? String(data['email']) : undefined,
      address: data['地址'] || data['address'] ? String(data['地址'] || data['address']) : undefined,
      city: data['縣市'] || data['city'] ? String(data['縣市'] || data['city']) : undefined,
      district: data['區'] || data['district'] ? String(data['區'] || data['district']) : undefined,
      village: data['里'] || data['village'] ? String(data['里'] || data['village']) : undefined,
      politicalParty: data['政黨'] || data['party'] ? String(data['政黨'] || data['party']) : undefined,
      stance: data['政治傾向'] || data['stance'] ? String(data['政治傾向'] || data['stance']) : undefined,
      age: data['年齡'] || data['age'] ? Number(data['年齡'] || data['age']) : undefined,
      gender: data['性別'] || data['gender'] ? String(data['性別'] || data['gender']) : undefined,
      occupation: data['職業'] || data['occupation'] ? String(data['職業'] || data['occupation']) : undefined,
      tags: data['標籤'] || data['tags'] ? String(data['標籤'] || data['tags']) : undefined,
      notes: data['備註'] || data['notes'] ? String(data['備註'] || data['notes']) : undefined,
    };
  }

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
