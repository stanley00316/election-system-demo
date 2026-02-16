import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { CreateTrialInviteDto } from './dto/create-trial-invite.dto';
import { UpdatePromoterProfileDto } from './dto/update-profile.dto';

@Injectable()
export class PromoterSelfService {
  constructor(private prisma: PrismaService) {}

  /**
   * 取得推廣者自身資料
   */
  async getProfile(promoterId: string) {
    return this.prisma.promoter.findUnique({
      where: { id: promoterId },
      include: {
        rewardConfig: true,
        trialConfig: {
          include: { trialPlan: { select: { id: true, name: true } } },
        },
      },
    });
  }

  /**
   * 更新推廣者個人資料（白名單限制欄位）
   */
  async updateProfile(promoterId: string, dto: UpdatePromoterProfileDto) {
    const allowedFields: (keyof UpdatePromoterProfileDto)[] = [
      'name', 'phone', 'email', 'lineId',
      'organization', 'region', 'address', 'category',
      'socialLinks', 'avatarUrl', 'joinedReason', 'notes',
    ];

    const data: Record<string, any> = {};
    for (const key of allowedFields) {
      if (dto[key] !== undefined) {
        data[key] = dto[key];
      }
    }

    return this.prisma.promoter.update({
      where: { id: promoterId },
      data,
      include: {
        rewardConfig: true,
        trialConfig: {
          include: { trialPlan: { select: { id: true, name: true } } },
        },
      },
    });
  }

