import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, ScheduleStatus, ScheduleItemStatus } from '@prisma/client';
import { CampaignsService } from '../campaigns/campaigns.service';
import { MapsService } from '../maps/maps.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { AddScheduleItemDto } from './dto/add-schedule-item.dto';

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private campaignsService: CampaignsService,
    private mapsService: MapsService,
  ) {}

  async create(userId: string, dto: CreateScheduleDto) {
    await this.campaignsService.checkCampaignAccess(
      dto.campaignId,
      userId,
      [UserRole.ADMIN, UserRole.EDITOR],
    );

    return this.prisma.schedule.create({
      data: {
        ...dto,
        userId,
        date: new Date(dto.date),
      },
    });
  }

  async findById(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: {
            voter: {
              select: {
                id: true,
                name: true,
                phone: true,
                address: true,
                influenceScore: true,
                stance: true,
                // 載入選民的關係資料
                relationshipsFrom: {
                  select: {
                    id: true,
                    relationType: true,
                    influenceWeight: true,
                    targetVoterId: true,
                    targetVoter: {
                      select: { id: true, name: true, stance: true },
                    },
                  },
                },
                relationshipsTo: {
                  select: {
                    id: true,
                    relationType: true,
                    influenceWeight: true,
                    sourceVoterId: true,
                    sourceVoter: {
                      select: { id: true, name: true, stance: true },
                    },
                  },
                },
              },
            },
            event: {
              select: { id: true, name: true, type: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, googleCalendarId: true },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('行程不存在');
    }

    // 取得行程中所有選民的 ID
    const voterIdsInSchedule = new Set(
      schedule.items
        .filter((item) => item.voter?.id)
        .map((item) => item.voter!.id),
    );

    // 處理每個 item，添加與行程內其他選民的關係
    const itemsWithRelations = schedule.items.map((item) => {
      if (!item.voter) return item;

      const voter = item.voter;
      const allRelationships = [
        ...(voter.relationshipsFrom || []).map((r: any) => ({
          id: r.id,
          relationType: r.relationType,
          influenceWeight: r.influenceWeight,
          relatedVoterId: r.targetVoterId,
          relatedVoter: r.targetVoter,
        })),
        ...(voter.relationshipsTo || []).map((r: any) => ({
          id: r.id,
          relationType: r.relationType,
          influenceWeight: r.influenceWeight,
          relatedVoterId: r.sourceVoterId,
          relatedVoter: r.sourceVoter,
        })),
      ];

      // 篩選出與行程內其他選民的關係
      const relationsInSchedule = allRelationships.filter(
        (rel) => voterIdsInSchedule.has(rel.relatedVoterId) && rel.relatedVoterId !== voter.id,
      );

      return {
        ...item,
        voter: {
          ...voter,
          relationsInSchedule,
        },
      };
    });

    return {
      ...schedule,
      items: itemsWithRelations,
    };
  }

  async findByDate(campaignId: string, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.schedule.findMany({
      where: {
        campaignId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async addItem(scheduleId: string, dto: AddScheduleItemDto) {
    const schedule = await this.findById(scheduleId);

    // 取得最大順序
    const maxOrder = await this.prisma.scheduleItem.findFirst({
      where: { scheduleId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newOrder = (maxOrder?.order ?? 0) + 1;

    return this.prisma.scheduleItem.create({
      data: {
        ...dto,
        scheduleId,
        order: newOrder,
        plannedTime: dto.plannedTime ? new Date(dto.plannedTime) : undefined,
      },
    });
  }

  async updateItemStatus(itemId: string, status: ScheduleItemStatus) {
    return this.prisma.scheduleItem.update({
      where: { id: itemId },
      data: {
        status,
        actualTime: status === ScheduleItemStatus.IN_PROGRESS ? new Date() : undefined,
      },
    });
  }

  async removeItem(itemId: string) {
    await this.prisma.scheduleItem.delete({ where: { id: itemId } });
    return { message: '行程項目已刪除' };
  }

  async reorderItems(scheduleId: string, itemIds: string[]) {
    const updates = itemIds.map((id, index) =>
      this.prisma.scheduleItem.update({
        where: { id },
        data: { order: index + 1 },
      }),
    );

    await Promise.all(updates);
    return this.findById(scheduleId);
  }

  async optimizeRoute(scheduleId: string, startLocation: { lat: number; lng: number }) {
    const schedule = await this.findById(scheduleId);
    const items = schedule.items.filter(item => item.locationLat && item.locationLng);

    if (items.length < 2) {
      return schedule;
    }

    // 使用 Google Maps Distance Matrix 或簡單的最近鄰算法
    // 這裡使用簡單的最近鄰算法
    const optimized: typeof items = [];
    const remaining = [...items];
    let currentLocation = startLocation;

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        const distance = this.calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          item.locationLat!,
          item.locationLng!,
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      const nearest = remaining.splice(nearestIndex, 1)[0];
      optimized.push(nearest);
      currentLocation = { lat: nearest.locationLat!, lng: nearest.locationLng! };
    }

    // 更新順序
    await this.reorderItems(scheduleId, optimized.map(item => item.id));

    return this.findById(scheduleId);
  }

  async getSuggestions(campaignId: string, location: { lat: number; lng: number }, limit = 10) {
    // 查詢附近且高影響力、尚未接觸的選民
    const voters = await this.prisma.voter.findMany({
      where: {
        campaignId,
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: [
        { influenceScore: 'desc' },
        { contactCount: 'asc' },
      ],
    });

    // 計算距離並排序
    const suggestions = voters
      .map(voter => ({
        ...voter,
        distance: this.calculateDistance(
          location.lat,
          location.lng,
          voter.latitude!,
          voter.longitude!,
        ),
      }))
      .filter(v => v.distance <= 2000) // 2公里內
      .sort((a, b) => {
        // 綜合影響力和距離排序
        const scoreA = a.influenceScore / 100 - a.distance / 2000;
        const scoreB = b.influenceScore / 100 - b.distance / 2000;
        return scoreB - scoreA;
      })
      .slice(0, limit)
      .map(voter => ({
        voterId: voter.id,
        voterName: voter.name,
        address: voter.address,
        location: { latitude: voter.latitude, longitude: voter.longitude },
        distance: Math.round(voter.distance),
        influenceScore: voter.influenceScore,
        stance: voter.stance,
        lastContactAt: voter.lastContactAt,
        reason: voter.contactCount === 0
          ? '尚未接觸'
          : voter.influenceScore >= 70
          ? '高影響力'
          : '附近選民',
        priority: Math.round((voter.influenceScore / 100) * 10),
      }));

    return suggestions;
  }

  async updateStatus(id: string, status: ScheduleStatus) {
    return this.prisma.schedule.update({
      where: { id },
      data: { status },
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
