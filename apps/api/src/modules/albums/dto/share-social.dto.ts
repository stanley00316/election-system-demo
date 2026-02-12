import { IsArray, IsEnum, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShareSocialDto {
  @ApiProperty({
    description: '要分享的平台',
    enum: ['facebook', 'line', 'x', 'instagram'],
    isArray: true,
    example: ['facebook', 'line'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(['facebook', 'line', 'x', 'instagram'] as const, { each: true })
  platforms: ('facebook' | 'line' | 'x' | 'instagram')[];

  @ApiPropertyOptional({ description: '自訂訊息文字' })
  @IsOptional()
  @IsString()
  message?: string;
}
