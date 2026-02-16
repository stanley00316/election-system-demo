import { IsOptional, IsString, IsInt, Min, Max, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminSubscriptionFilterDto {
  @IsOptional()
  @IsString()
  status?: string; // TRIAL, ACTIVE, PAST_DUE, CANCELLED, EXPIRED

  @IsOptional()
  @IsString()
  planCode?: string; // FREE_TRIAL, MONTHLY, YEARLY

  @IsOptional()
  @IsString()
  userId?: string;

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

export class UpdateSubscriptionPlanDto {
  @IsString()
  planId: string;
}

export class ExtendTrialDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(30)
  days: number;
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdjustPriceDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  customPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priceAdjustment?: number;

  @IsString()
  reason: string;
}