  /**
   * 統計摘要
   */
  async getStats(promoterId: string) {
    const [
      totalReferrals,
      clickedCount,
      registeredCount,
      subscribedCount,
      renewedCount,
      totalReward,
      totalShareLinks,
      totalClicks,
      totalTrials,
      trialActivated,
      trialConverted,
    ] = await Promise.all([
      this.prisma.promoterReferral.count({ where: { promoterId } }),
      this.prisma.promoterReferral.count({ where: { promoterId, status: 'CLICKED' } }),
      this.prisma.promoterReferral.count({ where: { promoterId, status: 'REGISTERED' } }),
      this.prisma.promoterReferral.count({ where: { promoterId, status: 'SUBSCRIBED' } }),
      this.prisma.promoterReferral.count({ where: { promoterId, status: 'RENEWED' } }),
      this.prisma.promoterReferral.aggregate({
        where: { promoterId, rewardAmount: { not: null } },
        _sum: { rewardAmount: true },
      }),
      this.prisma.shareLink.count({ where: { promoterId } }),
      this.prisma.shareLink.aggregate({
        where: { promoterId },
        _sum: { clickCount: true },
      }),
      this.prisma.trialInvite.count({ where: { promoterId } }),
      this.prisma.trialInvite.count({
        where: { promoterId, status: { in: ['ACTIVATED', 'ACTIVE'] } },
      }),
      this.prisma.trialInvite.count({
        where: { promoterId, status: 'CONVERTED' },
      }),
    ]);

    const successCount = subscribedCount + renewedCount;
    const conversionRate = totalReferrals > 0
      ? ((successCount / totalReferrals) * 100).toFixed(1)
      : '0';

    // 最近 30 天趨勢
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReferrals = await this.prisma.promoterReferral.findMany({
      where: {
        promoterId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    // 按日期分組
    const dailyTrend: Record<string, { total: number; success: number }> = {};
    recentReferrals.forEach((r) => {
      const date = r.createdAt.toISOString().split('T')[0];
      if (!dailyTrend[date]) {
        dailyTrend[date] = { total: 0, success: 0 };
      }
      dailyTrend[date].total++;
      if (['SUBSCRIBED', 'RENEWED'].includes(r.status)) {
        dailyTrend[date].success++;
      }
    });

    const trend = Object.entries(dailyTrend).map(([date, data]) => ({
      date,
      ...data,
    }));

    return {
      totalReferrals,
      clickedCount,
      registeredCount,
      subscribedCount,
      renewedCount,
      successCount,
      conversionRate: parseFloat(conversionRate),
      totalReward: totalReward._sum.rewardAmount || 0,
      totalShareLinks,
      totalClicks: totalClicks._sum.clickCount || 0,
      totalTrials,
      trialActivated,
      trialConverted,
      trend,
    };
  }

  /**
   * 推薦紀錄列表
   */
  async getReferrals(promoterId: string, params: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params;
    const where: Prisma.PromoterReferralWhereInput = { promoterId };
    if (status) where.status = status as any;

    const [data, total] = await Promise.all([
      this.prisma.promoterReferral.findMany({
        where,
        include: {
          referredUser: { select: { id: true, name: true, avatarUrl: true } },
          shareLink: { select: { channel: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.promoterReferral.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * 分享連結列表
   */
  async getShareLinks(promoterId: string) {
    return this.prisma.shareLink.findMany({
      where: { promoterId },
      include: {
        _count: { select: { clicks: true, referrals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 建立分享連結
   */
  async createShareLink(promoterId: string, dto: CreateShareLinkDto) {
    // 產生唯一代碼
    let code: string;
    let exists = true;
    do {
      code = randomBytes(6).toString('base64url').slice(0, 8);
      const existing = await this.prisma.shareLink.findUnique({ where: { code } });
      exists = !!existing;
    } while (exists);

    return this.prisma.shareLink.create({
      data: {
        promoterId,
        code,
        channel: dto.channel as any,
        targetUrl: dto.targetUrl,
        isActive: true,
      },
      include: {
        _count: { select: { clicks: true, referrals: true } },
      },
    });
  }

  /**
   * 試用邀請列表
   */
  async getTrialInvites(promoterId: string, params: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params;
    const where: Prisma.TrialInviteWhereInput = { promoterId };
    if (status) where.status = status as any;

    const [data, total] = await Promise.all([
      this.prisma.trialInvite.findMany({
        where,
        include: {
          activatedUser: { select: { id: true, name: true, avatarUrl: true } },
          plan: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.trialInvite.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * 建立試用邀請
   */
  async createTrialInvite(promoterId: string, dto: CreateTrialInviteDto) {
    // 檢查試用設定
    const config = await this.prisma.promoterTrialConfig.findUnique({
      where: { promoterId },
    });

    if (!config || !config.canIssueTrial) {
      throw new BadRequestException('您的帳號未開放發放試用權限');
    }

    if (dto.trialDays < config.minTrialDays || dto.trialDays > config.maxTrialDays) {
      throw new BadRequestException(
        `試用天數需在 ${config.minTrialDays} 至 ${config.maxTrialDays} 天之間`,
      );
    }

    // 檢查配額
    if (config.totalIssueLimit) {
      const totalIssued = await this.prisma.trialInvite.count({
        where: { promoterId },
      });
      if (totalIssued >= config.totalIssueLimit) {
        throw new BadRequestException('已達總發放上限');
      }
    }

    if (config.monthlyIssueLimit) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthIssued = await this.prisma.trialInvite.count({
        where: { promoterId, createdAt: { gte: monthStart } },
      });
      if (monthIssued >= config.monthlyIssueLimit) {
        throw new BadRequestException('已達本月發放上限');
      }
    }

    // 產生唯一邀請碼
    let code: string;
    let exists = true;
    do {
      code = 'T' + randomBytes(5).toString('base64url').slice(0, 7).toUpperCase();
      const existing = await this.prisma.trialInvite.findUnique({ where: { code } });
      exists = !!existing;
    } while (exists);

    return this.prisma.trialInvite.create({
      data: {
        promoterId,
        code,
        trialDays: dto.trialDays,
        planId: config.trialPlanId,
        inviteeName: dto.inviteeName,
        inviteePhone: dto.inviteePhone,
        inviteeEmail: dto.inviteeEmail,
        inviteMethod: dto.inviteMethod as any,
        channel: dto.channel as any,
        status: 'PENDING',
      },
      include: {
        plan: { select: { id: true, name: true } },
      },
    });
  }
}
