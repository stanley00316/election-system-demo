import { IsString, IsOptional, IsBooleanString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AlbumFilterDto {
  @ApiProperty({ description: '選舉活動 ID' })
  @IsString()
  campaignId: string;

  @ApiProperty({ description: '活動 ID（可選）', required: false })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiProperty({ description: '是否已發表', required: false })
  @IsOptional()
  @IsBooleanString()
  isPublished?: string;
}
