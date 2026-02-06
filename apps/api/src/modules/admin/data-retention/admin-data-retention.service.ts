import { Injectable } from '@nestjs/common';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminDataRetentionService {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 取得待刪除的 Campaign 列表
   */
  async getPendingDeletionCampaigns() {
    return this.subscriptionsService.getPendingDeletionCampaigns();
  }

  /**
   * 永久刪除（軟刪除）Campaign
   */
  async permanentlyDeleteCampaign(campaignId: string) {
    return this.subscriptionsService.permanentlyDeleteCampaign(campaignId);
  }

  /**
   * 恢復 Campaign
   */
  async restoreCampaign(campaignId: string) {
    return this.subscriptionsService.restoreCampaign(campaignId);
  }

  /**
   * 取得資料保留統計
   */
  async getDataRetentionStats() {
    const [
      pendingDeletion,
      deleted,
      inGracePeriod,
      totalCampaigns,
    ] = await Promise.all([
      this.prisma.campaign.count({
        where: {
          markedForDeletion: true,
          deletedAt: null,
        },
      }),
      this.prisma.campaign.count({
        where: {
          deletedAt: { not: null },
        },
      }),
      this.prisma.campaign.count({
        where: {
          gracePeriodEndsAt: { not: null },
          markedForDeletion: false,
          deletedAt: null,
        },
      }),
      this.prisma.campaign.count(),
    ]);

    return {
      pendingDeletion,
      deleted,
      inGracePeriod,
      totalCampaigns,
      active: totalCampaigns - deleted - pendingDeletion,
    };
  }

  /**
   * 取得已刪除的 Campaign 列表（軟刪除）
   */
  async getDeletedCampaigns() {
    return this.prisma.campaign.findMany({
      where: {
        deletedAt: { not: null },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            voters: true,
            contacts: true,
            events: true,
          },
        },
      },
      orderBy: {
        deletedAt: 'desc',
      },
    });
  }

  /**
   * 批量刪除已標記的 Campaigns
   */
  async batchDeleteMarkedCampaigns(campaignIds: string[]) {
    const now = new Date();

    const result = await this.prisma.campaign.updateMany({
      where: {
        id: { in: campaignIds },
        markedForDeletion: true,
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        isActive: false,
      },
    });

    return {
      deletedCount: result.count,
    };
  }

  /**
   * 硬刪除 Campaign（永久刪除，需謹慎使用）
   * 只能刪除已軟刪除的 Campaign
   */
  async hardDeleteCampaign(campaignId: string) {
    // 先確認是否已軟刪除
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign 不存在');
    }

    if (!campaign.deletedAt) {
      throw new Error('只能硬刪除已軟刪除的 Campaign');
    }

    // 刪除相關資料（cascading delete）
    // 注意：實際的 cascading 行為取決於 schema 中的定義
    await this.prisma.campaign.delete({
      where: { id: campaignId },
    });

    return { success: true, message: 'Campaign 已永久刪除' };
  }
}
