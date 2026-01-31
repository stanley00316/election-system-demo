import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max, IsDateString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateInviteLinkDto {
  @ApiProperty({
    description: '邀請角色',
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.VIEWER;

  @ApiPropertyOptional({ description: '最大使用次數（空表示無限制）' })
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxUses?: number;

  @ApiPropertyOptional({ description: '過期時間（預設 7 天後）' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
