import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus, PlanInterval } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  // 試用期天數
  private readonly TRIAL_DAYS = 14;

  constructor(private prisma: PrismaService) {}

  /**
   * 取得目前訂閱狀態
   */
  async getCurrentSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE],
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      return null;
    }

    // 檢查是否過期
    const now = new Date();
    if (subscription.currentPeriodEnd < now) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
      return null;
    }

    return subscription;
  }

  /**
   * 檢查使用者是否有有效訂閱
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(userId);
    return subscription !== null;
  }

  /**
   * 開始免費試用
   */
  async startTrial(userId: string) {
    // 檢查是否已有訂閱
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: { userId },
    });

    if (existingSubscription) {
      throw new BadRequestException('您已經使用過試用或訂閱服務');
    }

    // 取得試用方案
    let trialPlan = await this.prisma.plan.findFirst({
      where: { code: 'FREE_TRIAL', isActive: true },
    });

    // 如果沒有試用方案，建立一個
    if (!trialPlan) {
      trialPlan = await this.createDefaultPlans();
    }

    // 計算試用期結束時間
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + this.TRIAL_DAYS * 24 * 60 * 60 * 1000);

    // 建立訂閱
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId: trialPlan.id,
        status: SubscriptionStatus.TRIAL,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        trialEndsAt,
      },
      include: {
        plan: true,
      },
    });

    return subscription;
  }

  /**
   * 訂閱付費方案
   */
  async subscribe(userId: string, planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException('找不到該方案');
    }

    if (plan.code === 'FREE_TRIAL') {
      throw new BadRequestException('請使用 startTrial 來開始試用');
    }

    // 計算訂閱期間
    const now = new Date();
    let periodEnd: Date;

    switch (plan.interval) {
      case PlanInterval.MONTH:
        periodEnd = new Date(now.getTime());
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
      case PlanInterval.YEAR:
        periodEnd = new Date(now.getTime());
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        break;
      case PlanInterval.LIFETIME:
        periodEnd = new Date('2099-12-31');
        break;
      default:
        periodEnd = new Date(now.getTime());
        periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // 檢查是否有現有訂閱
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE],
        },
      },
    });

    if (existingSubscription) {
      // 更新現有訂閱
      const subscription = await this.prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: null,
        },
        include: {
          plan: true,
        },
      });

      return subscription;
    }

    // 建立新訂閱
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: {
        plan: true,
      },
    });

    return subscription;
  }

  /**
   * 取消訂閱
   */
  async cancelSubscription(userId: string, reason?: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE],
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('找不到有效訂閱');
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: {
        plan: true,
      },
    });

    return updated;
  }

  /**
   * 取得訂閱歷史
   */
  async getSubscriptionHistory(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 取得所有方案
   */
  async getPlans() {
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // 如果沒有方案，建立預設方案
    if (plans.length === 0) {
      await this.createDefaultPlans();
      return this.prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    }

    return plans;
  }

  /**
   * 取得單一方案
   */
  async getPlan(planId: string) {
    return this.prisma.plan.findUnique({
      where: { id: planId },
    });
  }

  /**
   * 更新訂閱狀態（用於付款完成後）
   */
  async activateSubscription(subscriptionId: string) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
      },
      include: {
        plan: true,
      },
    });
  }

  /**
   * 標記訂閱為逾期
   */
  async markAsPastDue(subscriptionId: string) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });
  }

  /**
   * 建立預設方案
   */
  private async createDefaultPlans() {
    const plans = [
      {
        name: '免費試用',
        code: 'FREE_TRIAL',
        price: 0,
        interval: PlanInterval.MONTH,
        voterLimit: 500,
        teamLimit: 2,
        features: ['全功能試用 14 天', '最多 500 位選民', '最多 2 位團隊成員'],
        sortOrder: 0,
      },
      {
        name: '月繳方案',
        code: 'MONTHLY',
        price: 1990,
        interval: PlanInterval.MONTH,
        voterLimit: null, // 無限
        teamLimit: 10,
        features: ['無限選民數量', '最多 10 位團隊成員', '優先客服支援', '資料匯出功能'],
        sortOrder: 1,
      },
      {
        name: '年繳方案',
        code: 'YEARLY',
        price: 19900,
        interval: PlanInterval.YEAR,
        voterLimit: null, // 無限
        teamLimit: null, // 無限
        features: ['無限選民數量', '無限團隊成員', '優先客服支援', '資料匯出功能', '年繳享 83 折優惠'],
        sortOrder: 2,
      },
    ];

    for (const plan of plans) {
      await this.prisma.plan.upsert({
        where: { code: plan.code },
        update: plan,
        create: plan,
      });
    }

    return this.prisma.plan.findFirst({
      where: { code: 'FREE_TRIAL' },
    });
  }

  /**
   * 取得即將到期的試用訂閱（用於發送提醒）
   */
  async getExpiringTrials(daysBeforeExpiry: number = 3) {
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() + daysBeforeExpiry * 24 * 60 * 60 * 1000);

    return this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: {
          lte: expiryThreshold,
          gte: now,
        },
      },
      include: {
        user: true,
        plan: true,
      },
    });
  }

  /**
   * 檢查並更新過期訂閱
   */
  async checkAndExpireSubscriptions() {
    const now = new Date();

    // 更新所有過期的訂閱
    const result = await this.prisma.subscription.updateMany({
      where: {
        status: {
          in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE],
        },
        currentPeriodEnd: {
          lt: now,
        },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
      },
    });

    return result.count;
  }
}
