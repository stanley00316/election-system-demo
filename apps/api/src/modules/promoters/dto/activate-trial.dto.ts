import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateTrialDto {
  @ApiProperty({ description: '試用邀請碼' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ApplyPromoterReferralDto {
  @ApiProperty({ description: '推廣者推薦碼' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
