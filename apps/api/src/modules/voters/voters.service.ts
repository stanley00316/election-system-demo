import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import { CampaignsService } from '../campaigns/campaigns.service';
import { MapsService } from '../maps/maps.service';
import { CreateVoterDto } from './dto/create-voter.dto';
import { UpdateVoterDto } from './dto/update-voter.dto';
import { VoterFilterDto } from './dto/voter-filter.dto';
import { CreateRelationshipDto, RecordMeetingDto, BatchCreateRelationshipsDto } from './dto/create-relationship.dto';

@Injectable()
export class VotersService {
  constructor(
    private prisma: PrismaService,
    private campaignsService: CampaignsService,
    private mapsService: MapsService,
  ) {}

  async create(userId: string, dto: CreateVoterDto) {
    await this.campaignsService.checkCampaignAccess(
      dto.campaignId,
      userId,
      [UserRole.ADMIN, UserRole.EDITOR],
    );

    // 如果有地址但沒有座標，進行 geocoding
    let latitude = dto.latitude;
    let longitude = dto.longitude;

    if (dto.address && (!latitude || !longitude)) {
      try {
        const coords = await this.mapsService.geocode(dto.address);
        latitude = coords.latitude;
        longitude = coords.longitude;
      } catch (error) {
        // Geocoding 失敗不影響建立選民
        console.warn('Geocoding failed for address:', dto.address);
      }
    }

    return this.prisma.voter.create({
      data: {
        ...dto,
        latitude,
        longitude,
        createdBy: userId,
        tags: dto.tags || [],
      },
    });
  }

