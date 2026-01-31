import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactType, ContactOutcome } from '@prisma/client';

export class CreateContactDto {
  @ApiProperty({ description: '選民 ID' })
  @IsString()
  @IsNotEmpty()
  voterId: string;

  @ApiProperty({ description: '選舉活動 ID' })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiProperty({ description: '接觸類型', enum: ContactType })
  @IsEnum(ContactType)
  type: ContactType;

  @ApiProperty({ description: '接觸結果', enum: ContactOutcome })
  @IsEnum(ContactOutcome)
  outcome: ContactOutcome;

  @ApiPropertyOptional({ description: '接觸日期時間' })
  @IsDateString()
  @IsOptional()
  contactDate?: string;

  @ApiPropertyOptional({ description: '地點' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: '地點緯度' })
  @IsNumber()
  @IsOptional()
  locationLat?: number;

  @ApiPropertyOptional({ description: '地點經度' })
  @IsNumber()
  @IsOptional()
  locationLng?: number;

  @ApiPropertyOptional({ description: '備註' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: '討論議題', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  topics?: string[];

  @ApiPropertyOptional({ description: '下次行動' })
  @IsString()
  @IsOptional()
  nextAction?: string;

  @ApiPropertyOptional({ description: '追蹤日期' })
  @IsDateString()
  @IsOptional()
  followUpDate?: string;
}
