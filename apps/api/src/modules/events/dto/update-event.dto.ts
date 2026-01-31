import { PartialType, OmitType } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(
  OmitType(CreateEventDto, ['campaignId'] as const),
) {
  @ApiPropertyOptional({ description: '活動狀態', enum: EventStatus })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional({ description: '實際參加人數' })
  @IsInt()
  @Min(0)
  @IsOptional()
  actualAttendees?: number;
}
