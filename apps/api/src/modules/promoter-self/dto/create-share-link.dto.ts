import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShareLinkDto {
  @ApiProperty({ description: '分享渠道', enum: ['LINE', 'FACEBOOK', 'SMS', 'QR_CODE', 'EMAIL', 'DIRECT_LINK', 'OTHER'] })
  @IsEnum(['LINE', 'FACEBOOK', 'SMS', 'QR_CODE', 'EMAIL', 'DIRECT_LINK', 'OTHER'])
  channel: string;

  @ApiProperty({ description: '目標 URL', required: false })
  @IsOptional()
  @IsString()
  targetUrl?: string;
}
