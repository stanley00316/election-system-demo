import { IsString } from 'class-validator';

export class ClaimRoleInviteDto {
  @IsString()
  token: string;
}
