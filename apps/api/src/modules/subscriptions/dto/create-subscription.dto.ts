import { IsString, IsOptional, IsEnum } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class StartTrialDto {
  // 試用不需要特別參數，直接使用預設方案
}

export class CreateSubscriptionDto {
  @IsString()
  planId: string;

  @IsEnum(PaymentProvider)
  paymentProvider: PaymentProvider;

  @IsOptional()
  @IsString()
  returnUrl?: string;
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
