import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PoliticalStance, PoliticalParty } from '@prisma/client';

export class CreateVoterDto {
  @ApiProperty({ description: '選舉活動 ID' })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiProperty({ description: '姓名' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '電話' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'LINE ID' })
  @IsString()
  @IsOptional()
  lineId?: string;

  @ApiPropertyOptional({ description: 'LINE 個人連結' })
  @IsString()
  @IsOptional()
  lineUrl?: string;

  @ApiPropertyOptional({ description: '地址' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: '縣市' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: '區' })
  @IsString()
  @IsOptional()
  districtName?: string;

  @ApiPropertyOptional({ description: '里' })
  @IsString()
  @IsOptional()
  village?: string;

  @ApiPropertyOptional({ description: '鄰' })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiPropertyOptional({ description: '緯度' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: '經度' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: '政黨', enum: PoliticalParty })
  @IsEnum(PoliticalParty)
  @IsOptional()
  politicalParty?: PoliticalParty;

  @ApiPropertyOptional({ description: '政治傾向', enum: PoliticalStance })
  @IsEnum(PoliticalStance)
  @IsOptional()
  stance?: PoliticalStance;

  @ApiPropertyOptional({ description: '年齡' })
  @IsInt()
  @Min(0)
  @Max(150)
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({ description: '性別', enum: ['M', 'F', 'OTHER'] })
  @IsString()
  @IsOptional()
  gender?: 'M' | 'F' | 'OTHER';

  @ApiPropertyOptional({ description: '職業' })
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiPropertyOptional({ description: '標籤', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: '備註' })
  @IsString()
  @IsOptional()
  notes?: string;
}
