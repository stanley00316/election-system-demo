import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTrialInviteDto {
  @ApiProperty({ description: '試用天數' })
  @IsInt()
  @Min(1)
  @Max(90)
  trialDays: number;

  @ApiProperty({ description: '邀請方式', enum: ['LINK', 'CODE', 'DIRECT'] })
  @IsEnum(['LINK', 'CODE', 'DIRECT'])
  inviteMethod: string;

  @ApiProperty({ description: '受邀者姓名', required: false })
  @IsOptional()
  @IsString()
  inviteeName?: string;

  @ApiProperty({ description: '受邀者電話', required: false })
  @IsOptional()
  @IsString()
  inviteePhone?: string;

  @ApiProperty({ description: '受邀者 Email', required: false })
  @IsOptional()
  @IsString()
  inviteeEmail?: string;

  @ApiProperty({ description: '分享渠道', required: false, enum: ['LINE', 'FACEBOOK', 'SMS', 'QR_CODE', 'EMAIL', 'DIRECT_LINK', 'OTHER'] })
  @IsOptional()
  @IsEnum(['LINE', 'FACEBOOK', 'SMS', 'QR_CODE', 'EMAIL', 'DIRECT_LINK', 'OTHER'])
  channel?: string;
}
