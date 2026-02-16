import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateScheduleDto {
  @ApiPropertyOptional({ description: '日期' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: '標題' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}
