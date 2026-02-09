import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LineCallbackDto {
  @ApiProperty({ description: 'LINE 授權碼' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: '重導向 URI' })
  @IsString()
  @IsNotEmpty()
  redirectUri: string;

  @ApiPropertyOptional({ description: '推廣者推薦碼（選填）' })
  @IsOptional()
  @IsString()
  promoterCode?: string;
}
