import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentStatus, SubscriptionStatus, Prisma } from '@prisma/client';

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

  // ==================== 用戶深度分析 ====================

  /**
   * 留存率同期群分析（Cohort Analysis）
   * 基於 User.createdAt 分群，用 ActivityLog.createdAt 判斷留存
   */
  async getRetentionAnalysis(cohortMonths: number = 6) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - cohortMonths + 1, 1);

    // 取得每月同期群用戶
    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { id: true, createdAt: true },
    });

    // 按月份分群
    const cohorts: Record<string, string[]> = {};
    users.forEach((user) => {
      const monthKey = `${user.createdAt.getFullYear()}-${String(user.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!cohorts[monthKey]) cohorts[monthKey] = [];
      cohorts[monthKey].push(user.id);
    });

    // 取得所有活動記錄
    const activityLogs = await this.prisma.activityLog.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        createdAt: { gte: startDate },
      },
      select: { userId: true, createdAt: true },
    });

    // 建立 userId -> 活動月份集合
    const userActivityMonths: Record<string, Set<string>> = {};
    activityLogs.forEach((log) => {
      const monthKey = `${log.createdAt.getFullYear()}-${String(log.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!userActivityMonths[log.userId]) userActivityMonths[log.userId] = new Set();
      userActivityMonths[log.userId].add(monthKey);
    });

    // 計算留存率
    const result = Object.entries(cohorts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cohortMonth, userIds]) => {
        const cohortDate = new Date(cohortMonth + '-01');
        const totalUsers = userIds.length;
        const retention: Record<string, number> = {};

        for (let m = 0; m <= cohortMonths; m++) {
          const targetDate = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + m, 1);
          if (targetDate > now) break;
          const targetMonthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

          const activeCount = userIds.filter((uid) =>
            userActivityMonths[uid]?.has(targetMonthKey),
          ).length;

          retention[`month${m}`] = totalUsers > 0
            ? Math.round((activeCount / totalUsers) * 1000) / 10
            : 0;
        }

        return {
          cohort: cohortMonth,
          totalUsers,
          ...retention,
        };
      });

    return result;
  }

  /**
   * DAU/MAU/WAU 活躍用戶統計
   */
  async getActiveUserStats(days: number = 30) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 取得期間內活動記錄
    const activityLogs = await this.prisma.activityLog.findMany({
      where: { createdAt: { gte: startDate } },
      select: { userId: true, createdAt: true },
    });

    // DAU：每日不重複用戶數
    const dailyUsers: Record<string, Set<string>> = {};
    activityLogs.forEach((log) => {
      const dateKey = log.createdAt.toISOString().split('T')[0];
      if (!dailyUsers[dateKey]) dailyUsers[dateKey] = new Set();
      dailyUsers[dateKey].add(log.userId);
    });

    // 生成每日 DAU 資料
    const dau: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dau.push({
        date: dateKey,
        count: dailyUsers[dateKey]?.size || 0,
      });
    }

    // WAU：每週不重複用戶數（按最近 N 週）
    const wau: { week: string; count: number }[] = [];
    const totalWeeks = Math.ceil(days / 7);
    for (let w = 0; w < totalWeeks; w++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekUsers = new Set<string>();

      activityLogs.forEach((log) => {
        if (log.createdAt >= weekStart && log.createdAt < weekEnd) {
          weekUsers.add(log.userId);
        }
      });

      wau.unshift({
        week: weekStart.toISOString().split('T')[0],
        count: weekUsers.size,
      });
    }

    // MAU：每月不重複用戶數
    const monthlyUsers: Record<string, Set<string>> = {};
    activityLogs.forEach((log) => {
      const monthKey = `${log.createdAt.getFullYear()}-${String(log.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyUsers[monthKey]) monthlyUsers[monthKey] = new Set();
      monthlyUsers[monthKey].add(log.userId);
    });

    const mau = Object.entries(monthlyUsers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, users]) => ({
        month,
        count: users.size,
      }));

    // DAU/MAU 比率（使用最近一天 DAU 和最近一月 MAU）
    const todayKey = now.toISOString().split('T')[0];
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const latestDau = dailyUsers[todayKey]?.size || 0;
    const latestMau = monthlyUsers[currentMonthKey]?.size || 0;
    const dauMauRatio = latestMau > 0
      ? Math.round((latestDau / latestMau) * 1000) / 10
      : 0;

    return { dau, wau, mau, dauMauRatio };
  }

  /**
   * 訂閱生命週期分析
   */
  async getSubscriptionLifecycle() {
    // 1. 試用轉付費轉換率
    const [totalTrialSubs, convertedTrialSubs] = await Promise.all([
      this.prisma.subscription.count({
        where: { trialEndsAt: { not: null } },
      }),
      this.prisma.subscription.count({
        where: {
          trialEndsAt: { not: null },
          status: { in: [SubscriptionStatus.ACTIVE] },
        },
      }),
    ]);
    const trialConversionRate = totalTrialSubs > 0
      ? Math.round((convertedTrialSubs / totalTrialSubs) * 1000) / 10
      : 0;

    // 2. 平均試用轉換天數
    const convertedSubs = await this.prisma.subscription.findMany({
      where: {
        trialEndsAt: { not: null },
        status: SubscriptionStatus.ACTIVE,
      },
      select: { createdAt: true, trialEndsAt: true, currentPeriodStart: true },
    });

    let avgTrialDays = 0;
    if (convertedSubs.length > 0) {
      const totalDays = convertedSubs.reduce((sum, sub) => {
        const trialEnd = sub.trialEndsAt!;
        const start = sub.createdAt;
        const diff = (trialEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        return sum + diff;
      }, 0);
      avgTrialDays = Math.round((totalDays / convertedSubs.length) * 10) / 10;
    }

    // 3. 平均訂閱持續月數
    const allSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED] },
      },
      select: { createdAt: true, cancelledAt: true, currentPeriodEnd: true, status: true },
    });

    let avgDurationMonths = 0;
    if (allSubscriptions.length > 0) {
      const totalMonths = allSubscriptions.reduce((sum, sub) => {
        const endDate = sub.cancelledAt || sub.currentPeriodEnd || new Date();
        const diff = (endDate.getTime() - sub.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return sum + diff;
      }, 0);
      avgDurationMonths = Math.round((totalMonths / allSubscriptions.length) * 10) / 10;
    }

    // 4. 取消原因分佈
    const cancelledSubs = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.CANCELLED,
        cancelReason: { not: null },
      },
      select: { cancelReason: true },
    });

    const cancelReasonCounts: Record<string, number> = {};
    cancelledSubs.forEach((sub) => {
      const reason = sub.cancelReason || '未說明';
      cancelReasonCounts[reason] = (cancelReasonCounts[reason] || 0) + 1;
    });

    const cancelReasons = Object.entries(cancelReasonCounts).map(([reason, count]) => ({
      reason,
      count,
    }));

    // 5. 狀態遷移漏斗
    const [trialCount, activeCount, cancelledCount, expiredCount] = await Promise.all([
      this.prisma.subscription.count({ where: { trialEndsAt: { not: null } } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.CANCELLED } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.EXPIRED } }),
    ]);

    const funnel = [
      { stage: '試用', count: trialCount },
      { stage: '付費', count: activeCount },
      { stage: '取消', count: cancelledCount },
      { stage: '過期', count: expiredCount },
    ];

    return {
      trialConversionRate,
      avgTrialDays,
      avgDurationMonths,
      cancelReasons,
      funnel,
      totalTrialSubs,
      convertedTrialSubs,
    };
  }

  /**
   * 地理分佈分析
   * 按 Campaign.city 分組統計
   */
  async getGeographicDistribution() {
    // 按城市統計用戶數（透過 Campaign）
    const campaigns = await this.prisma.campaign.findMany({
      select: {
        city: true,
        ownerId: true,
      },
    });

    // 城市 -> 用戶集合
    const cityUsers: Record<string, Set<string>> = {};
    campaigns.forEach((c) => {
      if (!cityUsers[c.city]) cityUsers[c.city] = new Set();
      cityUsers[c.city].add(c.ownerId);
    });

    // 按城市統計訂閱數與營收
    const subscriptions = await this.prisma.subscription.findMany({
      where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
      select: {
        userId: true,
        payments: {
          where: { status: PaymentStatus.COMPLETED },
          select: { amount: true },
        },
      },
    });

    // 用戶 -> 城市映射
    const userCityMap: Record<string, string> = {};
    campaigns.forEach((c) => {
      if (!userCityMap[c.ownerId]) {
        userCityMap[c.ownerId] = c.city;
      }
    });

    const cityStats: Record<string, { users: number; subscriptions: number; revenue: number }> = {};

    // 初始化
    Object.keys(cityUsers).forEach((city) => {
      cityStats[city] = {
        users: cityUsers[city].size,
        subscriptions: 0,
        revenue: 0,
      };
    });

    // 統計訂閱與營收
    subscriptions.forEach((sub) => {
      const city = userCityMap[sub.userId];
      if (city && cityStats[city]) {
        cityStats[city].subscriptions++;
        const revenue = sub.payments.reduce((sum, p) => sum + p.amount, 0);
        cityStats[city].revenue += revenue;
      }
    });

    return Object.entries(cityStats)
      .map(([city, stats]) => ({ city, ...stats }))
      .sort((a, b) => b.users - a.users);
  }

  /**
   * 用戶行為分析
   */
  async getUserBehaviorAnalysis() {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. 功能使用頻率（按 entity 分組）
    const entityUsage = await this.prisma.activityLog.groupBy({
      by: ['entity'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const featureUsage = entityUsage.map((e) => ({
      feature: e.entity,
      count: e._count.id,
    }));

    // 2. 活躍時段分佈（按小時分組）
    const activityLogs = await this.prisma.activityLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    const hourlyDistribution: number[] = new Array(24).fill(0);
    activityLogs.forEach((log) => {
      const hour = log.createdAt.getHours();
      hourlyDistribution[hour]++;
    });

    const hourlyData = hourlyDistribution.map((count, hour) => ({
      hour,
      count,
    }));

    // 3. 首次關鍵行為時間（註冊到建立第一個 Campaign 的平均天數）
    const usersWithFirstCampaign = await this.prisma.user.findMany({
      select: {
        createdAt: true,
        campaigns: {
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
      where: {
        campaigns: { some: {} },
      },
    });

    let avgDaysToFirstCampaign = 0;
    if (usersWithFirstCampaign.length > 0) {
      const totalDays = usersWithFirstCampaign.reduce((sum, user) => {
        if (user.campaigns.length > 0) {
          const diff = (user.campaigns[0].createdAt.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return sum + Math.max(0, diff);
        }
        return sum;
      }, 0);
      avgDaysToFirstCampaign = Math.round((totalDays / usersWithFirstCampaign.length) * 10) / 10;
    }

    return {
      featureUsage,
      hourlyData,
      avgDaysToFirstCampaign,
      totalActiveUsers: new Set(activityLogs.map(() => '')).size, // placeholder
    };
  }

  /**
   * 用戶價值分析
   */
  async getUserValueAnalysis() {
    // 1. LTV 計算：每用戶累計付款金額
    const userPayments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.COMPLETED },
      select: {
        amount: true,
        paidAt: true,
        subscription: {
          select: { userId: true },
        },
      },
    });

    // 用戶 -> 累計金額
    const userLtv: Record<string, number> = {};
    userPayments.forEach((p) => {
      const userId = p.subscription.userId;
      userLtv[userId] = (userLtv[userId] || 0) + p.amount;
    });

    const ltvValues = Object.values(userLtv);

    // LTV 分佈（直方圖用）
    const ltvDistribution: { range: string; count: number }[] = [];
    const ranges = [0, 500, 1000, 2000, 5000, 10000, 20000, 50000];
    for (let i = 0; i < ranges.length; i++) {
      const min = ranges[i];
      const max = ranges[i + 1] || Infinity;
      const count = ltvValues.filter((v) => v >= min && v < max).length;
      const label = max === Infinity ? `${min}+` : `${min}-${max}`;
      ltvDistribution.push({ range: label, count });
    }

    // 2. 用戶價值分層
    const totalPaidUsers = ltvValues.length;
    const avgLtv = totalPaidUsers > 0
      ? Math.round(ltvValues.reduce((a, b) => a + b, 0) / totalPaidUsers)
      : 0;

    // 高價值：LTV > 平均值 * 2，中：平均值 ~ 平均值*2，低：< 平均值
    const highThreshold = avgLtv * 2;
    const highValue = ltvValues.filter((v) => v >= highThreshold).length;
    const mediumValue = ltvValues.filter((v) => v >= avgLtv && v < highThreshold).length;
    const lowValue = ltvValues.filter((v) => v < avgLtv).length;

    const valueTiers = [
      { tier: '高價值', count: highValue },
      { tier: '中價值', count: mediumValue },
      { tier: '低價值', count: lowValue },
    ];

    // 3. ARPU 月趨勢
    const now = new Date();
    const arpuMonths = 12;
    const arpuTrend: { month: string; arpu: number; totalRevenue: number; paidUsers: number }[] = [];

    for (let i = arpuMonths - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

      const monthPayments = userPayments.filter((p) => {
        if (!p.paidAt) return false;
        return p.paidAt >= monthDate && p.paidAt <= monthEnd;
      });

      const monthUserIds = new Set(monthPayments.map((p) => p.subscription.userId));
      const monthRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const paidUsers = monthUserIds.size;

      arpuTrend.push({
        month: monthKey,
        arpu: paidUsers > 0 ? Math.round(monthRevenue / paidUsers) : 0,
        totalRevenue: monthRevenue,
        paidUsers,
      });
    }

    return {
      ltvDistribution,
      valueTiers,
      arpuTrend,
      avgLtv,
      totalPaidUsers,
    };
  }
}
