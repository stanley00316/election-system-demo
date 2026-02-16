import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LineCallbackDto {
  @ApiProperty({ description: 'LINE 授權碼' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  code: string;

  @ApiProperty({ description: '重導向 URI' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  redirectUri: string;

  @ApiPropertyOptional({ description: '推廣者推薦碼（選填）' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  promoterCode?: string;

  @ApiPropertyOptional({ description: 'OWASP A04: OAuth CSRF state 參數（HMAC 簽章）' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  state?: string;
}
