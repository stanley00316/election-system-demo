import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { CreateInviteLinkDto } from './dto/create-invite-link.dto';

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: '建立選舉活動' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '取得選舉活動詳情' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否為 campaign 成員
    await this.campaignsService.checkCampaignAccess(id, userId);
    return this.campaignsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新選舉活動' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除選舉活動' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.delete(id, userId);
  }

  @Get(':id/team')
  @ApiOperation({ summary: '取得團隊成員' })
  async getTeamMembers(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否為 campaign 成員
    await this.campaignsService.checkCampaignAccess(id, userId);
    return this.campaignsService.getTeamMembers(id);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: '邀請團隊成員' })
  async inviteTeamMember(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteTeamMemberDto,
  ) {
    return this.campaignsService.inviteTeamMember(id, userId, dto);
  }

  @Delete(':id/team/:memberId')
  @ApiOperation({ summary: '移除團隊成員' })
  async removeTeamMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.removeTeamMember(id, memberId, userId);
  }

  @Put(':id/team/:memberId/role')
  @ApiOperation({ summary: '更新成員角色' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
    @Body('role') role: UserRole,
  ) {
    return this.campaignsService.updateMemberRole(id, memberId, role, userId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '取得選舉活動統計' })
  async getStats(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否為 campaign 成員
    await this.campaignsService.checkCampaignAccess(id, userId);
    return this.campaignsService.getStats(id);
  }

  // ==================== 邀請連結 ====================

  @Post(':id/invite-link')
  @ApiOperation({ summary: '建立邀請連結' })
  async createInviteLink(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInviteLinkDto,
  ) {
    return this.campaignsService.createInviteLink(id, userId, dto);
  }

  @Get(':id/invite-links')
  @ApiOperation({ summary: '取得所有邀請連結' })
  async getInviteLinks(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.getInviteLinks(id, userId);
  }

  @Delete(':id/invite-link/:inviteId')
  @ApiOperation({ summary: '停用邀請連結' })
  async deactivateInviteLink(
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.deactivateInviteLink(id, inviteId, userId);
  }

  @Public()
  @Get('join/:code')
  @ApiOperation({ summary: '驗證邀請碼（公開）' })
  async getInviteInfo(@Param('code') code: string) {
    return this.campaignsService.getInviteInfo(code);
  }

  @Post('join/:code')
  @ApiOperation({ summary: '透過邀請碼加入團隊' })
  async joinByInviteCode(
    @Param('code') code: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.joinByInviteCode(code, userId);
  }
}
