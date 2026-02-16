import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminSubscriptionFilterDto } from './dto/subscription-filter.dto';
import { Prisma, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class AdminSubscriptionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 取得訂閱列表
   */
  async getSubscriptions(filter: AdminSubscriptionFilterDto) {
    const {
      status,
      planCode,
      userId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const where: Prisma.SubscriptionWhereInput = {};

    if (status) {
      where.status = status as SubscriptionStatus;
    }

    if (planCode) {
      where.plan = { code: planCode };
    }

    if (userId) {
      where.userId = userId;
    }

    const orderBy: Prisma.SubscriptionOrderByWithRelationInput = {};
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'currentPeriodEnd') {
      orderBy.currentPeriodEnd = sortOrder;
    }

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          plan: true,
          _count: {
            select: {
              payments: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 取得單一訂閱詳情
   */
  async getSubscriptionById(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('訂閱不存在');
    }

    return subscription;
  }

  /**
   * 變更訂閱方案
   */
  async updatePlan(subscriptionId: string, planId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('訂閱不存在');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      throw new BadRequestException('方案不存在或已停用');
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId,
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
      },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * 延長試用期
   */
  async extendTrial(subscriptionId: string, days: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('訂閱不存在');
    }

    if (subscription.status !== SubscriptionStatus.TRIAL) {
      throw new BadRequestException('只能延長試用中的訂閱');
    }

    const currentEnd = subscription.trialEndsAt || subscription.currentPeriodEnd;
    const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        trialEndsAt: newEnd,
        currentPeriodEnd: newEnd,
      },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * 取消訂閱
   */
  async cancelSubscription(subscriptionId: string, reason?: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('訂閱不存在');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('訂閱已取消');
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason || '管理員手動取消',
      },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * 取得訂閱統計
   */
  async getSubscriptionStats() {
    const [
      totalSubscriptions,
      trialCount,
      activeCount,
      cancelledCount,
      expiredCount,
      pastDueCount,
    ] = await Promise.all([
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.TRIAL } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.CANCELLED } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.EXPIRED } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
    ]);

    // 取得即將到期的訂閱（7天內）
    const expiringIn7Days = await this.prisma.subscription.count({
      where: {
        status: { in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE] },
        currentPeriodEnd: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
    });

    return {
      totalSubscriptions,
      byStatus: {
        trial: trialCount,
        active: activeCount,
        cancelled: cancelledCount,
        expired: expiredCount,
        pastDue: pastDueCount,
      },
      expiringIn7Days,
    };
  }

  /**
   * 取得所有方案
   */
  async getPlans() {
    return this.prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * P0-2: 調整訂閱金額（超級管理員）
   */
  async adjustPrice(
    subscriptionId: string,
    data: { customPrice?: number; priceAdjustment?: number; reason: string },
    adminId: string,
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('訂閱不存在');
    }

    if (data.customPrice !== undefined && data.priceAdjustment !== undefined) {
      throw new BadRequestException('customPrice 和 priceAdjustment 只能擇一設定');
    }

    if (data.customPrice !== undefined && data.customPrice < 0) {
      throw new BadRequestException('自訂金額不可為負數');
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        customPrice: data.customPrice ?? null,
        priceAdjustment: data.priceAdjustment ?? null,
        adjustmentReason: data.reason,
        adjustedBy: adminId,
        adjustedAt: new Date(),
      },
      include: {
        plan: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * P0-2: 清除金額調整（恢復原價）
   */
  async clearPriceAdjustment(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('訂閱不存在');
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        customPrice: null,
        priceAdjustment: null,
        adjustmentReason: null,
        adjustedBy: null,
        adjustedAt: null,
      },
      include: {
        plan: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * 匯出訂閱列表（CSV 資料）
   */
  async exportSubscriptions(filter: AdminSubscriptionFilterDto) {
    const { status, planCode } = filter;
    const where: Prisma.SubscriptionWhereInput = {};

    if (status) where.status = status as SubscriptionStatus;
    if (planCode) where.plan = { code: planCode };

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        plan: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      '訂閱ID', '使用者', 'Email', '電話', '方案', '狀態',
      '開始日期', '到期日期', '試用結束日', '取消日期', '取消原因',
    ];

    const rows = subscriptions.map((s) => [
      s.id,
      s.user.name || '',
      s.user.email || '',
      s.user.phone || '',
      s.plan.name,
      s.status,
      s.currentPeriodStart ? s.currentPeriodStart.toISOString().split('T')[0] : '',
      s.currentPeriodEnd ? s.currentPeriodEnd.toISOString().split('T')[0] : '',
      s.trialEndsAt ? s.trialEndsAt.toISOString().split('T')[0] : '',
      s.cancelledAt ? s.cancelledAt.toISOString().split('T')[0] : '',
      s.cancelReason || '',
    ]);

    return { headers, rows, total: subscriptions.length };
  }
}
