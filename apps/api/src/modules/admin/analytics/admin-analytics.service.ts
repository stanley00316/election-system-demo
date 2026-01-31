import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class AdminAnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 取得總覽數據
   */
  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 基本統計
    const [
      totalUsers,
      activeSubscriptions,
      monthlyRevenue,
      lastMonthRevenue,
      newUsersThisMonth,
      newUsersLastMonth,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.subscription.count({
        where: { status: { in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE] } },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.COMPLETED,
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.COMPLETED,
          paidAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
    ]);

    // 計算轉換率（試用 -> 付費）
    const [trialToActiveDuringMonth, totalExpiredTrials] = await Promise.all([
      this.prisma.subscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.subscription.count({
        where: {
          status: { in: [SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELLED] },
          trialEndsAt: { not: null },
        },
      }),
    ]);

    // 計算流失率
    const cancelledThisMonth = await this.prisma.subscription.count({
      where: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: { gte: startOfMonth },
      },
    });

    const currentMonthRevenue = monthlyRevenue._sum.amount || 0;
    const previousMonthRevenue = lastMonthRevenue._sum.amount || 0;
    const revenueGrowth = previousMonthRevenue > 0
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : 0;

    const userGrowth = newUsersLastMonth > 0
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
      : 0;

    // 計算 ARPU (Average Revenue Per User)
    const arpu = activeSubscriptions > 0
      ? Math.round(currentMonthRevenue / activeSubscriptions)
      : 0;

    // 計算轉換率
    const totalTrials = await this.prisma.subscription.count({
      where: { trialEndsAt: { not: null } },
    });
    const conversionRate = totalTrials > 0
      ? (trialToActiveDuringMonth / totalTrials) * 100
      : 0;

    // 計算流失率
    const churnRate = activeSubscriptions > 0
      ? (cancelledThisMonth / activeSubscriptions) * 100
      : 0;

    return {
      totalUsers,
      activeSubscriptions,
      monthlyRevenue: currentMonthRevenue,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      userGrowth: Math.round(userGrowth * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      churnRate: Math.round(churnRate * 10) / 10,
      arpu,
      newUsersThisMonth,
    };
  }

  /**
   * 取得用戶成長統計
   */
  async getUserGrowth(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 每日新用戶數
    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 按日期分組
    const dailyStats: Record<string, number> = {};
    const dateFormat = (date: Date) => date.toISOString().split('T')[0];

    // 初始化日期
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dailyStats[dateFormat(date)] = 0;
    }

    // 計算每日數量
    users.forEach((user) => {
      const dateKey = dateFormat(user.createdAt);
      if (dailyStats[dateKey] !== undefined) {
        dailyStats[dateKey]++;
      }
    });

    // 計算累積用戶數
    const totalBeforeStart = await this.prisma.user.count({
      where: { createdAt: { lt: startDate } },
    });

    let cumulative = totalBeforeStart;
    const data = Object.entries(dailyStats).map(([date, count]) => {
      cumulative += count;
      return {
        date,
        newUsers: count,
        totalUsers: cumulative,
      };
    });

    return data;
  }

  /**
   * 取得營收報表
   */
  async getRevenueReport(months: number = 12) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: { gte: startDate },
      },
      select: {
        amount: true,
        paidAt: true,
        subscription: {
          select: {
            plan: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { paidAt: 'asc' },
    });

    // 按月份分組
    const monthlyStats: Record<string, {
      revenue: number;
      count: number;
      byPlan: Record<string, { revenue: number; count: number }>;
    }> = {};

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyStats[monthKey] = { revenue: 0, count: 0, byPlan: {} };
    }

    payments.forEach((payment) => {
      if (!payment.paidAt) return;
      const monthKey = `${payment.paidAt.getFullYear()}-${String(payment.paidAt.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyStats[monthKey]) {
        monthlyStats[monthKey].revenue += payment.amount;
        monthlyStats[monthKey].count++;

        const planCode = payment.subscription.plan.code;
        if (!monthlyStats[monthKey].byPlan[planCode]) {
          monthlyStats[monthKey].byPlan[planCode] = { revenue: 0, count: 0 };
        }
        monthlyStats[monthKey].byPlan[planCode].revenue += payment.amount;
        monthlyStats[monthKey].byPlan[planCode].count++;
      }
    });

    return Object.entries(monthlyStats).map(([month, stats]) => ({
      month,
      ...stats,
    }));
  }

  /**
   * 取得訂閱分佈
   */
  async getSubscriptionDistribution() {
    // 按狀態分佈
    const statusDistribution = await this.prisma.subscription.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    // 按方案分佈
    const planDistribution = await this.prisma.subscription.groupBy({
      by: ['planId'],
      where: {
        status: { in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE] },
      },
      _count: { id: true },
    });

    // 取得方案名稱
    const plans = await this.prisma.plan.findMany({
      select: { id: true, name: true, code: true },
    });

    const planMap = new Map(plans.map((p) => [p.id, p]));

    return {
      byStatus: statusDistribution.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      byPlan: planDistribution.map((p) => ({
        planId: p.planId,
        planName: planMap.get(p.planId)?.name || '未知',
        planCode: planMap.get(p.planId)?.code || '',
        count: p._count.id,
      })),
    };
  }

  /**
   * 取得最近活動
   */
  async getRecentActivity(limit: number = 20) {
    const [newUsers, newSubscriptions, newPayments] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.subscription.findMany({
        select: {
          id: true,
          status: true,
          createdAt: true,
          user: {
            select: { id: true, name: true },
          },
          plan: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.COMPLETED },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          subscription: {
            select: {
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { paidAt: 'desc' },
        take: limit,
      }),
    ]);

    return {
      newUsers,
      newSubscriptions,
      recentPayments: newPayments,
    };
  }
}
