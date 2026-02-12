import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAlbumDto {
  @ApiProperty({ description: '所屬選舉活動 ID' })
  @IsString()
  campaignId: string;

  @ApiProperty({ description: '關聯活動 ID（可選）', required: false })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiProperty({ description: '相簿標題' })
  @IsString()
  title: string;

  @ApiProperty({ description: '相簿說明', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
