import { IsString, IsNotEmpty, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ description: '選舉活動 ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  campaignId: string;

  @ApiProperty({ description: '日期' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: '標題' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}
