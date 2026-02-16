import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PromoterStatus,
  PromoterType,
  Prisma,
  TrialInviteStatus,
} from '@prisma/client';
import { CreatePromoterDto, UpdatePromoterDto, RewardConfigDto, TrialConfigDto } from './dto/create-promoter.dto';

@Injectable()
export class AdminPromotersService {
  constructor(private prisma: PrismaService) {}

  /**
   * 產生推廣碼
   */
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 取得推廣者列表
   */
  async getPromoters(params: {
    type?: PromoterType;
    status?: PromoterStatus;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { type, status, search, startDate, endDate, page = 1, limit = 20 } = params;

    const where: Prisma.PromoterWhereInput = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { referralCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.promoter.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          rewardConfig: true,
          trialConfig: true,
          _count: {
            select: {
              referrals: true,
              trialInvites: true,
              shareLinks: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.promoter.count({ where }),
    ]);

    // 加入成功數與試用轉換數
    const enrichedData = await Promise.all(
      data.map(async (p) => {
        const [successCount, trialConvertedCount] = await Promise.all([
          this.prisma.promoterReferral.count({
            where: { promoterId: p.id, status: { in: ['SUBSCRIBED', 'RENEWED'] } },
          }),
          this.prisma.trialInvite.count({
            where: { promoterId: p.id, status: 'CONVERTED' },
          }),
        ]);
        return { ...p, successCount, trialConvertedCount };
      }),
    );

    return {
      data: enrichedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 取得推廣者詳情
   */
  async getPromoter(id: string) {
    const promoter = await this.prisma.promoter.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        approver: { select: { id: true, name: true } },
        rewardConfig: true,
        trialConfig: { include: { trialPlan: { select: { id: true, name: true } } } },
        _count: {
          select: { referrals: true, trialInvites: true, shareLinks: true },
        },
      },
    });

    if (!promoter) throw new NotFoundException('推廣者不存在');

    // 詳細統計
    const [
      totalClicks,
      registeredCount,
      subscribedCount,
      renewedCount,
      trialTotal,
      trialActive,
      trialConverted,
      trialExpired,
      totalReward,
    ] = await Promise.all([
      this.prisma.promoterReferral.count({ where: { promoterId: id, status: 'CLICKED' } }),
      this.prisma.promoterReferral.count({ where: { promoterId: id, status: 'REGISTERED' } }),
      this.prisma.promoterReferral.count({ where: { promoterId: id, status: 'SUBSCRIBED' } }),
      this.prisma.promoterReferral.count({ where: { promoterId: id, status: 'RENEWED' } }),
      this.prisma.trialInvite.count({ where: { promoterId: id } }),
      this.prisma.trialInvite.count({ where: { promoterId: id, status: { in: ['ACTIVATED', 'ACTIVE'] } } }),
      this.prisma.trialInvite.count({ where: { promoterId: id, status: 'CONVERTED' } }),
      this.prisma.trialInvite.count({ where: { promoterId: id, status: 'EXPIRED' } }),
      this.prisma.promoterReferral.aggregate({
        where: { promoterId: id, rewardAmount: { not: null } },
        _sum: { rewardAmount: true },
      }),
    ]);

    return {
      ...promoter,
      stats: {
        totalClicks,
        registeredCount,
        subscribedCount,
        renewedCount,
        trialTotal,
        trialActive,
        trialConverted,
        trialExpired,
        totalReward: totalReward._sum.rewardAmount || 0,
      },
    };
  }

  /**
   * 建立推廣者
   */
  async createPromoter(dto: CreatePromoterDto, adminId: string) {
    // 產生唯一推廣碼
    let referralCode: string;
    let exists = true;
    do {
      referralCode = this.generateReferralCode();
      const existing = await this.prisma.promoter.findUnique({ where: { referralCode } });
      exists = !!existing;
    } while (exists);

    if (dto.userId) {
      const existingPromoter = await this.prisma.promoter.findUnique({ where: { userId: dto.userId } });
      if (existingPromoter) throw new BadRequestException('此使用者已是推廣者');
    }

    const promoter = await this.prisma.promoter.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        lineId: dto.lineId,
        referralCode,
        type: dto.type,
        userId: dto.userId,
        status: PromoterStatus.ACTIVE,
        isActive: true,
        approvedAt: new Date(),
        approvedBy: adminId,
        notes: dto.notes,
        ...(dto.rewardConfig && {
          rewardConfig: {
            create: {
              rewardType: dto.rewardConfig.rewardType,
              fixedAmount: dto.rewardConfig.fixedAmount,
              percentage: dto.rewardConfig.percentage,
              extensionMonths: dto.rewardConfig.extensionMonths,
              maxRewardsPerMonth: dto.rewardConfig.maxRewardsPerMonth,
              validFrom: dto.rewardConfig.validFrom ? new Date(dto.rewardConfig.validFrom) : undefined,
              validUntil: dto.rewardConfig.validUntil ? new Date(dto.rewardConfig.validUntil) : undefined,
            },
          },
        }),
        ...(dto.trialConfig && {
          trialConfig: {
            create: {
              canIssueTrial: dto.trialConfig.canIssueTrial ?? true,
              minTrialDays: dto.trialConfig.minTrialDays ?? 7,
              maxTrialDays: dto.trialConfig.maxTrialDays ?? 30,
              defaultTrialDays: dto.trialConfig.defaultTrialDays ?? 14,
              trialPlanId: dto.trialConfig.trialPlanId,
              monthlyIssueLimit: dto.trialConfig.monthlyIssueLimit,
              totalIssueLimit: dto.trialConfig.totalIssueLimit,
            },
          },
        }),
      },
      include: { rewardConfig: true, trialConfig: true },
    });

    return promoter;
  }

  /**
   * 更新推廣者
   */
  async updatePromoter(id: string, dto: UpdatePromoterDto) {
    const promoter = await this.prisma.promoter.findUnique({ where: { id } });
    if (!promoter) throw new NotFoundException('推廣者不存在');

    return this.prisma.promoter.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        lineId: dto.lineId,
        notes: dto.notes,
        organization: dto.organization,
        region: dto.region,
        address: dto.address,
        category: dto.category,
        socialLinks: dto.socialLinks as any,
        avatarUrl: dto.avatarUrl,
        joinedReason: dto.joinedReason,
      },
      include: { rewardConfig: true, trialConfig: true },
    });
  }

  /**
   * 審核通過推廣者
   */
  async approvePromoter(id: string, adminId: string, rewardConfig?: RewardConfigDto, trialConfig?: TrialConfigDto) {
    const promoter = await this.prisma.promoter.findUnique({ where: { id } });
    if (!promoter) throw new NotFoundException('推廣者不存在');
    if (promoter.status !== PromoterStatus.PENDING) {
      throw new BadRequestException('僅待審核狀態的推廣者可以審核');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.promoter.update({
        where: { id },
        data: {
          status: PromoterStatus.ACTIVE,
          isActive: true,
          approvedAt: new Date(),
          approvedBy: adminId,
        },
      });

      if (rewardConfig) {
        await tx.promoterRewardConfig.upsert({
          where: { promoterId: id },
          create: {
            promoterId: id,
            rewardType: rewardConfig.rewardType,
            fixedAmount: rewardConfig.fixedAmount,
            percentage: rewardConfig.percentage,
            extensionMonths: rewardConfig.extensionMonths,
            maxRewardsPerMonth: rewardConfig.maxRewardsPerMonth,
            validFrom: rewardConfig.validFrom ? new Date(rewardConfig.validFrom) : undefined,
            validUntil: rewardConfig.validUntil ? new Date(rewardConfig.validUntil) : undefined,
          },
          update: {
            rewardType: rewardConfig.rewardType,
            fixedAmount: rewardConfig.fixedAmount,
            percentage: rewardConfig.percentage,
            extensionMonths: rewardConfig.extensionMonths,
            maxRewardsPerMonth: rewardConfig.maxRewardsPerMonth,
            validFrom: rewardConfig.validFrom ? new Date(rewardConfig.validFrom) : undefined,
            validUntil: rewardConfig.validUntil ? new Date(rewardConfig.validUntil) : undefined,
          },
        });
      }

      if (trialConfig) {
        await tx.promoterTrialConfig.upsert({
          where: { promoterId: id },
          create: {
            promoterId: id,
            canIssueTrial: trialConfig.canIssueTrial ?? true,
            minTrialDays: trialConfig.minTrialDays ?? 7,
            maxTrialDays: trialConfig.maxTrialDays ?? 30,
            defaultTrialDays: trialConfig.defaultTrialDays ?? 14,
            trialPlanId: trialConfig.trialPlanId,
            monthlyIssueLimit: trialConfig.monthlyIssueLimit,
            totalIssueLimit: trialConfig.totalIssueLimit,
          },
          update: {
            canIssueTrial: trialConfig.canIssueTrial,
            minTrialDays: trialConfig.minTrialDays,
            maxTrialDays: trialConfig.maxTrialDays,
            defaultTrialDays: trialConfig.defaultTrialDays,
            trialPlanId: trialConfig.trialPlanId,
            monthlyIssueLimit: trialConfig.monthlyIssueLimit,
            totalIssueLimit: trialConfig.totalIssueLimit,
          },
        });
      }

      return updated;
    });
  }

  /**
   * 停用推廣者
   */
  async suspendPromoter(id: string) {
    const promoter = await this.prisma.promoter.findUnique({ where: { id } });
    if (!promoter) throw new NotFoundException('推廣者不存在');

    return this.prisma.promoter.update({
      where: { id },
      data: { status: PromoterStatus.SUSPENDED, isActive: false },
    });
  }

  /**
   * 重新啟用推廣者
   */
  async activatePromoter(id: string) {
    const promoter = await this.prisma.promoter.findUnique({ where: { id } });
    if (!promoter) throw new NotFoundException('推廣者不存在');

    return this.prisma.promoter.update({
      where: { id },
      data: { status: PromoterStatus.ACTIVE, isActive: true },
    });
  }

  /**
   * 更新獎勵設定
   */
  async updateRewardConfig(promoterId: string, dto: RewardConfigDto) {
    const promoter = await this.prisma.promoter.findUnique({ where: { id: promoterId } });
    if (!promoter) throw new NotFoundException('推廣者不存在');

    return this.prisma.promoterRewardConfig.upsert({
      where: { promoterId },
      create: {
        promoterId,
        rewardType: dto.rewardType,
        fixedAmount: dto.fixedAmount,
        percentage: dto.percentage,
        extensionMonths: dto.extensionMonths,
        maxRewardsPerMonth: dto.maxRewardsPerMonth,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
      update: {
        rewardType: dto.rewardType,
        fixedAmount: dto.fixedAmount,
        percentage: dto.percentage,
        extensionMonths: dto.extensionMonths,
        maxRewardsPerMonth: dto.maxRewardsPerMonth,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  /**
   * 更新試用設定
   */
  async updateTrialConfig(promoterId: string, dto: TrialConfigDto) {
    const promoter = await this.prisma.promoter.findUnique({ where: { id: promoterId } });
    if (!promoter) throw new NotFoundException('推廣者不存在');

    return this.prisma.promoterTrialConfig.upsert({
      where: { promoterId },
      create: {
        promoterId,
        canIssueTrial: dto.canIssueTrial ?? true,
        minTrialDays: dto.minTrialDays ?? 7,
        maxTrialDays: dto.maxTrialDays ?? 30,
        defaultTrialDays: dto.defaultTrialDays ?? 14,
        trialPlanId: dto.trialPlanId,
        monthlyIssueLimit: dto.monthlyIssueLimit,
        totalIssueLimit: dto.totalIssueLimit,
      },
      update: {
        canIssueTrial: dto.canIssueTrial,
        minTrialDays: dto.minTrialDays,
        maxTrialDays: dto.maxTrialDays,
        defaultTrialDays: dto.defaultTrialDays,
        trialPlanId: dto.trialPlanId,
        monthlyIssueLimit: dto.monthlyIssueLimit,
        totalIssueLimit: dto.totalIssueLimit,
      },
    });
  }

  /**
   * 取得推廣者的推薦紀錄
   */
  async getPromoterReferrals(promoterId: string, params: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params;
    const where: Prisma.PromoterReferralWhereInput = { promoterId };
    if (status) where.status = status as any;

    const [data, total] = await Promise.all([
      this.prisma.promoterReferral.findMany({
        where,
        include: {
          referredUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
          shareLink: { select: { channel: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.promoterReferral.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * 取得推廣者的試用紀錄
   */
  async getPromoterTrialInvites(promoterId: string, params: { status?: string; page?: number; limit?: number }) {
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

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * 取得分享連結
   */
  async getPromoterShareLinks(promoterId: string) {
    return this.prisma.shareLink.findMany({
      where: { promoterId },
      include: { _count: { select: { clicks: true, referrals: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 全域試用紀錄
   */
  async getAllTrialInvites(params: {
    status?: TrialInviteStatus;
    promoterId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, promoterId, search, page = 1, limit = 20 } = params;
    const where: Prisma.TrialInviteWhereInput = {};
    if (status) where.status = status;
    if (promoterId) where.promoterId = promoterId;
    if (search) {
      where.OR = [
        { inviteeName: { contains: search, mode: 'insensitive' } },
        { inviteePhone: { contains: search } },
        { inviteeEmail: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.trialInvite.findMany({
        where,
        include: {
          promoter: { select: { id: true, name: true, referralCode: true } },
          activatedUser: { select: { id: true, name: true, avatarUrl: true } },
          plan: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.trialInvite.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * 取得試用統計
   */
  async getTrialStats() {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, activated, active, converted, expired, expiringsSoon, monthIssued] = await Promise.all([
      this.prisma.trialInvite.count(),
      this.prisma.trialInvite.count({ where: { status: { in: ['ACTIVATED', 'ACTIVE', 'CONVERTED', 'EXPIRED'] } } }),
      this.prisma.trialInvite.count({ where: { status: { in: ['ACTIVATED', 'ACTIVE'] } } }),
      this.prisma.trialInvite.count({ where: { status: 'CONVERTED' } }),
      this.prisma.trialInvite.count({ where: { status: 'EXPIRED' } }),
      this.prisma.trialInvite.count({
        where: {
          status: { in: ['ACTIVATED', 'ACTIVE'] },
          expiresAt: { lte: threeDaysFromNow, gte: now },
        },
      }),
      this.prisma.trialInvite.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    const conversionRate = activated > 0 ? (converted / activated * 100).toFixed(1) : '0';

    return {
      total,
      activated,
      active,
      converted,
      expired,
      expiringSoon: expiringsSoon,
      monthIssued,
      conversionRate: parseFloat(conversionRate),
    };
  }

  /**
   * 推廣總覽統計
   */
  async getOverviewStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalPromoters,
      activePromoters,
      pendingPromoters,
      totalReferrals,
      successReferrals,
      totalClicks,
      monthSuccess,
      totalTrials,
      trialConverted,
      totalReward,
    ] = await Promise.all([
      this.prisma.promoter.count(),
      this.prisma.promoter.count({ where: { isActive: true } }),
      this.prisma.promoter.count({ where: { status: 'PENDING' } }),
      this.prisma.promoterReferral.count(),
      this.prisma.promoterReferral.count({ where: { status: { in: ['SUBSCRIBED', 'RENEWED'] } } }),
      this.prisma.shareLinkClick.count(),
      this.prisma.promoterReferral.count({
        where: { status: { in: ['SUBSCRIBED', 'RENEWED'] }, subscribedAt: { gte: monthStart } },
      }),
      this.prisma.trialInvite.count(),
      this.prisma.trialInvite.count({ where: { status: 'CONVERTED' } }),
      this.prisma.promoterReferral.aggregate({
        where: { rewardAmount: { not: null } },
        _sum: { rewardAmount: true },
      }),
    ]);

    const conversionRate = totalReferrals > 0 ? (successReferrals / totalReferrals * 100).toFixed(1) : '0';

    return {
      totalPromoters,
      activePromoters,
      pendingPromoters,
      totalReferrals,
      successReferrals,
      totalClicks,
      monthSuccess,
      conversionRate: parseFloat(conversionRate),
      totalTrials,
      trialConverted,
      totalReward: totalReward._sum.rewardAmount || 0,
    };
  }

  /**
   * 轉換漏斗數據
   */
  async getFunnelStats() {
    const [clicked, registered, trial, subscribed, renewed] = await Promise.all([
      this.prisma.promoterReferral.count(),
      this.prisma.promoterReferral.count({ where: { status: { not: 'CLICKED' } } }),
      this.prisma.trialInvite.count({ where: { status: { in: ['ACTIVATED', 'ACTIVE', 'CONVERTED', 'EXPIRED'] } } }),
      this.prisma.promoterReferral.count({ where: { status: { in: ['SUBSCRIBED', 'RENEWED'] } } }),
      this.prisma.promoterReferral.count({ where: { status: 'RENEWED' } }),
    ]);

    return { clicked, registered, trial, subscribed, renewed };
  }

  /**
   * 管道成效分析
   */
  async getChannelStats() {
    const channels = ['LINE', 'FACEBOOK', 'SMS', 'QR_CODE', 'EMAIL', 'DIRECT_LINK', 'OTHER'];
    const stats = await Promise.all(
      channels.map(async (channel) => {
        const [clicks, registered, subscribed] = await Promise.all([
          this.prisma.shareLink.aggregate({
            where: { channel: channel as any },
            _sum: { clickCount: true },
          }),
          this.prisma.promoterReferral.count({
            where: { channel: channel as any, status: { not: 'CLICKED' } },
          }),
          this.prisma.promoterReferral.count({
            where: { channel: channel as any, status: { in: ['SUBSCRIBED', 'RENEWED'] } },
          }),
        ]);
        return {
          channel,
          clicks: clicks._sum.clickCount || 0,
          registered,
          subscribed,
        };
      }),
    );
    return stats.filter((s) => s.clicks > 0 || s.registered > 0 || s.subscribed > 0);
  }

  /**
   * 推廣者排行榜
   */
  async getLeaderboard(limit: number = 10) {
    const promoters = await this.prisma.promoter.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { referrals: true, trialInvites: true },
        },
      },
    });

    const enriched = await Promise.all(
      promoters.map(async (p) => {
        const [successCount, trialConverted, totalReward] = await Promise.all([
          this.prisma.promoterReferral.count({
            where: { promoterId: p.id, status: { in: ['SUBSCRIBED', 'RENEWED'] } },
          }),
          this.prisma.trialInvite.count({
            where: { promoterId: p.id, status: 'CONVERTED' },
          }),
          this.prisma.promoterReferral.aggregate({
            where: { promoterId: p.id, rewardAmount: { not: null } },
            _sum: { rewardAmount: true },
          }),
        ]);
        return {
          id: p.id,
          name: p.name,
          type: p.type,
          referralCode: p.referralCode,
          successCount,
          trialConverted,
          totalReward: totalReward._sum.rewardAmount || 0,
          totalReferrals: p._count.referrals,
          totalTrials: p._count.trialInvites,
        };
      }),
    );

    return enriched
      .sort((a, b) => b.successCount + b.trialConverted - (a.successCount + a.trialConverted))
      .slice(0, limit);
  }

  /**
   * 待審核推廣者列表
   */
  async getPendingPromoters() {
    return this.prisma.promoter.findMany({
      where: { status: PromoterStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 取消試用
   */
  async cancelTrialInvite(trialId: string) {
    const trial = await this.prisma.trialInvite.findUnique({ where: { id: trialId } });
    if (!trial) throw new NotFoundException('試用邀請不存在');
    if (['CONVERTED', 'CANCELLED'].includes(trial.status)) {
      throw new BadRequestException('此試用邀請無法取消');
    }

    return this.prisma.trialInvite.update({
      where: { id: trialId },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * 延長試用
   */
  async extendTrialInvite(trialId: string, extraDays: number) {
    const trial = await this.prisma.trialInvite.findUnique({ where: { id: trialId } });
    if (!trial) throw new NotFoundException('試用邀請不存在');
    if (!['ACTIVATED', 'ACTIVE'].includes(trial.status)) {
      throw new BadRequestException('僅啟用中的試用可以延長');
    }
    if (!trial.expiresAt) throw new BadRequestException('試用尚未啟用');

    const newExpiry = new Date(trial.expiresAt.getTime() + extraDays * 24 * 60 * 60 * 1000);
    return this.prisma.trialInvite.update({
      where: { id: trialId },
      data: { expiresAt: newExpiry, trialDays: trial.trialDays + extraDays },
    });
  }

  /**
   * 駁回推廣者申請
   */
  async rejectPromoter(id: string) {
    const promoter = await this.prisma.promoter.findUnique({ where: { id } });
    if (!promoter) throw new NotFoundException('推廣者不存在');
    if (promoter.status !== PromoterStatus.PENDING) {
      throw new BadRequestException('僅待審核狀態的推廣者可以駁回');
    }

    return this.prisma.promoter.update({
      where: { id },
      data: { status: PromoterStatus.SUSPENDED, isActive: false },
    });
  }
}
