import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { PlanInterval, PlanCategory } from '@prisma/client';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(PlanInterval)
  interval?: PlanInterval;

  @IsOptional()
  @IsInt()
  @Min(0)
  voterLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  teamLimit?: number | null;

  @IsOptional()
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsEnum(PlanCategory)
  category?: PlanCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  regionLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  populationRatio?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsEnum(PlanInterval)
  interval: PlanInterval;

  @IsOptional()
  @IsInt()
  @Min(0)
  voterLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  teamLimit?: number | null;

  @IsOptional()
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsEnum(PlanCategory)
  category?: PlanCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  regionLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  populationRatio?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
