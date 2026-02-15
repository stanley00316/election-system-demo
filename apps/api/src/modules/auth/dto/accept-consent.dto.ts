import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptConsentDto {
  @ApiProperty({
    description: '同意的法規版本編號',
    example: 'v2026.02',
  })
  @IsString()
  @IsNotEmpty()
  consentVersion: string;

  @ApiProperty({
    description: '是否同意肖像權授權',
    example: true,
  })
  @IsBoolean()
  portraitConsent: boolean;
}
