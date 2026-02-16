import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * OWASP A07: 安全的 User select 物件，排除所有敏感欄位
 */
export const SAFE_USER_SELECT = {
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
  consentAcceptedAt: true,
  consentVersion: true,
  portraitConsentAcceptedAt: true,
  createdAt: true,
  updatedAt: true,
  // 排除: totpSecret, totpEnabled, googleAccessToken, googleRefreshToken, googleTokenExpiry, googleCalendarId
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException('使用者不存在');
    }

    return user;
  }

  async findByLineUserId(lineUserId: string) {
    return this.prisma.user.findUnique({
      where: { lineUserId },
      select: SAFE_USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findById(id);

    return this.prisma.user.update({
      where: { id: user.id },
      data: dto,
      select: SAFE_USER_SELECT,
    });
  }

  async getUserCampaigns(userId: string) {
    // 取得使用者擁有的活動
    const ownedCampaigns = await this.prisma.campaign.findMany({
      where: {
        ownerId: userId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 取得使用者參與的活動（團隊成員）
    const memberCampaigns = await this.prisma.teamMember.findMany({
      where: { userId },
      include: {
        campaign: true,
      },
    });

    return {
      owned: ownedCampaigns,
      member: memberCampaigns.map(m => ({
        ...m.campaign,
        role: m.role,
      })),
    };
  }

  async getActivityLogs(userId: string, limit = 50) {
    return this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
