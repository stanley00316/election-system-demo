import { IsArray, IsEnum, IsOptional, IsString, ArrayMinSize, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShareSocialDto {
  @ApiProperty({
    description: '要分享的平台',
    enum: ['facebook', 'line', 'x', 'instagram', 'threads', 'tiktok', 'youtube', 'telegram', 'whatsapp'],
    isArray: true,
    example: ['facebook', 'line'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(['facebook', 'line', 'x', 'instagram', 'threads', 'tiktok', 'youtube', 'telegram', 'whatsapp'] as const, { each: true })
  platforms: ('facebook' | 'line' | 'x' | 'instagram' | 'threads' | 'tiktok' | 'youtube' | 'telegram' | 'whatsapp')[];

  @ApiPropertyOptional({ description: '自訂訊息文字' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
