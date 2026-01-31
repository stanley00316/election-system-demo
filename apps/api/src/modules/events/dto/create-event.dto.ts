import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType } from '@prisma/client';

export class CreateEventDto {
  @ApiProperty({ description: '選舉活動 ID' })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiProperty({ description: '活動類型', enum: EventType })
  @IsEnum(EventType)
  type: EventType;

  @ApiProperty({ description: '活動名稱' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '活動描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '主揪人（選民 ID）' })
  @IsString()
  @IsOptional()
  hostVoterId?: string;

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

  @ApiProperty({ description: '開始時間' })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ description: '結束時間' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: '預計參加人數' })
  @IsInt()
  @Min(0)
  @IsOptional()
  expectedAttendees?: number;

  @ApiPropertyOptional({ description: '備註' })
  @IsString()
  @IsOptional()
  notes?: string;
}
