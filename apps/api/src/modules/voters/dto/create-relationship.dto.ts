import { IsString, IsNotEmpty, IsEnum, IsInt, IsOptional, Min, Max, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RelationType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateRelationshipDto {
  @ApiProperty({ description: '來源選民 ID' })
  @IsString()
  @IsNotEmpty()
  sourceVoterId: string;

  @ApiProperty({ description: '目標選民 ID' })
  @IsString()
  @IsNotEmpty()
  targetVoterId: string;

  @ApiProperty({ description: '關係類型', enum: RelationType })
  @IsEnum(RelationType)
  relationType: RelationType;

  @ApiPropertyOptional({ description: '影響力權重 (0-100)', default: 50 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  influenceWeight?: number = 50;

  @ApiPropertyOptional({ description: '備註' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: '首次見面活動 ID' })
  @IsString()
  @IsOptional()
  eventId?: string;
}

// 記錄見面 DTO
export class RecordMeetingDto {
  @ApiProperty({ description: '選民 A ID' })
  @IsString()
  @IsNotEmpty()
  voterAId: string;

  @ApiProperty({ description: '選民 B ID' })
  @IsString()
  @IsNotEmpty()
  voterBId: string;

  @ApiProperty({ description: '關係類型', enum: RelationType })
  @IsEnum(RelationType)
  relationType: RelationType;

  @ApiPropertyOptional({ description: '活動 ID（若在活動中見面）' })
  @IsString()
  @IsOptional()
  eventId?: string;

  @ApiPropertyOptional({ description: '見面地點' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: '見面日期' })
  @IsDateString()
  @IsOptional()
  meetingDate?: string;

  @ApiPropertyOptional({ description: '備註' })
  @IsString()
  @IsOptional()
  notes?: string;
}

// 批量建立關係 DTO
export class BatchRelationshipItem {
  @ApiProperty({ description: '選民 A ID' })
  @IsString()
  @IsNotEmpty()
  voterAId: string;

  @ApiProperty({ description: '選民 B ID' })
  @IsString()
  @IsNotEmpty()
  voterBId: string;

  @ApiProperty({ description: '關係類型', enum: RelationType })
  @IsEnum(RelationType)
  relationType: RelationType;

  @ApiPropertyOptional({ description: '備註' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BatchCreateRelationshipsDto {
  @ApiProperty({ description: '關係列表', type: [BatchRelationshipItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchRelationshipItem)
  relationships: BatchRelationshipItem[];

  @ApiPropertyOptional({ description: '活動 ID（若在活動中發現這些關係）' })
  @IsString()
  @IsOptional()
  eventId?: string;
}
