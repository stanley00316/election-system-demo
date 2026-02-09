import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus, PlanInterval, PlanCategory, TrialInviteStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  // 試用期天數（改為 7 天）
  private readonly TRIAL_DAYS = 7;
  // 未付款資料緩衝期（天）
  private readonly GRACE_PERIOD_DAYS = 30;

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
   * 透過推廣者試用邀請碼開始試用
   */
  async startPromoterTrial(userId: string, trialInviteCode: string) {
    // 查找試用邀請
    const trialInvite = await this.prisma.trialInvite.findUnique({
      where: { code: trialInviteCode },
      include: { plan: true, promoter: true },
    });

    if (!trialInvite) {
      throw new NotFoundException('無效的試用邀請碼');
    }

    // 驗證狀態
    if (!['PENDING', 'SENT'].includes(trialInvite.status)) {
      throw new BadRequestException('此試用邀請碼已被使用或已失效');
    }

    // 檢查使用者是否已有訂閱
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: { userId },
    });

    if (existingSubscription) {
      throw new BadRequestException('您已經使用過試用或訂閱服務');
    }

    // 決定使用的方案
    let planId = trialInvite.planId;
    if (!planId) {
      // 使用預設試用方案
      let trialPlan = await this.prisma.plan.findFirst({
        where: { code: 'FREE_TRIAL', isActive: true },
      });
      if (!trialPlan) {
        trialPlan = await this.createDefaultPlans();
      }
      planId = trialPlan.id;
    }

    // 計算試用期
    const now = new Date();
    const trialDays = trialInvite.trialDays;
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    // 建立訂閱
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId,
        status: SubscriptionStatus.TRIAL,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        trialEndsAt,
      },
      include: { plan: true },
    });

    // 更新試用邀請狀態
    await this.prisma.trialInvite.update({
      where: { id: trialInvite.id },
      data: {
        status: TrialInviteStatus.ACTIVE,
        activatedUserId: userId,
        activatedAt: now,
        expiresAt: trialEndsAt,
        subscriptionId: subscription.id,
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
   * 取得可用縣市列表（按戰區分組）
   */
  async getAvailableCities() {
    const plans = await this.prisma.plan.findMany({
      where: {
        isActive: true,
        city: { not: null },
      },
      select: {
        city: true,
        regionLevel: true,
      },
      distinct: ['city'],
      orderBy: [
        { regionLevel: 'asc' },
        { city: 'asc' },
      ],
    });

    // 按戰區等級分組
    const regionLabels: Record<number, string> = {
      1: '一級戰區（六都）',
      2: '二級戰區',
      3: '三級戰區（基準）',
      4: '四級戰區',
      5: '五級戰區（離島）',
    };

    const grouped: Record<number, { label: string; cities: string[] }> = {};

    for (const plan of plans) {
      if (plan.regionLevel && plan.city) {
        if (!grouped[plan.regionLevel]) {
          grouped[plan.regionLevel] = {
            label: regionLabels[plan.regionLevel] || `${plan.regionLevel}級戰區`,
            cities: [],
          };
        }
        if (!grouped[plan.regionLevel].cities.includes(plan.city)) {
          grouped[plan.regionLevel].cities.push(plan.city);
        }
      }
    }

    return Object.entries(grouped).map(([level, data]) => ({
      regionLevel: parseInt(level),
      label: data.label,
      cities: data.cities,
    }));
  }

  /**
   * 取得特定縣市的所有選舉類型方案
   */
  async getPlansByCity(city: string) {
    const plans = await this.prisma.plan.findMany({
      where: {
        city,
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    // 加入免費試用方案
    const trialPlan = await this.prisma.plan.findFirst({
      where: {
        code: 'FREE_TRIAL',
        isActive: true,
      },
    });

    return {
      city,
      trialPlan,
      plans,
    };
  }

  /**
   * 根據縣市和選舉類型取得方案
   */
  async getPlanByLocation(city: string, electionType: string) {
    // 將前端的選舉類型轉換為 PlanCategory
    const categoryMap: Record<string, PlanCategory> = {
      VILLAGE_CHIEF: PlanCategory.VILLAGE_CHIEF,
      TOWNSHIP_REP: PlanCategory.REPRESENTATIVE,
      CITY_COUNCILOR: PlanCategory.COUNCILOR,
      LEGISLATOR: PlanCategory.LEGISLATOR,
      MAYOR: PlanCategory.MAYOR,
    };

    const category = categoryMap[electionType];
    if (!category) {
      throw new BadRequestException('無效的選舉類型');
    }

    const plan = await this.prisma.plan.findFirst({
      where: {
        city,
        category,
        isActive: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(`找不到 ${city} ${electionType} 的方案`);
    }

    // 同時取得免費試用方案
    const trialPlan = await this.prisma.plan.findFirst({
      where: {
        code: 'FREE_TRIAL',
        isActive: true,
      },
    });

    return {
      city,
      electionType,
      plan,
      trialPlan,
    };
  }

  /**
   * 取得所有選舉類型
   */
  getElectionTypes() {
    return [
      { code: 'VILLAGE_CHIEF', label: '里長', category: 'VILLAGE_CHIEF' },
      { code: 'TOWNSHIP_REP', label: '民代', category: 'REPRESENTATIVE' },
      { code: 'CITY_COUNCILOR', label: '議員', category: 'COUNCILOR' },
      { code: 'MAYOR', label: '市長', category: 'MAYOR' },
      { code: 'LEGISLATOR', label: '立委', category: 'LEGISLATOR' },
    ];
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
        features: ['全功能試用 7 天', '最多 500 位選民', '最多 2 位團隊成員'],
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

  /**
   * 設定過期訂閱的緩衝期
   * 當訂閱過期後，為其關聯的 Campaign 設置緩衝期
   */
  async setGracePeriodForExpiredSubscriptions() {
    const now = new Date();
    const gracePeriodEnd = new Date(now.getTime() + this.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    // 找出剛過期且尚未設置緩衝期的訂閱
    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.EXPIRED,
        user: {
          campaigns: {
            some: {
              gracePeriodEndsAt: null,
              markedForDeletion: false,
              deletedAt: null,
            },
          },
        },
      },
      include: {
        user: {
          include: {
            campaigns: {
              where: {
                gracePeriodEndsAt: null,
                markedForDeletion: false,
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    let updatedCount = 0;

    for (const subscription of expiredSubscriptions) {
      for (const campaign of subscription.user.campaigns) {
        await this.prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            gracePeriodEndsAt: gracePeriodEnd,
          },
        });
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * 標記緩衝期已過的 Campaign 為待刪除
   */
  async markCampaignsForDeletion() {
    const now = new Date();

    const result = await this.prisma.campaign.updateMany({
      where: {
        gracePeriodEndsAt: {
          lt: now,
        },
        markedForDeletion: false,
        deletedAt: null,
      },
      data: {
        markedForDeletion: true,
      },
    });

    return result.count;
  }

  /**
   * 取得待刪除的 Campaign 列表（供超級管理者查看）
   */
  async getPendingDeletionCampaigns() {
    return this.prisma.campaign.findMany({
      where: {
        markedForDeletion: true,
        deletedAt: null,
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
        gracePeriodEndsAt: 'asc',
      },
    });
  }

  /**
   * 永久刪除 Campaign（軟刪除）
   */
  async permanentlyDeleteCampaign(campaignId: string) {
    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * 恢復 Campaign（取消刪除標記）
   */
  async restoreCampaign(campaignId: string) {
    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        markedForDeletion: false,
        gracePeriodEndsAt: null,
      },
    });
  }

  /**
   * 延長訂閱期限（用於推薦獎勵等）
   */
  async extendSubscription(userId: string, months: number) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE],
        },
      },
    });

    if (!subscription) {
      return null;
    }

    const currentEnd = new Date(subscription.currentPeriodEnd);
    const newEnd = new Date(currentEnd);
    newEnd.setMonth(newEnd.getMonth() + months);

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        currentPeriodEnd: newEnd,
      },
      include: {
        plan: true,
      },
    });
  }
}
