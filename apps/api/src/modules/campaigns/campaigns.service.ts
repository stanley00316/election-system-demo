import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { CreateInviteLinkDto } from './dto/create-invite-link.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateCampaignDto) {
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
