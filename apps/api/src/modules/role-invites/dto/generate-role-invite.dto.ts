import { IsEnum, IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';

export enum RoleInviteType {
  ADMIN = 'ADMIN',
  PROMOTER = 'PROMOTER',
}

export class GenerateRoleInviteDto {
  @IsEnum(RoleInviteType)
  role: RoleInviteType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(720) // 最多 30 天
  expiresInHours?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
