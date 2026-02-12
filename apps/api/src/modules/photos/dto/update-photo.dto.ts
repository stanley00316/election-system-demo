import { IsString, IsOptional, IsInt, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePhotoDto {
  @ApiProperty({ description: '照片說明', required: false })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({ description: '排序順序', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ description: '拍攝時間', required: false })
  @IsOptional()
  @IsDateString()
  takenAt?: string;
}
