import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PoliticalStance } from '@prisma/client';

@Injectable()
export class AnalysisService {
  constructor(private prisma: PrismaService) {}

  async getOverview(campaignId: string) {
    const [voterStats, contactStats, stanceDistribution] = await Promise.all([
      this.getVoterStats(campaignId),
      this.getContactStats(campaignId),
      this.getStanceDistribution(campaignId),
    ]);

    return {
      campaignId,
      timestamp: new Date(),
      voterStats,
      contactStats,
      stanceDistribution,
    };
  }

  async getVoterStats(campaignId: string) {
    const [total, avgInfluence, highInfluence] = await Promise.all([
      this.prisma.voter.count({ where: { campaignId } }),
      this.prisma.voter.aggregate({
        where: { campaignId },
        _avg: { influenceScore: true },
      }),
      this.prisma.voter.count({
        where: { campaignId, influenceScore: { gte: 70 } },
      }),
    ]);

    return {
      totalVoters: total,
      avgInfluenceScore: avgInfluence._avg.influenceScore || 0,
      highInfluenceCount: highInfluence,
    };
  }

  async getContactStats(campaignId: string) {
    const [total, byType, byOutcome, uniqueContacted] = await Promise.all([
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
      this.prisma.voter.count({
        where: { campaignId, contactCount: { gt: 0 } },
      }),
    ]);

    const totalVoters = await this.prisma.voter.count({ where: { campaignId } });

    return {
      totalContacts: total,
      uniqueVotersContacted: uniqueContacted,
      contactRate: totalVoters > 0 ? uniqueContacted / totalVoters : 0,
      byType: byType.reduce((acc, t) => ({ ...acc, [t.type]: t._count }), {}),
      byOutcome: byOutcome.reduce((acc, o) => ({ ...acc, [o.outcome]: o._count }), {}),
    };
  }

  async getStanceDistribution(campaignId: string) {
    const distribution = await this.prisma.voter.groupBy({
      by: ['stance'],
      where: { campaignId },
      _count: true,
    });

    const result: Record<string, number> = {
      STRONG_SUPPORT: 0,
      SUPPORT: 0,
      LEAN_SUPPORT: 0,
      NEUTRAL: 0,
      UNDECIDED: 0,
      LEAN_OPPOSE: 0,
      OPPOSE: 0,
      STRONG_OPPOSE: 0,
    };

    for (const item of distribution) {
      result[item.stance] = item._count;
    }

    return result;
  }

