import { IsOptional, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminPaymentFilterDto {
  @IsOptional()
  @IsString()
  status?: string; // PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED, CANCELLED

  @IsOptional()
  @IsString()
  provider?: string; // ECPAY, NEWEBPAY, STRIPE, MANUAL

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class RefundPaymentDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount?: number; // 部分退款金額，不填則全額退款
}
