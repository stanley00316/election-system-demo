import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadPhotoDto {
  @ApiProperty({ description: '所屬選舉活動 ID' })
  @IsString()
  campaignId: string;

  @ApiProperty({ description: '相簿 ID（可選）', required: false })
  @IsOptional()
  @IsString()
  albumId?: string;

  @ApiProperty({ description: '選民 ID（辨識照用，可選）', required: false })
  @IsOptional()
  @IsString()
  voterId?: string;

  @ApiProperty({ description: '照片說明', required: false })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({ description: '拍攝時間', required: false })
  @IsOptional()
  @IsDateString()
  takenAt?: string;
}
