import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { PromoterType, PromoterStatus } from '@prisma/client';

export class PromoterFilterDto {
  @IsOptional()
  @IsEnum(PromoterType)
  type?: PromoterType;

  @IsOptional()
  @IsEnum(PromoterStatus)
  status?: PromoterStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
