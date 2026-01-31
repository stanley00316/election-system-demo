import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminUserFilterDto } from './dto/user-filter.dto';
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        campaigns: {
          select: {
            id: true,
            name: true,
            electionType: true,
            city: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                voters: true,
                teamMembers: true,
              },
            },
          },
        },
        teamMembers: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        subscriptions: {
          include: {
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
}
