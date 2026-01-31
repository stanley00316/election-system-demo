import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleItemType } from '@prisma/client';

export class AddScheduleItemDto {
  @ApiProperty({ description: '項目類型', enum: ScheduleItemType })
  @IsEnum(ScheduleItemType)
  type: ScheduleItemType;

  @ApiPropertyOptional({ description: '選民 ID' })
  @IsString()
  @IsOptional()
  voterId?: string;

  @ApiPropertyOptional({ description: '活動 ID' })
  @IsString()
  @IsOptional()
  eventId?: string;

  @ApiPropertyOptional({ description: '地址' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: '緯度' })
  @IsNumber()
  @IsOptional()
  locationLat?: number;

  @ApiPropertyOptional({ description: '經度' })
  @IsNumber()
  @IsOptional()
  locationLng?: number;

  @ApiPropertyOptional({ description: '計畫時間' })
  @IsDateString()
  @IsOptional()
  plannedTime?: string;

  @ApiPropertyOptional({ description: '預計停留時間（分鐘）' })
  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ description: '備註' })
  @IsString()
  @IsOptional()
  notes?: string;
}
