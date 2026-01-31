import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ElectionType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateCampaignDto {
  @ApiProperty({ description: '選舉活動名稱' })
  @IsString()
  @IsNotEmpty()
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
  city: string;

  @ApiPropertyOptional({ description: '區/鄉/鎮/市' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: '里' })
  @IsString()
  @IsOptional()
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
  description?: string;
}
