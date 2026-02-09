import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PromoterType, RewardType } from '@prisma/client';

export class RewardConfigDto {
  @IsEnum(RewardType)
  rewardType: RewardType;

  @IsOptional()
  @IsNumber()
  fixedAmount?: number;

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsNumber()
  extensionMonths?: number;

  @IsOptional()
  @IsNumber()
  maxRewardsPerMonth?: number;

  @IsOptional()
  @IsString()
  validFrom?: string;

  @IsOptional()
  @IsString()
  validUntil?: string;
}

export class TrialConfigDto {
  @IsOptional()
  @IsBoolean()
  canIssueTrial?: boolean;

  @IsOptional()
  @IsNumber()
  minTrialDays?: number;

  @IsOptional()
  @IsNumber()
  maxTrialDays?: number;

  @IsOptional()
  @IsNumber()
  defaultTrialDays?: number;

  @IsOptional()
  @IsString()
  trialPlanId?: string;

  @IsOptional()
  @IsNumber()
  monthlyIssueLimit?: number;

  @IsOptional()
  @IsNumber()
  totalIssueLimit?: number;

  @IsOptional()
  @IsString()
  validFrom?: string;

  @IsOptional()
  @IsString()
  validUntil?: string;
}

export class CreatePromoterDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  lineId?: string;

  @IsEnum(PromoterType)
  type: PromoterType;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RewardConfigDto)
  rewardConfig?: RewardConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TrialConfigDto)
  trialConfig?: TrialConfigDto;
}

export class UpdatePromoterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  lineId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