  async getDistrictAnalysis(campaignId: string) {
    // 取得活動選區設定
    const campaign = await this.prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
      select: { city: true, district: true },
    });

    // 僅統計候選人所在縣市
    const byCity = await this.prisma.voter.groupBy({
      by: ['city', 'stance'],
      where: { campaignId, city: campaign.city },
      _count: true,
    });

    // 依選區層級決定篩選與分組方式
    let byDistrict: any[];
    let groupByField: 'districtName' | 'village' = 'districtName';

    if (campaign.district) {
      // 有區：篩選該區，依里分組
      groupByField = 'village';
      byDistrict = await (this.prisma.voter.groupBy as any)({
        by: ['village', 'stance'],
        where: {
          campaignId,
          city: campaign.city,
          districtName: campaign.district,
          village: { not: null },
        },
        _count: true,
      });
    } else {
      // 無區：篩選該市，依區分組
      byDistrict = await (this.prisma.voter.groupBy as any)({
        by: ['districtName', 'stance'],
        where: {
          campaignId,
          city: campaign.city,
          districtName: { not: null },
        },
        _count: true,
      });
    }

    // 整理資料
    const cityStats = this.aggregateByRegion(byCity, 'city');
    const districtStats = this.aggregateByRegion(byDistrict, groupByField);

    return {
      byCity: cityStats,
      byDistrict: districtStats,
      // 回傳篩選資訊供前端顯示
      filter: {
        city: campaign.city,
        district: campaign.district || null,
      },
    };
  }

  async getTrendAnalysis(campaignId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 每日新增選民
    const dailyVoters = await this.prisma.voter.groupBy({
      by: ['createdAt'],
      where: {
        campaignId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // 每日接觸紀錄
    const dailyContacts = await this.prisma.contact.groupBy({
      by: ['contactDate'],
      where: {
        campaignId,
        contactDate: { gte: startDate },
      },
      _count: true,
    });

    return {
      period: { start: startDate, end: new Date() },
      dailyVoters: this.aggregateByDay(dailyVoters, 'createdAt'),
      dailyContacts: this.aggregateByDay(dailyContacts, 'contactDate'),
    };
  }

  async getWinProbability(campaignId: string) {
    const [stanceDistribution, voterCount] = await Promise.all([
      this.getStanceDistribution(campaignId),
      this.prisma.voter.count({ where: { campaignId } }),
    ]);

    // 簡化的勝選機率計算
    // 實際應用中應該更複雜，考慮歷史數據、對手等因素
    const supportVotes =
      stanceDistribution.STRONG_SUPPORT * 0.95 +
      stanceDistribution.SUPPORT * 0.85 +
      stanceDistribution.LEAN_SUPPORT * 0.65 +
      stanceDistribution.NEUTRAL * 0.5 +
      stanceDistribution.UNDECIDED * 0.4 +
      stanceDistribution.LEAN_OPPOSE * 0.2 +
      stanceDistribution.OPPOSE * 0.1 +
      stanceDistribution.STRONG_OPPOSE * 0.02;

    const estimatedSupportRate = voterCount > 0 ? supportVotes / voterCount : 0;

    // 假設需要 50% 以上才能贏
    const probability = Math.min(Math.max(estimatedSupportRate * 2 - 0.5, 0), 1);

    let scenario: string;
    if (probability >= 0.7) scenario = 'STRONG_WIN';
    else if (probability >= 0.55) scenario = 'LIKELY_WIN';
    else if (probability >= 0.45) scenario = 'TOSS_UP';
    else if (probability >= 0.3) scenario = 'LIKELY_LOSE';
    else scenario = 'STRONG_LOSE';

    return {
      probability,
      confidence: Math.min(voterCount / 1000, 1), // 資料越多信心越高
      estimatedSupportRate,
      scenario,
      factors: [
        {
          name: '強力支持者',
          impact: stanceDistribution.STRONG_SUPPORT * 2,
          description: `${stanceDistribution.STRONG_SUPPORT} 位強力支持者`,
        },
        {
          name: '中立選民',
          impact: -stanceDistribution.NEUTRAL,
          description: `${stanceDistribution.NEUTRAL} 位中立選民待爭取`,
        },
        {
          name: '反對者',
          impact: -(stanceDistribution.OPPOSE + stanceDistribution.STRONG_OPPOSE) * 2,
          description: `${stanceDistribution.OPPOSE + stanceDistribution.STRONG_OPPOSE} 位反對者`,
        },
      ],
    };
  }

  async getInfluenceAnalysis(campaignId: string) {
    // 取得高影響力選民
    const topInfluencers = await this.prisma.voter.findMany({
      where: { campaignId },
      orderBy: { influenceScore: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        influenceScore: true,
        stance: true,
        contactCount: true,
        relationshipsFrom: {
          include: {
            targetVoter: {
              select: { id: true, name: true, stance: true },
            },
          },
        },
      },
    });

    // 未表態的高影響力選民
    const uncommittedInfluencers = await this.prisma.voter.findMany({
      where: {
        campaignId,
        influenceScore: { gte: 50 },
        stance: { in: [PoliticalStance.NEUTRAL, PoliticalStance.UNDECIDED] },
      },
      orderBy: { influenceScore: 'desc' },
      take: 10,
    });

    return {
      topInfluencers: topInfluencers.map(v => ({
        voterId: v.id,
        voterName: v.name,
        influenceScore: v.influenceScore,
        stance: v.stance,
        contactCount: v.contactCount,
        connections: v.relationshipsFrom.length,
      })),
      uncommittedInfluencers,
      priorityVisits: uncommittedInfluencers.slice(0, 5),
    };
  }

  async getHeatmapData(campaignId: string) {
    const voters = await this.prisma.voter.findMany({
      where: {
        campaignId,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        latitude: true,
        longitude: true,
        stance: true,
        influenceScore: true,
      },
    });

    // 計算權重（支持度 + 影響力）
    const points = voters.map(v => {
      const stanceWeight = this.getStanceWeight(v.stance);
      return {
        latitude: v.latitude!,
        longitude: v.longitude!,
        weight: (stanceWeight + v.influenceScore / 100) / 2,
      };
    });

    // 計算邊界
    const lats = points.map(p => p.latitude);
    const lngs = points.map(p => p.longitude);

    return {
      points,
      bounds: {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
      },
    };
  }

  private aggregateByRegion(data: any[], field: string) {
    const result: Record<string, any> = {};

    for (const item of data) {
      const region = item[field];
      if (!region) continue;

      if (!result[region]) {
        result[region] = {
          name: region,
          total: 0,
          support: 0,
          neutral: 0,
          oppose: 0,
        };
      }

      result[region].total += item._count;

      if (['STRONG_SUPPORT', 'SUPPORT', 'LEAN_SUPPORT'].includes(item.stance)) {
        result[region].support += item._count;
      } else if (['NEUTRAL', 'UNDECIDED'].includes(item.stance)) {
        result[region].neutral += item._count;
      } else {
        result[region].oppose += item._count;
      }
    }

    // 計算支持率
    return Object.values(result).map((r: any) => ({
      ...r,
      supportRate: r.total > 0 ? r.support / r.total : 0,
    }));
  }

  private aggregateByDay(data: any[], dateField: string) {
    const result: Record<string, number> = {};

    for (const item of data) {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      result[date] = (result[date] || 0) + item._count;
    }

    return Object.entries(result)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getStanceWeight(stance: PoliticalStance): number {
    const weights: Record<PoliticalStance, number> = {
      STRONG_SUPPORT: 1.0,
      SUPPORT: 0.8,
      LEAN_SUPPORT: 0.6,
      NEUTRAL: 0.5,
      UNDECIDED: 0.5,
      LEAN_OPPOSE: 0.4,
      OPPOSE: 0.2,
      STRONG_OPPOSE: 0.0,
    };
    return weights[stance] ?? 0.5;
  }

  async getVisitStats(campaignId: string) {
    // 計算今日開始和結束時間
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // 計算本週開始（週一）
    const weekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(today.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const [
      todayScheduleCompleted,
      weekScheduleCompleted,
      todayPlanned,
      weekPlanned,
      uniqueContacted,
      totalVoters,
    ] = await Promise.all([
      // 今日已完成的行程項目數
      this.prisma.scheduleItem.count({
        where: {
          schedule: { campaignId },
          status: 'COMPLETED',
          actualTime: {
            gte: today,
            lte: todayEnd,
          },
        },
      }),
      // 本週已完成的行程項目數
      this.prisma.scheduleItem.count({
        where: {
          schedule: { campaignId },
          status: 'COMPLETED',
          actualTime: {
            gte: weekStart,
            lte: todayEnd,
          },
        },
      }),
      // 今日計畫的行程項目數
      this.prisma.scheduleItem.count({
        where: {
          schedule: {
            campaignId,
            date: {
              gte: today,
              lte: todayEnd,
            },
          },
        },
      }),
      // 本週計畫的行程項目數
      this.prisma.scheduleItem.count({
        where: {
          schedule: {
            campaignId,
            date: {
              gte: weekStart,
              lte: todayEnd,
            },
          },
        },
      }),
      // 總共已接觸過的不重複選民數（有接觸紀錄的）
      this.prisma.voter.count({
        where: {
          campaignId,
          contactCount: { gt: 0 },
        },
      }),
      // 總選民數
      this.prisma.voter.count({
        where: { campaignId },
      }),
    ]);

    return {
      todayCompleted: todayScheduleCompleted,
      todayPlanned,
      todayCompletionRate: todayPlanned > 0 ? todayScheduleCompleted / todayPlanned : 0,
      weekCompleted: weekScheduleCompleted,
      weekPlanned,
      weekCompletionRate: weekPlanned > 0 ? weekScheduleCompleted / weekPlanned : 0,
      uniqueContacted,
      totalVoters,
      contactedRate: totalVoters > 0 ? uniqueContacted / totalVoters : 0,
    };
  }
}
