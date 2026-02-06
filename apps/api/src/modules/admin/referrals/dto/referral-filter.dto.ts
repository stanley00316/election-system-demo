import { IsOptional, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReferralStatus } from '@prisma/client';

export class ReferralFilterDto {
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;

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
  limit?: number = 20;
}
