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
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PoliticalStance, PoliticalParty } from '@prisma/client';

export class CreateVoterDto {
  @ApiProperty({ description: '選舉活動 ID' })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  // OWASP A04: 所有字串欄位加入長度限制，防止資源濫用
  @ApiProperty({ description: '姓名' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '電話' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'LINE ID' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lineId?: string;

  @ApiPropertyOptional({ description: 'LINE 個人連結' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  lineUrl?: string;

  @ApiPropertyOptional({ description: '地址' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: '縣市' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  city?: string;

  @ApiPropertyOptional({ description: '區' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  districtName?: string;

  @ApiPropertyOptional({ description: '里' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  village?: string;

  @ApiPropertyOptional({ description: '鄰' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
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
  @MaxLength(100)
  occupation?: string;

  @ApiPropertyOptional({ description: '標籤', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: '備註' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}
