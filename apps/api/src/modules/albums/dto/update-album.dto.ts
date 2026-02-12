import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAlbumDto {
  @ApiProperty({ description: '相簿標題', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '相簿說明', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '排序順序', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
