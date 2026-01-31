import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminAuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * 取得管理員資訊（驗證是否為管理員）
   */
  async getAdminInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        lineUserId: true,
        name: true,
        email: true,
        avatarUrl: true,
        isAdmin: true,
        isActive: true,
        isSuspended: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('使用者不存在');
    }

    if (!user.isAdmin) {
      throw new ForbiddenException('您沒有管理員權限');
    }

    return user;
  }

  /**
   * 指派管理員
   */
  async assignAdmin(targetUserId: string, assignedByUserId: string) {
    // 檢查目標使用者是否存在
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('目標使用者不存在');
    }

    if (targetUser.isAdmin) {
      return { message: '該使用者已是管理員', user: targetUser };
    }

    // 更新為管理員
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isAdmin: true },
    });

    // 記錄操作
    await this.logAction(
      assignedByUserId,
      'ADMIN_ASSIGN',
      'USER',
      targetUserId,
      { assignedBy: assignedByUserId },
    );

    return { message: '已成功指派為管理員', user: updatedUser };
  }

  /**
   * 移除管理員權限
   */
  async removeAdmin(targetUserId: string, removedByUserId: string) {
    // 不能移除自己的管理員權限
    if (targetUserId === removedByUserId) {
      throw new ForbiddenException('無法移除自己的管理員權限');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('目標使用者不存在');
    }

    if (!targetUser.isAdmin) {
      return { message: '該使用者不是管理員', user: targetUser };
    }

    // 移除管理員權限
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isAdmin: false },
    });

    // 記錄操作
    await this.logAction(
      removedByUserId,
      'ADMIN_REMOVE',
      'USER',
      targetUserId,
      { removedBy: removedByUserId },
    );

    return { message: '已移除管理員權限', user: updatedUser };
  }

  /**
   * 取得所有管理員列表
   */
  async getAdmins() {
    return this.prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        lineUserId: true,
        name: true,
        email: true,
        avatarUrl: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 記錄管理員操作
   */
  async logAction(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.adminActionLog.create({
      data: {
        adminId,
        action,
        targetType,
        targetId,
        details,
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * 取得管理員操作記錄
   */
  async getActionLogs(params: {
    adminId?: string;
    targetType?: string;
    targetId?: string;
    page?: number;
    limit?: number;
  }) {
    const { adminId, targetType, targetId, page = 1, limit = 50 } = params;

    const where: any = {};
    if (adminId) where.adminId = adminId;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;

    const [data, total] = await Promise.all([
      this.prisma.adminActionLog.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.adminActionLog.count({ where }),
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
}
