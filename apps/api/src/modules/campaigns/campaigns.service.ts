import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, ElectionType, PlanCategory, SubscriptionStatus } from '@prisma/client';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { CreateInviteLinkDto } from './dto/create-invite-link.dto';
import { randomBytes } from 'crypto';

// Campaign.electionType 對應 Plan.category 的映射
const ELECTION_TYPE_TO_PLAN_CATEGORY: Record<ElectionType, PlanCategory> = {
  [ElectionType.VILLAGE_CHIEF]: PlanCategory.VILLAGE_CHIEF,
  [ElectionType.TOWNSHIP_REP]: PlanCategory.REPRESENTATIVE,
  [ElectionType.CITY_COUNCILOR]: PlanCategory.COUNCILOR,
  [ElectionType.MAYOR]: PlanCategory.MAYOR,
  [ElectionType.LEGISLATOR]: PlanCategory.LEGISLATOR,
  [ElectionType.PRESIDENT]: PlanCategory.LEGISLATOR, // 總統選舉使用立委方案
};

// 選舉類型的中文標籤
const ELECTION_TYPE_LABELS: Record<ElectionType, string> = {
  [ElectionType.VILLAGE_CHIEF]: '里長',
  [ElectionType.TOWNSHIP_REP]: '民代',
  [ElectionType.CITY_COUNCILOR]: '議員',
  [ElectionType.MAYOR]: '市長',
  [ElectionType.LEGISLATOR]: '立委',
  [ElectionType.PRESIDENT]: '總統',
};

