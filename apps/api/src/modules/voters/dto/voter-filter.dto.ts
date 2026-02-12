import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PoliticalStance, PoliticalParty } from '@prisma/client';

export class VoterFilterDto {
  @ApiProperty({ description: '選舉活動 ID' })
  @IsString()
  campaignId: string;

  @ApiPropertyOptional({ description: '搜尋關鍵字' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: '縣市' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: '區' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: '里' })
  @IsString()
  @IsOptional()
  village?: string;

  @ApiPropertyOptional({ description: '政治傾向', type: [String], enum: PoliticalStance })
  @IsArray()
  @IsEnum(PoliticalStance, { each: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  stance?: PoliticalStance[];

  @ApiPropertyOptional({ description: '政黨', type: [String], enum: PoliticalParty })
  @IsArray()
  @IsEnum(PoliticalParty, { each: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  politicalParty?: PoliticalParty[];

  @ApiPropertyOptional({ description: '最小影響力分數' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  minInfluenceScore?: number;

  @ApiPropertyOptional({ description: '最大影響力分數' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  maxInfluenceScore?: number;

  @ApiPropertyOptional({ description: '標籤', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tags?: string[];

  @ApiPropertyOptional({ description: '是否有接觸紀錄' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasContact?: boolean;

  @ApiPropertyOptional({ description: '頁碼', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每頁數量', default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '建立時間起始（ISO 日期字串）' })
  @IsString()
  @IsOptional()
  createdAfter?: string;

  @ApiPropertyOptional({ description: '建立時間結束（ISO 日期字串）' })
  @IsString()
  @IsOptional()
  createdBefore?: string;

  @ApiPropertyOptional({
    description: '排序欄位',
    enum: ['name', 'influenceScore', 'lastContactAt', 'createdAt'],
  })
  @IsString()
  @IsOptional()
  sortBy?: 'name' | 'influenceScore' | 'lastContactAt' | 'createdAt';

  @ApiPropertyOptional({ description: '排序方向', enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
