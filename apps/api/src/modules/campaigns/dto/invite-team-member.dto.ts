import { IsString, IsEmail, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class InviteTeamMemberDto {
  @ApiPropertyOptional({ description: '被邀請者 Email' })
  @IsEmail()
  @IsOptional()
  @ValidateIf(o => !o.phone)
  email?: string;

  @ApiPropertyOptional({ description: '被邀請者電話' })
  @IsString()
  @IsOptional()
  @ValidateIf(o => !o.email)
  phone?: string;

  @ApiProperty({ description: '角色', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}
