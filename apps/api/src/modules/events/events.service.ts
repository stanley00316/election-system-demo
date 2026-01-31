import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, AttendeeStatus } from '@prisma/client';
import { CampaignsService } from '../campaigns/campaigns.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private campaignsService: CampaignsService,
  ) {}

  async create(userId: string, dto: CreateEventDto) {
    await this.campaignsService.checkCampaignAccess(
      dto.campaignId,
      userId,
      [UserRole.ADMIN, UserRole.EDITOR],
    );

    return this.prisma.event.create({
      data: {
        ...dto,
        startTime: new Date(dto.startTime),
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        createdBy: userId,
      },
    });
  }

  async findById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        host: {
          select: { id: true, name: true, phone: true, address: true },
        },
        attendees: {
          include: {
            voter: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
        _count: {
          select: { attendees: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('活動不存在');
    }

    return event;
  }

  async findAll(campaignId: string, options?: {
    type?: string[];
    status?: string[];
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = { campaignId };

    if (options?.type) where.type = { in: options.type };
    if (options?.status) where.status = { in: options.status };
    if (options?.startDate) where.startTime = { gte: options.startDate };
    if (options?.endDate) where.startTime = { ...where.startTime, lte: options.endDate };

    return this.prisma.event.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: {
        host: {
          select: { id: true, name: true },
        },
        _count: {
          select: { attendees: true },
        },
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateEventDto) {
    const event = await this.findById(id);

    await this.campaignsService.checkCampaignAccess(
      event.campaignId,
      userId,
      [UserRole.ADMIN, UserRole.EDITOR],
    );

    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      },
    });
  }

  async delete(id: string, userId: string) {
    const event = await this.findById(id);

    await this.campaignsService.checkCampaignAccess(
      event.campaignId,
      userId,
      [UserRole.ADMIN],
    );

    await this.prisma.event.delete({ where: { id } });
    return { message: '活動已刪除' };
  }

  async addAttendee(eventId: string, voterId: string, invitedBy?: string) {
    return this.prisma.eventAttendee.create({
      data: {
        eventId,
        voterId,
        invitedBy,
        status: AttendeeStatus.INVITED,
      },
    });
  }

  async updateAttendeeStatus(eventId: string, voterId: string, status: AttendeeStatus) {
    const attendee = await this.prisma.eventAttendee.findUnique({
      where: {
        eventId_voterId: { eventId, voterId },
      },
    });

    if (!attendee) {
      throw new NotFoundException('參加者不存在');
    }

    return this.prisma.eventAttendee.update({
      where: { id: attendee.id },
      data: {
        status,
        checkedInAt: status === AttendeeStatus.ATTENDED ? new Date() : undefined,
      },
    });
  }

  async removeAttendee(eventId: string, voterId: string) {
    await this.prisma.eventAttendee.delete({
      where: {
        eventId_voterId: { eventId, voterId },
      },
    });
    return { message: '已移除參加者' };
  }

  async getAttendees(eventId: string) {
    return this.prisma.eventAttendee.findMany({
      where: { eventId },
      include: {
        voter: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            stance: true,
          },
        },
      },
    });
  }

  async checkIn(eventId: string, voterId: string) {
    return this.updateAttendeeStatus(eventId, voterId, AttendeeStatus.ATTENDED);
  }
}
