import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ElectionType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateCampaignDto {
  // OWASP A04: 字串欄位長度限制
  @ApiProperty({ description: '選舉活動名稱' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: '選舉類型', enum: ElectionType })
  @IsEnum(ElectionType)
  electionType: ElectionType;

  @ApiPropertyOptional({ description: '選舉日期' })
  @IsDateString()
  @IsOptional()
  electionDate?: string;

  @ApiProperty({ description: '縣市' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  city: string;

  @ApiPropertyOptional({ description: '區/鄉/鎮/市' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  district?: string;

  @ApiPropertyOptional({ description: '里' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  village?: string;

  @ApiPropertyOptional({ description: '選區編號（立委用）' })
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @ValidateIf((o) => o.constituency !== undefined && o.constituency !== null)
  @IsInt()
  @Min(1)
  @IsOptional()
  constituency?: number;

  @ApiPropertyOptional({ description: '描述' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;
}
