import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleInvitesService } from './role-invites.service';
import { GenerateRoleInviteDto } from './dto/generate-role-invite.dto';
import { ClaimRoleInviteDto } from './dto/claim-role-invite.dto';
import { SuperAdminGuard } from '../admin-auth/guards/super-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';

@ApiTags('role-invites')
@Controller()
export class RoleInvitesController {
  constructor(private readonly roleInvitesService: RoleInvitesService) {}

  /**
   * 產生角色邀請 Token（超級管理員專用）
   */
  @Post('admin/role-invites/generate')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '產生角色邀請 QR Code Token' })
  async generate(
    @Body() dto: GenerateRoleInviteDto,
    @CurrentAdmin() admin: any,
  ) {
    return this.roleInvitesService.generateInvite(dto, admin.id);
  }

  /**
   * 領取角色邀請（已登入使用者）
   */
  @Post('auth/claim-role-invite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '領取角色邀請' })
  async claim(
    @Body() dto: ClaimRoleInviteDto,
    @Req() req: any,
  ) {
    return this.roleInvitesService.claimInvite(dto.token, req.user.id);
  }
}
