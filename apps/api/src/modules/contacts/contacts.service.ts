import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import { CampaignsService } from '../campaigns/campaigns.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactFilterDto } from './dto/contact-filter.dto';

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private campaignsService: CampaignsService,
  ) {}

  async create(userId: string, dto: CreateContactDto) {
    await this.campaignsService.checkCampaignAccess(
      dto.campaignId,
      userId,
      [UserRole.ADMIN, UserRole.EDITOR],
    );

    // 建立接觸紀錄
    const contact = await this.prisma.contact.create({
      data: {
        ...dto,
        userId,
        contactDate: dto.contactDate ? new Date(dto.contactDate) : new Date(),
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      },
    });

    // 更新選民的接觸次數和最後接觸時間
    await this.prisma.voter.update({
      where: { id: dto.voterId },
      data: {
        contactCount: { increment: 1 },
        lastContactAt: new Date(),
      },
    });

    return contact;
  }

  async findById(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        voter: {
          select: { id: true, name: true, phone: true, address: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('接觸紀錄不存在');
    }

    return contact;
  }

  async findAll(filter: ContactFilterDto) {
    const {
      campaignId,
      voterId,
      userId,
      type,
      outcome,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'contactDate',
      sortOrder = 'desc',
    } = filter;

    const where: Prisma.ContactWhereInput = {
      campaignId,
    };

    if (voterId) where.voterId = voterId;
    if (userId) where.userId = userId;
    if (type && type.length > 0) where.type = { in: type };
    if (outcome && outcome.length > 0) where.outcome = { in: outcome };
    if (startDate) where.contactDate = { ...where.contactDate as any, gte: new Date(startDate) };
    if (endDate) where.contactDate = { ...where.contactDate as any, lte: new Date(endDate) };

    const [total, contacts] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          voter: {
            select: { id: true, name: true, phone: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return {
      data: contacts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByVoter(voterId: string, limit = 20) {
    return this.prisma.contact.findMany({
      where: { voterId },
      orderBy: { contactDate: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateContactDto) {
    const contact = await this.findById(id);

    await this.campaignsService.checkCampaignAccess(
      contact.campaignId,
      userId,
      [UserRole.ADMIN, UserRole.EDITOR],
    );

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...dto,
        contactDate: dto.contactDate ? new Date(dto.contactDate) : undefined,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      },
    });
  }

  async delete(id: string, userId: string) {
    const contact = await this.findById(id);

    await this.campaignsService.checkCampaignAccess(
      contact.campaignId,
      userId,
      [UserRole.ADMIN],
    );

    // 更新選民的接觸次數
    await this.prisma.voter.update({
      where: { id: contact.voterId },
      data: {
        contactCount: { decrement: 1 },
      },
    });

    await this.prisma.contact.delete({ where: { id } });
    return { message: '接觸紀錄已刪除' };
  }

  async getSummary(campaignId: string) {
    const [
      totalContacts,
      byType,
      byOutcome,
      recentContacts,
      todayContacts,
      weekContacts,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { campaignId } }),
      this.prisma.contact.groupBy({
        by: ['type'],
        where: { campaignId },
        _count: true,
      }),
      this.prisma.contact.groupBy({
        by: ['outcome'],
        where: { campaignId },
        _count: true,
      }),
      this.prisma.contact.findMany({
        where: { campaignId },
        orderBy: { contactDate: 'desc' },
        take: 10,
        include: {
          voter: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.contact.count({
        where: {
          campaignId,
          contactDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.contact.count({
        where: {
          campaignId,
          contactDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalContacts,
      todayContacts,
      weekContacts,
      byType: byType.reduce((acc, item) => ({ ...acc, [item.type]: item._count }), {}),
      byOutcome: byOutcome.reduce((acc, item) => ({ ...acc, [item.outcome]: item._count }), {}),
      recentContacts,
    };
  }

  async getFollowUps(campaignId: string, userId?: string) {
    const where: Prisma.ContactWhereInput = {
      campaignId,
      followUpDate: {
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 一週內
        gte: new Date(),
      },
    };

    if (userId) where.userId = userId;

    return this.prisma.contact.findMany({
      where,
      orderBy: { followUpDate: 'asc' },
      include: {
        voter: {
          select: { id: true, name: true, phone: true, address: true },
        },
      },
    });
  }

  // ==================== OWASP A01: 存取控制方法 ====================

  /**
   * 委託給 CampaignsService 的 checkCampaignAccess
   */
  async checkCampaignAccess(campaignId: string, userId: string) {
    return this.campaignsService.checkCampaignAccess(campaignId, userId);
  }

  /**
   * 取得接觸紀錄詳情並驗證 campaign 存取權限
   */
  async findByIdWithAccessCheck(id: string, userId: string) {
    const contact = await this.findById(id);
    await this.campaignsService.checkCampaignAccess(contact.campaignId, userId);
    return contact;
  }

  /**
   * 驗證使用者是否有權存取指定選民所屬的 campaign
   */
  async checkVoterAccess(voterId: string, userId: string) {
    const voter = await this.prisma.voter.findUnique({
      where: { id: voterId },
      select: { campaignId: true },
    });
    if (!voter) {
      throw new NotFoundException('選民不存在');
    }
    await this.campaignsService.checkCampaignAccess(voter.campaignId, userId);
  }
}
