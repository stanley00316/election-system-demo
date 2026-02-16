import { IsString, IsOptional, IsObject } from 'class-validator';

/**
 * 推廣者自助編輯 DTO
 * 可編輯：基本資料、組織資訊、社群連結
 * 不可編輯：referralCode, type, status（由管理員控制）
 */
export class UpdatePromoterProfileDto {
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
  organization?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  joinedReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