// 方案類別的中文標籤
const PLAN_CATEGORY_LABELS: Record<PlanCategory, string> = {
  [PlanCategory.VILLAGE_CHIEF]: '里長',
  [PlanCategory.REPRESENTATIVE]: '民代',
  [PlanCategory.COUNCILOR]: '議員',
  [PlanCategory.MAYOR]: '市長',
  [PlanCategory.LEGISLATOR]: '立委',
};

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateCampaignDto) {
    // 驗證訂閱方案與 Campaign 的一致性
    await this.validateSubscriptionForCampaign(userId, dto);

    const campaign = await this.prisma.campaign.create({
      data: {
        ...dto,
        ownerId: userId,
      },
    });

    // 將擁有者加入團隊成員（ADMIN 角色）
    await this.prisma.teamMember.create({
      data: {
        userId,
        campaignId: campaign.id,
        role: UserRole.ADMIN,
      },
    });

    return campaign;
  }

  /**
   * 驗證訂閱方案是否允許建立指定的 Campaign
   * 防止用戶購買低價方案但建立高價選區的 Campaign
   */
  private async validateSubscriptionForCampaign(userId: string, dto: CreateCampaignDto) {
    // 取得用戶當前有效訂閱
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE],
        },
        currentPeriodEnd: {
          gte: new Date(),
        },
      },
      include: {
        plan: true,
      },
    });

    // 無訂閱時，提示用戶先訂閱
    if (!subscription) {
      throw new BadRequestException({
        statusCode: 400,
        message: '請先選擇訂閱方案後再建立選舉活動',
        code: 'NO_SUBSCRIPTION',
        upgradeUrl: '/pricing',
      });
    }

    // 試用期間允許建立任何 Campaign（讓用戶體驗完整功能）
    if (subscription.status === SubscriptionStatus.TRIAL) {
      return; // 直接通過驗證
    }

    // 免費試用方案（FREE_TRIAL）允許任意建立
    if (subscription.plan.code === 'FREE_TRIAL') {
      return;
    }

    // 檢查方案是否為分級定價方案（有 city 和 category）
    const plan = subscription.plan;
    if (!plan.city || !plan.category) {
      // 舊版本的通用方案，不做限制
      return;
    }

    // 驗證縣市是否一致
    if (plan.city !== dto.city) {
      throw new BadRequestException({
        statusCode: 400,
        message: `您的訂閱方案（${plan.city}${PLAN_CATEGORY_LABELS[plan.category as PlanCategory] || plan.category}）與建立的選舉活動（${dto.city}${ELECTION_TYPE_LABELS[dto.electionType as ElectionType] || dto.electionType}）縣市不符`,
        code: 'CITY_MISMATCH',
        currentPlan: {
          city: plan.city,
          category: plan.category,
          name: plan.name,
        },
        requiredPlan: {
          city: dto.city,
          electionType: dto.electionType,
        },
        upgradeUrl: `/pricing?city=${encodeURIComponent(dto.city)}&electionType=${dto.electionType}`,
      });
    }

    // 驗證選舉類型是否對應
    const requiredCategory = ELECTION_TYPE_TO_PLAN_CATEGORY[dto.electionType as ElectionType];
    if (plan.category !== requiredCategory) {
      throw new BadRequestException({
        statusCode: 400,
        message: `您的訂閱方案（${plan.city}${PLAN_CATEGORY_LABELS[plan.category as PlanCategory] || plan.category}）與建立的選舉活動（${dto.city}${ELECTION_TYPE_LABELS[dto.electionType as ElectionType] || dto.electionType}）選舉類型不符`,
        code: 'ELECTION_TYPE_MISMATCH',
        currentPlan: {
          city: plan.city,
          category: plan.category,
          name: plan.name,
        },
        requiredPlan: {
          city: dto.city,
          electionType: dto.electionType,
        },
        upgradeUrl: `/pricing?city=${encodeURIComponent(dto.city)}&electionType=${dto.electionType}`,
      });
    }

    // 驗證通過
  }

  async findById(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
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
    });

    if (!campaign) {
      throw new NotFoundException('選舉活動不存在');
    }

    return campaign;
  }

  async update(id: string, userId: string, dto: UpdateCampaignDto) {
    await this.checkCampaignAccess(id, userId, [UserRole.ADMIN]);

    return this.prisma.campaign.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, userId: string) {
    const campaign = await this.findById(id);

    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('只有擁有者可以刪除選舉活動');
    }

    await this.prisma.campaign.delete({
      where: { id },
    });

    return { message: '選舉活動已刪除' };
  }

  async getTeamMembers(campaignId: string) {
    return this.prisma.teamMember.findMany({
      where: { campaignId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async inviteTeamMember(
    campaignId: string,
    inviterId: string,
    dto: InviteTeamMemberDto,
  ) {
    await this.checkCampaignAccess(campaignId, inviterId, [UserRole.ADMIN]);

    // 透過 email 或電話查詢使用者
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : {},
          dto.phone ? { phone: dto.phone } : {},
        ].filter(o => Object.keys(o).length > 0),
      },
    });

    if (!user) {
      throw new NotFoundException('找不到符合的使用者');
    }

    // 檢查是否已是團隊成員
    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        userId_campaignId: {
          userId: user.id,
          campaignId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('該使用者已是團隊成員');
    }

    return this.prisma.teamMember.create({
      data: {
        userId: user.id,
        campaignId,
        role: dto.role,
        invitedBy: inviterId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async removeTeamMember(campaignId: string, memberId: string, removerId: string) {
    await this.checkCampaignAccess(campaignId, removerId, [UserRole.ADMIN]);

    const member = await this.prisma.teamMember.findFirst({
      where: {
        id: memberId,
        campaignId,
      },
    });

    if (!member) {
      throw new NotFoundException('團隊成員不存在');
    }

    // 不能移除擁有者
    const campaign = await this.findById(campaignId);
    if (member.userId === campaign.ownerId) {
      throw new ForbiddenException('無法移除選舉活動擁有者');
    }

    await this.prisma.teamMember.delete({
      where: { id: memberId },
    });

    return { message: '已移除團隊成員' };
  }

  async updateMemberRole(
    campaignId: string,
    memberId: string,
    role: UserRole,
    updaterId: string,
  ) {
    await this.checkCampaignAccess(campaignId, updaterId, [UserRole.ADMIN]);

    return this.prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
    });
  }

  async getStats(campaignId: string) {
    const [voterStats, contactStats, stanceDistribution] = await Promise.all([
      this.prisma.voter.aggregate({
        where: { campaignId },
        _count: true,
        _avg: { influenceScore: true },
      }),
      this.prisma.contact.aggregate({
        where: { campaignId },
        _count: true,
      }),
      this.prisma.voter.groupBy({
        by: ['stance'],
        where: { campaignId },
        _count: true,
      }),
    ]);

    const contactedVoters = await this.prisma.voter.count({
      where: {
        campaignId,
        contactCount: { gt: 0 },
      },
    });

    return {
      totalVoters: voterStats._count,
      avgInfluenceScore: voterStats._avg.influenceScore || 0,
      totalContacts: contactStats._count,
      contactedVoters,
      contactRate: voterStats._count > 0 
        ? contactedVoters / voterStats._count 
        : 0,
      stanceDistribution: stanceDistribution.reduce(
        (acc, item) => ({
          ...acc,
          [item.stance]: item._count,
        }),
        {},
      ),
    };
  }

  async checkCampaignAccess(
    campaignId: string,
    userId: string,
    allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER],
  ) {
    // 超級管理員豁免：isSuperAdmin 可存取所有 campaign
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });

    if (user?.isSuperAdmin) {
      // 超級管理員直接放行，回傳虛擬 ADMIN 成員
      return { userId, campaignId, role: UserRole.ADMIN } as any;
    }

    const member = await this.prisma.teamMember.findUnique({
      where: {
        userId_campaignId: {
          userId,
          campaignId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('您沒有存取此選舉活動的權限');
    }

    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException('您的角色權限不足');
    }

    return member;
  }

  // ==================== 邀請連結功能 ====================

  /**
   * 生成邀請碼
   */
  private generateInviteCode(): string {
    return randomBytes(6).toString('hex'); // 12 字元
  }

  /**
   * 建立邀請連結
   */
  async createInviteLink(
    campaignId: string,
    creatorId: string,
    dto: CreateInviteLinkDto,
  ) {
    await this.checkCampaignAccess(campaignId, creatorId, [UserRole.ADMIN]);

    // 預設過期時間為 7 天後
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await this.prisma.campaignInvite.create({
      data: {
        campaignId,
        code: this.generateInviteCode(),
        role: dto.role || UserRole.VIEWER,
        createdBy: creatorId,
        expiresAt,
        maxUses: dto.maxUses,
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return invite;
  }

  /**
   * 取得 Campaign 的所有邀請連結
   */
  async getInviteLinks(campaignId: string, userId: string) {
    await this.checkCampaignAccess(campaignId, userId, [UserRole.ADMIN]);

    return this.prisma.campaignInvite.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * 停用邀請連結
   */
  async deactivateInviteLink(
    campaignId: string,
    inviteId: string,
    userId: string,
  ) {
    await this.checkCampaignAccess(campaignId, userId, [UserRole.ADMIN]);

    const invite = await this.prisma.campaignInvite.findFirst({
      where: {
        id: inviteId,
        campaignId,
      },
    });

    if (!invite) {
      throw new NotFoundException('邀請連結不存在');
    }

    return this.prisma.campaignInvite.update({
      where: { id: inviteId },
      data: { isActive: false },
    });
  }

  /**
   * 驗證邀請碼（公開 API）
   */
  async getInviteInfo(code: string) {
    const invite = await this.prisma.campaignInvite.findUnique({
      where: { code },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            electionType: true,
            city: true,
            district: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('邀請連結不存在或已失效');
    }

    if (!invite.isActive) {
      throw new BadRequestException('邀請連結已停用');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('邀請連結已過期');
    }

    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      throw new BadRequestException('邀請連結已達到使用上限');
    }

    return {
      code: invite.code,
      role: invite.role,
      expiresAt: invite.expiresAt,
      campaign: invite.campaign,
      inviter: invite.creator,
    };
  }

  /**
   * 透過邀請碼加入團隊
   */
  async joinByInviteCode(code: string, userId: string) {
    const invite = await this.prisma.campaignInvite.findUnique({
      where: { code },
      include: {
        campaign: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('邀請連結不存在或已失效');
    }

    if (!invite.isActive) {
      throw new BadRequestException('邀請連結已停用');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('邀請連結已過期');
    }

    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      throw new BadRequestException('邀請連結已達到使用上限');
    }

    // 檢查是否已是團隊成員
    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        userId_campaignId: {
          userId,
          campaignId: invite.campaignId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('您已經是此選舉活動的團隊成員');
    }

    // 使用交易確保資料一致性
    const [member] = await this.prisma.$transaction([
      // 建立團隊成員
      this.prisma.teamMember.create({
        data: {
          userId,
          campaignId: invite.campaignId,
          role: invite.role,
          invitedBy: invite.createdBy,
        },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      // 更新邀請使用次數
      this.prisma.campaignInvite.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    return {
      message: '已成功加入團隊',
      member,
    };
  }
}
