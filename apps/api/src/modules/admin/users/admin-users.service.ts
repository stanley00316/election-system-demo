import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminUserFilterDto, UpdateUserDto } from './dto/user-filter.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * 取得使用者列表
   */
  async getUsers(filter: AdminUserFilterDto) {
    const {
      search,
      isActive,
      isSuspended,
      hasSubscription,
      subscriptionStatus,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const where: Prisma.UserWhereInput = {};

    // 搜尋條件
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isSuspended !== undefined) {
      where.isSuspended = isSuspended;
    }

    // 訂閱篩選
    if (hasSubscription !== undefined || subscriptionStatus) {
      if (hasSubscription === true || subscriptionStatus) {
        where.subscriptions = {
          some: subscriptionStatus
            ? { status: subscriptionStatus as any }
            : {},
        };
      } else if (hasSubscription === false) {
        where.subscriptions = { none: {} };
      }
    }

    // 排序
    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'email') {
      orderBy.email = sortOrder;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          lineUserId: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
          isSuspended: true,
          suspendedAt: true,
          suspendReason: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              campaigns: true,
              subscriptions: true,
            },
          },
          subscriptions: {
            where: {
              status: { in: ['TRIAL', 'ACTIVE'] },
            },
            include: {
              plan: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map((user) => ({
        ...user,
        currentSubscription: user.subscriptions[0] || null,
        subscriptions: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 取得單一使用者詳情
   */
  async getUserById(id: string) {
    // OWASP A07: 使用 select 排除敏感欄位（totpSecret, googleTokens 等）
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        lineUserId: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        isSuspended: true,
        isAdmin: true,
        isSuperAdmin: true,
        totpEnabled: true,
        consentAcceptedAt: true,
        consentVersion: true,
        portraitConsentAcceptedAt: true,
        createdAt: true,
        updatedAt: true,
        campaigns: {
          select: {
            id: true,
            name: true,
            electionType: true,
            city: true,
            district: true,
            village: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                voters: true,
                contacts: true,
                teamMembers: true,
              },
            },
          },
        },
        promoter: true,
        teamMembers: {
          select: {
            id: true,
            role: true,
            campaign: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        subscriptions: {
          select: {
            id: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            trialEndsAt: true,
            cancelReason: true,
            cancelledAt: true,
            createdAt: true,
            plan: true,
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            contacts: true,
            schedules: true,
            createdVoters: true,
            createdEvents: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('使用者不存在');
    }

    return user;
  }

  /**
   * 更新使用者基本資料
   * 安全限制：不可修改 lineUserId（認證用途）
   */
  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('使用者不存在');

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        lineUserId: true,
        avatarUrl: true,
        isAdmin: true,
        isSuperAdmin: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * 停用使用者帳號
   */
  async suspendUser(id: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('使用者不存在');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendReason: reason,
      },
    });
  }

  /**
   * 啟用使用者帳號
   */
  async activateUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('使用者不存在');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspendReason: null,
      },
    });
  }

  /**
   * 取得使用者活動記錄
   */
  async getUserActivity(userId: string, page = 1, limit = 50) {
    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activityLog.count({ where: { userId } }),
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
   * 取得使用者統計摘要
   */
  async getUserStats() {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      usersWithSubscription,
      trialUsers,
      paidUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true, isSuspended: false } }),
      this.prisma.user.count({ where: { isSuspended: true } }),
      this.prisma.user.count({
        where: {
          subscriptions: {
            some: { status: { in: ['TRIAL', 'ACTIVE'] } },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          subscriptions: {
            some: { status: 'TRIAL' },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          subscriptions: {
            some: { status: 'ACTIVE' },
          },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      usersWithSubscription,
      trialUsers,
      paidUsers,
      inactiveUsers: totalUsers - activeUsers,
    };
  }

  /**
   * 匯出使用者列表（CSV 資料）
   */
  async exportUsers(filter: AdminUserFilterDto) {
    const { search, isActive, isSuspended, hasSubscription, subscriptionStatus } = filter;

    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive;
    if (isSuspended !== undefined) where.isSuspended = isSuspended;
    if (hasSubscription !== undefined || subscriptionStatus) {
      if (hasSubscription === true || subscriptionStatus) {
        where.subscriptions = { some: subscriptionStatus ? { status: subscriptionStatus as any } : {} };
      } else if (hasSubscription === false) {
        where.subscriptions = { none: {} };
      }
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        subscriptions: {
          where: { status: { in: ['TRIAL', 'ACTIVE'] } },
          include: { plan: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        campaigns: {
          select: { id: true },
        },
        _count: {
          select: {
            campaigns: true,
            contacts: true,
            createdVoters: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 取得每個使用者的選民統計與支持度
    const userIds = users.map((u) => u.id);
    const campaignData = await this.prisma.campaign.findMany({
      where: { ownerId: { in: userIds } },
      select: {
        ownerId: true,
        _count: { select: { voters: true, contacts: true } },
      },
    });

    // 聚合每個使用者的選民與接觸數
    const userCampaignStats: Record<string, { voters: number; contacts: number }> = {};
    campaignData.forEach((c) => {
      if (!userCampaignStats[c.ownerId]) {
        userCampaignStats[c.ownerId] = { voters: 0, contacts: 0 };
      }
      userCampaignStats[c.ownerId].voters += c._count.voters;
      userCampaignStats[c.ownerId].contacts += c._count.contacts;
    });

    // 取得使用者的選民支持度分佈
    const stanceData = await this.prisma.$queryRaw<Array<{ ownerId: string; stance: string; count: bigint }>>`
      SELECT c."ownerId", v."stance", COUNT(v.id) as count
      FROM "Voter" v
      JOIN "Campaign" c ON v."campaignId" = c.id
      WHERE c."ownerId" = ANY(${userIds})
      GROUP BY c."ownerId", v."stance"
    `;

    const userStanceMap: Record<string, Record<string, number>> = {};
    stanceData.forEach((row) => {
      if (!userStanceMap[row.ownerId]) userStanceMap[row.ownerId] = {};
      userStanceMap[row.ownerId][row.stance] = Number(row.count);
    });

    // 取得付款總額
    const paymentData = await this.prisma.$queryRaw<Array<{ userId: string; total: number }>>`
      SELECT s."userId", SUM(p.amount) as total
      FROM "Payment" p
      JOIN "Subscription" s ON p."subscriptionId" = s.id
      WHERE s."userId" = ANY(${userIds}) AND p.status = 'COMPLETED'
      GROUP BY s."userId"
    `;
    const userPaymentMap: Record<string, number> = {};
    paymentData.forEach((row) => {
      userPaymentMap[row.userId] = Number(row.total);
    });

    const headers = [
      '使用者ID', '姓名', 'Email', '電話', '註冊日期', '帳號狀態',
      '管理員', '訂閱方案', '訂閱狀態', '活動數量', '選民總數',
      '接觸總數', '支持率(%)', '接觸率(%)',
      '強力支持', '支持', '傾向支持', '中立', '未表態', '反對',
      '付款總額',
    ];

    const rows = users.map((user) => {
      const stats = userCampaignStats[user.id] || { voters: 0, contacts: 0 };
      const stances = userStanceMap[user.id] || {};
      const supportCount = (stances['STRONG_SUPPORT'] || 0) + (stances['SUPPORT'] || 0) + (stances['LEAN_SUPPORT'] || 0);
      const totalVoters = stats.voters;
      const supportRate = totalVoters > 0 ? Math.round((supportCount / totalVoters) * 1000) / 10 : 0;

      // 接觸率：需要算已接觸的不重複選民
      const contactRate = totalVoters > 0 ? Math.round((stats.contacts / totalVoters) * 1000) / 10 : 0;

      const currentSub = user.subscriptions[0];
      return [
        user.id,
        user.name || '',
        user.email || '',
        user.phone || '',
        user.createdAt.toISOString().split('T')[0],
        user.isSuspended ? '已停用' : '正常',
        user.isAdmin ? '是' : '否',
        currentSub?.plan?.name || '無',
        currentSub?.status || '無訂閱',
        user._count.campaigns,
        totalVoters,
        stats.contacts,
        supportRate,
        contactRate,
        stances['STRONG_SUPPORT'] || 0,
        stances['SUPPORT'] || 0,
        stances['LEAN_SUPPORT'] || 0,
        stances['NEUTRAL'] || 0,
        stances['UNDECIDED'] || 0,
        (stances['LEAN_OPPOSE'] || 0) + (stances['OPPOSE'] || 0) + (stances['STRONG_OPPOSE'] || 0),
        userPaymentMap[user.id] || 0,
      ];
    });

    return { headers, rows, total: users.length };
  }

  /**
   * 取得使用者的付款歷史
   */
  async getUserPayments(userId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { subscription: { userId } },
        include: {
          subscription: {
            include: {
              plan: { select: { id: true, name: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where: { subscription: { userId } } }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * 取得使用者的推薦關係
   */
  async getUserReferrals(userId: string) {
    const [asReferrer, asReferred] = await Promise.all([
      this.prisma.referral.findMany({
        where: { referrerUserId: userId },
        include: {
          referred: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.referral.findMany({
        where: { referredUserId: userId },
        include: {
          referrer: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { asReferrer, asReferred };
  }

  /**
   * 取得使用者所有活動的選民名單
   */
  async getUserVoters(userId: string, page = 1, limit = 20, search?: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true },
    });

    const campaignIds = campaigns.map((c) => c.id);
    const campaignNameMap = new Map(campaigns.map((c) => [c.id, c.name]));

    const where: Prisma.VoterWhereInput = {
      campaignId: { in: campaignIds },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.voter.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          city: true,
          districtName: true,
          village: true,
          stance: true,
          contactCount: true,
          lastContactAt: true,
          campaignId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.voter.count({ where }),
    ]);

    return {
      data: data.map((v) => ({
        ...v,
        campaignName: campaignNameMap.get(v.campaignId) || '',
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * 取得使用者所有活動的接觸紀錄
   */
  async getUserContacts(userId: string, page = 1, limit = 20) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true },
    });

    const campaignIds = campaigns.map((c) => c.id);
    const campaignNameMap = new Map(campaigns.map((c) => [c.id, c.name]));

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where: { campaignId: { in: campaignIds } },
        include: {
          voter: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { contactDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contact.count({ where: { campaignId: { in: campaignIds } } }),
    ]);

    return {
      data: data.map((c) => ({
        ...c,
        campaignName: campaignNameMap.get(c.campaignId) || '',
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * 取得使用者選情統計（跨所有活動）
   */
  async getUserCampaignStats(userId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        city: true,
        district: true,
        village: true,
        electionType: true,
        isActive: true,
        _count: { select: { voters: true, contacts: true } },
      },
    });

    if (campaigns.length === 0) {
      return {
        summary: { totalCampaigns: 0, totalVoters: 0, totalContacts: 0, overallSupportRate: 0, overallContactRate: 0 },
        stanceDistribution: {},
        contactOutcomeDistribution: {},
        contactTypeDistribution: {},
        campaignBreakdown: [],
      };
    }

    const campaignIds = campaigns.map((c) => c.id);

    // 整體支持度分佈
    const stanceGroups = await this.prisma.voter.groupBy({
      by: ['stance'],
      where: { campaignId: { in: campaignIds } },
      _count: { id: true },
    });

    const allStances = ['STRONG_SUPPORT', 'SUPPORT', 'LEAN_SUPPORT', 'NEUTRAL', 'UNDECIDED', 'LEAN_OPPOSE', 'OPPOSE', 'STRONG_OPPOSE'];
    const stanceDistribution: Record<string, number> = {};
    allStances.forEach((s) => { stanceDistribution[s] = 0; });
    stanceGroups.forEach((g) => { stanceDistribution[g.stance] = g._count.id; });

    // 整體接觸結果分佈
    const outcomeGroups = await this.prisma.contact.groupBy({
      by: ['outcome'],
      where: { campaignId: { in: campaignIds } },
      _count: { id: true },
    });

    const allOutcomes = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'NO_RESPONSE', 'NOT_HOME'];
    const contactOutcomeDistribution: Record<string, number> = {};
    allOutcomes.forEach((o) => { contactOutcomeDistribution[o] = 0; });
    outcomeGroups.forEach((g) => { contactOutcomeDistribution[g.outcome] = g._count.id; });

    // 整體接觸類型分佈
    const typeGroups = await this.prisma.contact.groupBy({
      by: ['type'],
      where: { campaignId: { in: campaignIds } },
      _count: { id: true },
    });

    const contactTypeDistribution: Record<string, number> = {};
    typeGroups.forEach((g) => { contactTypeDistribution[g.type] = g._count.id; });

    // 各活動個別統計
    const perCampaignStances = await this.prisma.voter.groupBy({
      by: ['campaignId', 'stance'],
      where: { campaignId: { in: campaignIds } },
      _count: { id: true },
    });

    const campaignStanceMap: Record<string, Record<string, number>> = {};
    perCampaignStances.forEach((g) => {
      if (!campaignStanceMap[g.campaignId]) {
        campaignStanceMap[g.campaignId] = {};
        allStances.forEach((s) => { campaignStanceMap[g.campaignId][s] = 0; });
      }
      campaignStanceMap[g.campaignId][g.stance] = g._count.id;
    });

    // 接觸人數（不重複選民）
    const contactedVoters = await this.prisma.contact.groupBy({
      by: ['campaignId'],
      where: { campaignId: { in: campaignIds } },
      _count: { id: true },
    });
    const contactedCountMap: Record<string, number> = {};
    contactedVoters.forEach((g) => { contactedCountMap[g.campaignId] = g._count.id; });

    const totalVoters = campaigns.reduce((sum, c) => sum + c._count.voters, 0);
    const totalContacts = campaigns.reduce((sum, c) => sum + c._count.contacts, 0);
    const supportCount = (stanceDistribution['STRONG_SUPPORT'] || 0) +
      (stanceDistribution['SUPPORT'] || 0) +
      (stanceDistribution['LEAN_SUPPORT'] || 0);
    const overallSupportRate = totalVoters > 0 ? Math.round((supportCount / totalVoters) * 1000) / 10 : 0;
    const overallContactRate = totalVoters > 0 ? Math.round((totalContacts / totalVoters) * 1000) / 10 : 0;

    const campaignBreakdown = campaigns.map((c) => {
      const stances = campaignStanceMap[c.id] || {};
      const voterCount = c._count.voters;
      const contactCount = c._count.contacts;
      const support = (stances['STRONG_SUPPORT'] || 0) + (stances['SUPPORT'] || 0) + (stances['LEAN_SUPPORT'] || 0);

      return {
        campaignId: c.id,
        campaignName: c.name,
        city: c.city,
        district: c.district,
        village: c.village,
        electionType: c.electionType,
        isActive: c.isActive,
        voterCount,
        contactCount,
        contactRate: voterCount > 0 ? Math.round((contactCount / voterCount) * 1000) / 10 : 0,
        supportRate: voterCount > 0 ? Math.round((support / voterCount) * 1000) / 10 : 0,
        stanceDistribution: stances,
      };
    });

    return {
      summary: { totalCampaigns: campaigns.length, totalVoters, totalContacts, overallSupportRate, overallContactRate },
      stanceDistribution,
      contactOutcomeDistribution,
      contactTypeDistribution,
      campaignBreakdown,
    };
  }

  /**
   * 匯出個人完整資料（CSV 格式）
   */
  async exportUserDetail(userId: string) {
    const user = await this.getUserById(userId);
    const payments = await this.getUserPayments(userId, 1, 1000);
    const referrals = await this.getUserReferrals(userId);
    const campaignStats = await this.getUserCampaignStats(userId);

    // 多區塊 CSV
    const sections: { title: string; headers: string[]; rows: any[][] }[] = [];

    // 區塊一：基本資料
    sections.push({
      title: '基本資料',
      headers: ['欄位', '值'],
      rows: [
        ['使用者ID', user.id],
        ['姓名', user.name || ''],
        ['Email', user.email || ''],
        ['電話', user.phone || ''],
        ['註冊日期', user.createdAt.toISOString().split('T')[0]],
        ['帳號狀態', user.isSuspended ? '已停用' : '正常'],
        ['管理員', user.isAdmin ? '是' : '否'],
        ['超級管理員', user.isSuperAdmin ? '是' : '否'],
      ],
    });

    // 區塊二：訂閱歷史
    sections.push({
      title: '訂閱歷史',
      headers: ['訂閱ID', '方案', '狀態', '開始日期', '到期日期', '取消原因'],
      rows: user.subscriptions.map((s: any) => [
        s.id,
        s.plan?.name || '',
        s.status,
        s.currentPeriodStart ? new Date(s.currentPeriodStart).toISOString().split('T')[0] : '',
        s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toISOString().split('T')[0] : '',
        s.cancelReason || '',
      ]),
    });

    // 區塊三：付款紀錄
    sections.push({
      title: '付款紀錄',
      headers: ['付款ID', '方案', '金額', '幣別', '狀態', '支付方式', '付款時間'],
      rows: payments.data.map((p: any) => [
        p.id,
        p.subscription?.plan?.name || '',
        p.amount,
        p.currency,
        p.status,
        p.provider,
        p.paidAt ? new Date(p.paidAt).toISOString().split('T')[0] : '',
      ]),
    });

    // 區塊四：選舉活動
    sections.push({
      title: '選舉活動',
      headers: ['活動名稱', '城市', '選舉類型', '選民數', '接觸數', '支持率(%)', '接觸率(%)'],
      rows: campaignStats.campaignBreakdown.map((c: any) => [
        c.campaignName,
        c.city,
        c.electionType,
        c.voterCount,
        c.contactCount,
        c.supportRate,
        c.contactRate,
      ]),
    });

    // 區塊五：推薦關係
    sections.push({
      title: '推薦關係（作為推薦人）',
      headers: ['被推薦人', 'Email', '推薦碼', '狀態', '獎勵月數', '建立時間'],
      rows: referrals.asReferrer.map((r: any) => [
        r.referred?.name || '',
        r.referred?.email || '',
        r.referralCode || '',
        r.status,
        r.rewardMonths || 0,
        new Date(r.createdAt).toISOString().split('T')[0],
      ]),
    });

    return { sections, userName: user.name || user.id };
  }
}