  async findById(id: string) {
    const voter = await this.prisma.voter.findUnique({
      where: { id },
      include: {
        contacts: {
          orderBy: { contactDate: 'desc' },
          take: 10,
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        relationshipsFrom: {
          include: {
            targetVoter: {
              select: { id: true, name: true, stance: true },
            },
          },
        },
        relationshipsTo: {
          include: {
            sourceVoter: {
              select: { id: true, name: true, stance: true },
            },
          },
        },
        eventAttendances: {
          include: {
            event: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!voter) {
      throw new NotFoundException('選民不存在');
    }

    return voter;
  }

  async findAll(filter: VoterFilterDto) {
    const {
      campaignId,
      search,
      city,
      district,
      village,
      stance,
      politicalParty,
      minInfluenceScore,
      maxInfluenceScore,
      tags,
      hasContact,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const where: Prisma.VoterWhereInput = {
      campaignId,
    };

    // 搜尋條件
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 區域篩選
    if (city) where.city = city;
    if (district) where.districtName = district;
    if (village) where.village = village;

    // 政治傾向篩選
    if (stance && stance.length > 0) {
      where.stance = { in: stance };
    }

    // 政黨篩選
    if (politicalParty && politicalParty.length > 0) {
      where.politicalParty = { in: politicalParty };
    }

    // 影響力分數篩選
    if (minInfluenceScore !== undefined) {
      where.influenceScore = { ...where.influenceScore as any, gte: minInfluenceScore };
    }
    if (maxInfluenceScore !== undefined) {
      where.influenceScore = { ...where.influenceScore as any, lte: maxInfluenceScore };
    }

    // 標籤篩選
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    // 是否有接觸紀錄
    if (hasContact !== undefined) {
      where.contactCount = hasContact ? { gt: 0 } : { equals: 0 };
    }

    const [total, voters] = await Promise.all([
      this.prisma.voter.count({ where }),
      this.prisma.voter.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { contacts: true },
          },
        },
      }),
    ]);

    return {
      data: voters,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, userId: string, dto: UpdateVoterDto) {
    const voter = await this.findById(id);
    
    await this.campaignsService.checkCampaignAccess(
      voter.campaignId,
      userId,
      [UserRole.ADMIN, UserRole.EDITOR],
    );

    // 如果地址更新，重新 geocoding
    let latitude = dto.latitude;
    let longitude = dto.longitude;

    if (dto.address && dto.address !== voter.address && (!latitude || !longitude)) {
      try {
        const coords = await this.mapsService.geocode(dto.address);
        latitude = coords.latitude;
        longitude = coords.longitude;
      } catch (error) {
        console.warn('Geocoding failed for address:', dto.address);
      }
    }

    return this.prisma.voter.update({
      where: { id },
      data: {
        ...dto,
        latitude,
        longitude,
      },
    });
  }

  async delete(id: string, userId: string) {
    const voter = await this.findById(id);
    
    await this.campaignsService.checkCampaignAccess(
      voter.campaignId,
      userId,
      [UserRole.ADMIN],
    );

    await this.prisma.voter.delete({ where: { id } });
    return { message: '選民已刪除' };
  }

  async searchByLine(campaignId: string, lineId?: string, lineUrl?: string) {
    if (!lineId && !lineUrl) {
      throw new BadRequestException('請提供 LINE ID 或 LINE URL');
    }

    const where: Prisma.VoterWhereInput = {
      campaignId,
      OR: [],
    };

    if (lineId) {
      (where.OR as Prisma.VoterWhereInput[]).push({ lineId });
    }

    if (lineUrl) {
      (where.OR as Prisma.VoterWhereInput[]).push({ lineUrl });
    }

    const voters = await this.prisma.voter.findMany({
      where,
      include: {
        contacts: {
          orderBy: { contactDate: 'desc' },
          take: 5,
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        creator: {
          select: { id: true, name: true },
        },
        _count: {
          select: { contacts: true },
        },
      },
    });

    return {
      found: voters.length > 0,
      voters,
    };
  }

  async findNearby(
    campaignId: string,
    latitude: number,
    longitude: number,
    radius: number = 500,
    limit: number = 20,
  ) {
    // 使用 PostGIS 進行地理查詢
    // 這裡使用簡化版本，實際應使用 ST_DWithin
    const voters = await this.prisma.voter.findMany({
      where: {
        campaignId,
        latitude: { not: null },
        longitude: { not: null },
      },
    });

    // 計算距離並篩選
    const nearbyVoters = voters
      .map(voter => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          voter.latitude!,
          voter.longitude!,
        );
        return { ...voter, distance };
      })
      .filter(v => v.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return nearbyVoters;
  }

  async createRelationship(dto: CreateRelationshipDto) {
    // 檢查兩個選民是否存在且屬於同一活動
    const [source, target] = await Promise.all([
      this.prisma.voter.findUnique({ where: { id: dto.sourceVoterId } }),
      this.prisma.voter.findUnique({ where: { id: dto.targetVoterId } }),
    ]);

    if (!source || !target) {
      throw new NotFoundException('選民不存在');
    }

    if (source.campaignId !== target.campaignId) {
      throw new BadRequestException('選民必須屬於同一選舉活動');
    }

    const now = new Date();

    return this.prisma.voterRelationship.create({
      data: {
        sourceVoterId: dto.sourceVoterId,
        targetVoterId: dto.targetVoterId,
        relationType: dto.relationType,
        influenceWeight: dto.influenceWeight,
        notes: dto.notes,
        meetingCount: 1,
        firstMetAt: now,
        lastMetAt: now,
        firstMetEventId: dto.eventId,
      },
    });
  }

  async getRelationships(voterId: string) {
    return this.prisma.voterRelationship.findMany({
      where: {
        OR: [
          { sourceVoterId: voterId },
          { targetVoterId: voterId },
        ],
      },
      include: {
        sourceVoter: {
          select: { id: true, name: true, stance: true, influenceScore: true },
        },
        targetVoter: {
          select: { id: true, name: true, stance: true, influenceScore: true },
        },
        firstMetEvent: {
          select: { id: true, name: true, startTime: true },
        },
      },
    });
  }

  async deleteRelationship(relationshipId: string) {
    await this.prisma.voterRelationship.delete({
      where: { id: relationshipId },
    });
    return { message: '關係已刪除' };
  }

  // 記錄見面（若關係不存在則自動建立）
  async recordMeeting(dto: RecordMeetingDto, userId: string) {
    const { voterAId, voterBId, relationType, eventId, location, notes, meetingDate } = dto;

    // 確保 A ID 小於 B ID，統一關係方向
    const [sourceId, targetId] = voterAId < voterBId 
      ? [voterAId, voterBId] 
      : [voterBId, voterAId];

    // 檢查選民是否存在
    const [source, target] = await Promise.all([
      this.prisma.voter.findUnique({ where: { id: sourceId } }),
      this.prisma.voter.findUnique({ where: { id: targetId } }),
    ]);

    if (!source || !target) {
      throw new NotFoundException('選民不存在');
    }

    if (source.campaignId !== target.campaignId) {
      throw new BadRequestException('選民必須屬於同一選舉活動');
    }

    const now = meetingDate ? new Date(meetingDate) : new Date();

    // 查找是否已有關係
    let relationship = await this.prisma.voterRelationship.findUnique({
      where: {
        sourceVoterId_targetVoterId: {
          sourceVoterId: sourceId,
          targetVoterId: targetId,
        },
      },
    });

    if (relationship) {
      // 更新現有關係的見面次數
      relationship = await this.prisma.voterRelationship.update({
        where: { id: relationship.id },
        data: {
          meetingCount: { increment: 1 },
          lastMetAt: now,
          // 如果關係類型不同，可選擇是否更新
          relationType: relationType || relationship.relationType,
        },
      });
    } else {
      // 建立新關係
      relationship = await this.prisma.voterRelationship.create({
        data: {
          sourceVoterId: sourceId,
          targetVoterId: targetId,
          relationType,
          meetingCount: 1,
          firstMetAt: now,
          lastMetAt: now,
          firstMetEventId: eventId,
        },
      });
    }

    // 建立見面紀錄
    const meeting = await this.prisma.relationshipMeeting.create({
      data: {
        relationshipId: relationship.id,
        eventId,
        meetingDate: now,
        location,
        notes,
        recordedBy: userId,
      },
      include: {
        relationship: {
          include: {
            sourceVoter: { select: { id: true, name: true } },
            targetVoter: { select: { id: true, name: true } },
          },
        },
        event: { select: { id: true, name: true } },
      },
    });

    return meeting;
  }

  // 批量建立關係
  async batchCreateRelationships(dto: BatchCreateRelationshipsDto, userId: string) {
    const { relationships, eventId } = dto;
    const results: any[] = [];
    const errors: any[] = [];

    for (const item of relationships) {
      try {
        const result = await this.recordMeeting({
          voterAId: item.voterAId,
          voterBId: item.voterBId,
          relationType: item.relationType,
          eventId,
          notes: item.notes,
        }, userId);
        results.push(result);
      } catch (error) {
        errors.push({
          voterAId: item.voterAId,
          voterBId: item.voterBId,
          error: error.message,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  // 取得活動中發現的關係
  async getRelationshipsByEvent(eventId: string) {
    // 取得在此活動中首次發現的關係
    const firstMetRelationships = await this.prisma.voterRelationship.findMany({
      where: { firstMetEventId: eventId },
      include: {
        sourceVoter: {
          select: { id: true, name: true, stance: true, phone: true },
        },
        targetVoter: {
          select: { id: true, name: true, stance: true, phone: true },
        },
      },
    });

    // 取得在此活動中的見面紀錄
    const meetingsAtEvent = await this.prisma.relationshipMeeting.findMany({
      where: { eventId },
      include: {
        relationship: {
          include: {
            sourceVoter: {
              select: { id: true, name: true, stance: true, phone: true },
            },
            targetVoter: {
              select: { id: true, name: true, stance: true, phone: true },
            },
          },
        },
        recorder: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      firstMetRelationships,
      meetingsAtEvent,
      totalRelationships: firstMetRelationships.length,
      totalMeetings: meetingsAtEvent.length,
    };
  }

  // 取得關係的見面紀錄
  async getRelationshipMeetings(relationshipId: string) {
    return this.prisma.relationshipMeeting.findMany({
      where: { relationshipId },
      include: {
        event: { select: { id: true, name: true, startTime: true } },
        recorder: { select: { id: true, name: true } },
      },
      orderBy: { meetingDate: 'desc' },
    });
  }

  async findDuplicates(campaignId: string) {
    // 查詢可能重複的選民（相同姓名或電話）
    const voters = await this.prisma.voter.findMany({
      where: { campaignId },
      select: { id: true, name: true, phone: true, address: true },
    });

    const duplicates: Array<{
      reason: string;
      voters: typeof voters;
    }> = [];

    // 按姓名分組
    const nameGroups = new Map<string, typeof voters>();
    for (const voter of voters) {
      const key = voter.name.trim().toLowerCase();
      if (!nameGroups.has(key)) {
        nameGroups.set(key, []);
      }
      nameGroups.get(key)!.push(voter);
    }

    for (const [name, group] of nameGroups) {
      if (group.length > 1) {
        duplicates.push({
          reason: `相同姓名: ${name}`,
          voters: group,
        });
      }
    }

    // 按電話分組
    const phoneGroups = new Map<string, typeof voters>();
    for (const voter of voters) {
      if (voter.phone) {
        const key = voter.phone.replace(/[-\s]/g, '');
        if (!phoneGroups.has(key)) {
          phoneGroups.set(key, []);
        }
        phoneGroups.get(key)!.push(voter);
      }
    }

    for (const [phone, group] of phoneGroups) {
      if (group.length > 1) {
        duplicates.push({
          reason: `相同電話: ${phone}`,
          voters: group,
        });
      }
    }

    return duplicates;
  }

  async mergeVoters(primaryId: string, secondaryId: string, userId: string) {
    const [primary, secondary] = await Promise.all([
      this.findById(primaryId),
      this.findById(secondaryId),
    ]);

    if (primary.campaignId !== secondary.campaignId) {
      throw new BadRequestException('選民必須屬於同一選舉活動');
    }

    await this.campaignsService.checkCampaignAccess(
      primary.campaignId,
      userId,
      [UserRole.ADMIN],
    );

    // 將次要選民的接觸紀錄轉移到主要選民
    await this.prisma.contact.updateMany({
      where: { voterId: secondaryId },
      data: { voterId: primaryId },
    });

    // 轉移關係
    await this.prisma.voterRelationship.updateMany({
      where: { sourceVoterId: secondaryId },
      data: { sourceVoterId: primaryId },
    });
    await this.prisma.voterRelationship.updateMany({
      where: { targetVoterId: secondaryId },
      data: { targetVoterId: primaryId },
    });

    // 更新接觸次數
    const newContactCount = primary.contactCount + secondary.contactCount;
    await this.prisma.voter.update({
      where: { id: primaryId },
      data: { contactCount: newContactCount },
    });

    // 刪除次要選民
    await this.prisma.voter.delete({ where: { id: secondaryId } });

    return this.findById(primaryId);
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // 地球半徑（公尺）
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
