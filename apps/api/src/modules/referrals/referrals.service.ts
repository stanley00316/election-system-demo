import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReferralStatus, SubscriptionStatus, PlanInterval } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class ReferralsService {
  // 推薦獎勵：延長訂閱月數
  private readonly REWARD_MONTHS = 1;
  // 推薦碼有效期（天）
  private readonly REFERRAL_EXPIRY_DAYS = 90;

  constructor(private prisma: PrismaService) {}

  /**
   * 生成唯一推薦碼
   */
  private generateCode(): string {
    // 生成 8 位數的大寫英數混合碼
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字元 (0, O, 1, I)
    let code = '';
    const randomBytesArray = randomBytes(8);
    for (let i = 0; i < 8; i++) {
      code += chars[randomBytesArray[i] % chars.length];
    }
    return code;
  }

  /**
   * 為使用者生成推薦碼（如果尚未有）
   */
  async generateReferralCode(userId: string): Promise<string> {
    // 檢查使用者是否已有推薦碼
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user) {
      throw new NotFoundException('找不到使用者');
    }

    if (user.referralCode) {
      return user.referralCode;
    }

    // 生成唯一的推薦碼
    let code: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      code = this.generateCode();
      const existing = await this.prisma.user.findUnique({
        where: { referralCode: code },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new BadRequestException('無法生成推薦碼，請稍後再試');
    }

    // 更新使用者的推薦碼
    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    return code;
  }

  /**
   * 取得使用者的推薦碼
   */
  async getMyReferralCode(userId: string): Promise<{ code: string; shareUrl: string }> {
    const code = await this.generateReferralCode(userId);
    const baseUrl = process.env.FRONTEND_URL || 'https://election.example.com';
    const shareUrl = `${baseUrl}/register?ref=${code}`;

    return { code, shareUrl };
  }

  /**
   * 使用推薦碼（新用戶註冊時）
   */
  async applyReferralCode(userId: string, referralCode: string) {
    // 檢查使用者是否已被推薦過
    const existingReferral = await this.prisma.referral.findUnique({
      where: { referredUserId: userId },
    });

    if (existingReferral) {
      throw new ConflictException('您已經使用過推薦碼');
    }

    // 查找推薦碼的擁有者
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: referralCode.toUpperCase() },
    });

    if (!referrer) {
      throw new NotFoundException('無效的推薦碼');
    }

    // 不能使用自己的推薦碼
    if (referrer.id === userId) {
      throw new BadRequestException('不能使用自己的推薦碼');
    }

    // 建立推薦記錄
    const referral = await this.prisma.referral.create({
      data: {
        referrerUserId: referrer.id,
        referredUserId: userId,
        referralCode: referralCode.toUpperCase(),
        status: ReferralStatus.PENDING,
        rewardMonths: this.REWARD_MONTHS,
      },
      include: {
        referrer: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      success: true,
      message: '推薦碼套用成功',
      referral: {
        id: referral.id,
        referrerName: referral.referrer.name,
        status: referral.status,
      },
    };
  }

  /**
   * 發放推薦獎勵（當被推薦人首次付款成功時呼叫）
   */
  async grantReferralReward(referredUserId: string) {
    // 查找該使用者的推薦記錄
    const referral = await this.prisma.referral.findUnique({
      where: { referredUserId },
      include: {
        referrer: true,
      },
    });

    if (!referral) {
      // 沒有推薦記錄，不需要發放獎勵
      return null;
    }

    if (referral.status === ReferralStatus.COMPLETED) {
      // 已經發放過獎勵
      return null;
    }

    // 查找推薦人的有效訂閱
    const referrerSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId: referral.referrerUserId,
        status: {
          in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE],
        },
      },
    });

    if (referrerSubscription) {
      // 延長推薦人的訂閱期限
      const currentEnd = new Date(referrerSubscription.currentPeriodEnd);
      const newEnd = new Date(currentEnd);
      newEnd.setMonth(newEnd.getMonth() + referral.rewardMonths);

      await this.prisma.subscription.update({
        where: { id: referrerSubscription.id },
        data: {
          currentPeriodEnd: newEnd,
        },
      });
    }

    // 更新推薦記錄狀態
    const updatedReferral = await this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: ReferralStatus.COMPLETED,
        rewardGrantedAt: new Date(),
      },
    });

    return {
      referralId: updatedReferral.id,
      referrerId: referral.referrerUserId,
      rewardMonths: referral.rewardMonths,
      newSubscriptionEnd: referrerSubscription
        ? new Date(
            new Date(referrerSubscription.currentPeriodEnd).setMonth(
              new Date(referrerSubscription.currentPeriodEnd).getMonth() +
                referral.rewardMonths,
            ),
          )
        : null,
    };
  }

  /**
   * 取得使用者的推薦列表（我推薦的人）
   */
  async getMyReferrals(userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerUserId: userId },
      include: {
        referred: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return referrals.map((r) => ({
      id: r.id,
      referredUser: {
        id: r.referred.id,
        name: r.referred.name,
        avatarUrl: r.referred.avatarUrl,
        joinedAt: r.referred.createdAt,
      },
      status: r.status,
      rewardMonths: r.rewardMonths,
      rewardGrantedAt: r.rewardGrantedAt,
      createdAt: r.createdAt,
    }));
  }

  /**
   * 取得推薦統計
   */
  async getReferralStats(userId: string) {
    const [totalReferrals, completedReferrals, pendingReferrals] =
      await Promise.all([
        this.prisma.referral.count({
          where: { referrerUserId: userId },
        }),
        this.prisma.referral.count({
          where: {
            referrerUserId: userId,
            status: ReferralStatus.COMPLETED,
          },
        }),
        this.prisma.referral.count({
          where: {
            referrerUserId: userId,
            status: ReferralStatus.PENDING,
          },
        }),
      ]);

    // 計算總共獲得的獎勵月數
    const completedReferralsWithReward = await this.prisma.referral.aggregate({
      where: {
        referrerUserId: userId,
        status: ReferralStatus.COMPLETED,
      },
      _sum: {
        rewardMonths: true,
      },
    });

    return {
      totalReferrals,
      completedReferrals,
      pendingReferrals,
      totalRewardMonths: completedReferralsWithReward._sum.rewardMonths || 0,
    };
  }

  /**
   * 檢查使用者是否有待處理的推薦
   */
  async checkPendingReferral(userId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { referredUserId: userId },
      include: {
        referrer: {
          select: { id: true, name: true },
        },
      },
    });

    if (!referral) {
      return { hasPendingReferral: false };
    }

    return {
      hasPendingReferral: referral.status === ReferralStatus.PENDING,
      referral: {
        id: referral.id,
        referrerName: referral.referrer.name,
        status: referral.status,
        createdAt: referral.createdAt,
      },
    };
  }

  /**
   * 管理後台：取得所有推薦記錄
   */
  async getAllReferrals(options: {
    status?: ReferralStatus;
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { status, page = 1, limit = 20, startDate, endDate } = options;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [total, referrals] = await Promise.all([
      this.prisma.referral.count({ where }),
      this.prisma.referral.findMany({
        where,
        include: {
          referrer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
          referred: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: referrals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 管理後台：取得推薦統計總覽
   */
  async getAdminReferralStats() {
    const [
      totalReferrals,
      completedReferrals,
      pendingReferrals,
      expiredReferrals,
      totalRewardMonths,
      thisMonthReferrals,
      thisMonthCompleted,
    ] = await Promise.all([
      this.prisma.referral.count(),
      this.prisma.referral.count({
        where: { status: ReferralStatus.COMPLETED },
      }),
      this.prisma.referral.count({
        where: { status: ReferralStatus.PENDING },
      }),
      this.prisma.referral.count({
        where: { status: ReferralStatus.EXPIRED },
      }),
      this.prisma.referral.aggregate({
        where: { status: ReferralStatus.COMPLETED },
        _sum: { rewardMonths: true },
      }),
      // 本月推薦數
      this.prisma.referral.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      // 本月完成數
      this.prisma.referral.count({
        where: {
          status: ReferralStatus.COMPLETED,
          rewardGrantedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    // 計算轉換率
    const conversionRate =
      totalReferrals > 0
        ? ((completedReferrals / totalReferrals) * 100).toFixed(2)
        : '0.00';

    return {
      totalReferrals,
      completedReferrals,
      pendingReferrals,
      expiredReferrals,
      totalRewardMonths: totalRewardMonths._sum.rewardMonths || 0,
      conversionRate: parseFloat(conversionRate),
      thisMonthReferrals,
      thisMonthCompleted,
    };
  }

  /**
   * 管理後台：取得推薦排行榜
   */
  async getReferralLeaderboard(limit: number = 10) {
    const leaderboard = await this.prisma.referral.groupBy({
      by: ['referrerUserId'],
      where: { status: ReferralStatus.COMPLETED },
      _count: { id: true },
      _sum: { rewardMonths: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    // 取得使用者資訊
    const userIds = leaderboard.map((item) => item.referrerUserId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatarUrl: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return leaderboard.map((item, index) => ({
      rank: index + 1,
      user: userMap.get(item.referrerUserId),
      completedReferrals: item._count.id,
      totalRewardMonths: item._sum.rewardMonths || 0,
    }));
  }

  /**
   * 過期超過期限的推薦
   */
  async expireOldReferrals() {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - this.REFERRAL_EXPIRY_DAYS);

    const result = await this.prisma.referral.updateMany({
      where: {
        status: ReferralStatus.PENDING,
        createdAt: { lt: expiryDate },
      },
      data: {
        status: ReferralStatus.EXPIRED,
      },
    });

    return result.count;
  }
}
