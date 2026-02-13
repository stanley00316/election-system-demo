import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminDataRetentionService } from './admin-data-retention.service';
import { SuperAdminGuard } from '../../admin-auth/guards/super-admin.guard';
import { AdminGuard } from '../../admin-auth/guards/admin.guard';
import { CurrentAdmin } from '../../admin-auth/decorators/current-admin.decorator';
import { AdminAuthService } from '../../admin-auth/admin-auth.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('admin/data-retention')
@ApiBearerAuth()
export class AdminDataRetentionController {
  constructor(
    private readonly dataRetentionService: AdminDataRetentionService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  /**
   * 取得資料保留統計（一般管理員可查看）
   */
  @Get('stats')
  @UseGuards(AdminGuard)
  async getStats() {
    return this.dataRetentionService.getDataRetentionStats();
  }

  /**
   * 取得待刪除的 Campaign 列表（一般管理員可查看）
   */
  @Get('pending')
  @UseGuards(AdminGuard)
  async getPendingDeletionCampaigns() {
    return this.dataRetentionService.getPendingDeletionCampaigns();
  }

  /**
   * 取得已刪除的 Campaign 列表（一般管理員可查看）
   */
  @Get('deleted')
  @UseGuards(AdminGuard)
  async getDeletedCampaigns() {
    return this.dataRetentionService.getDeletedCampaigns();
  }

  /**
   * 恢復 Campaign（僅超級管理員）
   */
  @Post(':campaignId/restore')
  @UseGuards(SuperAdminGuard)
  async restoreCampaign(
    @Param('campaignId') campaignId: string,
    @CurrentAdmin() admin: any,
    @Req() req: Request,
  ) {
    const result = await this.dataRetentionService.restoreCampaign(campaignId);

    // 記錄操作
    await this.adminAuthService.logAction(
      admin.id,
      'CAMPAIGN_RESTORE',
      'CAMPAIGN',
      campaignId,
      { action: 'restore' },
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  /**
   * 永久刪除（軟刪除）Campaign（僅超級管理員）
   */
  @Delete(':campaignId')
  @UseGuards(SuperAdminGuard)
  async permanentlyDeleteCampaign(
    @Param('campaignId') campaignId: string,
    @CurrentAdmin() admin: any,
    @Req() req: Request,
  ) {
    const result =
      await this.dataRetentionService.permanentlyDeleteCampaign(campaignId);

    // 記錄操作
    await this.adminAuthService.logAction(
      admin.id,
      'CAMPAIGN_SOFT_DELETE',
      'CAMPAIGN',
      campaignId,
      { action: 'soft_delete' },
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  /**
   * 批量刪除已標記的 Campaigns（僅超級管理員）
   */
  @Post('batch-delete')
  @UseGuards(SuperAdminGuard)
  async batchDelete(
    @Body() body: { campaignIds: string[] },
    @CurrentAdmin() admin: any,
    @Req() req: Request,
  ) {
    const result = await this.dataRetentionService.batchDeleteMarkedCampaigns(
      body.campaignIds,
    );

    // 記錄操作
    await this.adminAuthService.logAction(
      admin.id,
      'CAMPAIGN_BATCH_DELETE',
      'CAMPAIGN',
      null,
      { campaignIds: body.campaignIds, deletedCount: result.deletedCount },
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  /**
   * 硬刪除 Campaign（僅超級管理員，需極度謹慎）
   */
  @Delete(':campaignId/hard')
  @UseGuards(SuperAdminGuard)
  async hardDeleteCampaign(
    @Param('campaignId') campaignId: string,
    @CurrentAdmin() admin: any,
    @Req() req: Request,
  ) {
    const result =
      await this.dataRetentionService.hardDeleteCampaign(campaignId);

    // 記錄操作
    await this.adminAuthService.logAction(
      admin.id,
      'CAMPAIGN_HARD_DELETE',
      'CAMPAIGN',
      campaignId,
      { action: 'hard_delete' },
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }
}
