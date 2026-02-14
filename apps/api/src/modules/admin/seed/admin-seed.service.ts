import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ElectionType,
  PoliticalStance,
  ContactType,
  ContactOutcome,
  EventType,
  EventStatus,
  Gender,
  PoliticalParty,
  UserRole,
  RelationType,
  ScheduleStatus,
  ScheduleItemStatus,
} from '@prisma/client';

// ==================== 資料庫 ====================
const surnames = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪', '邱', '曾', '廖', '賴', '徐', '周', '葉', '蘇', '莊', '江', '呂', '何', '羅', '高', '蕭', '潘', '朱', '簡', '鍾', '彭', '游', '詹', '胡', '施', '沈', '余', '趙', '盧', '梁', '顏', '柯', '翁', '魏', '孫', '戴'];
const maleNames = ['志明', '建宏', '俊傑', '文彬', '家豪', '宗翰', '冠宇', '柏翰', '彥廷', '宇軒', '承翰', '冠廷', '柏均', '彥宏', '建志', '明宏', '志豪', '俊宏', '家銘', '宗憲'];
const femaleNames = ['淑芬', '美玲', '雅婷', '怡君', '佳蓉', '宜珊', '欣怡', '雅琪', '佩君', '惠如', '雅惠', '淑娟', '美華', '怡萱', '佳慧', '宜芳', '欣蓉', '雅玲', '佩珊', '惠雯'];

const districts = [
  { name: '中正區', villages: ['光復里', '南門里', '龍光里', '建國里', '愛國里', '梅花里', '東門里', '文北里', '幸福里', '三愛里'], lat: 25.0320, lng: 121.5180 },
  { name: '大同區', villages: ['大有里', '民權里', '延平里', '建功里', '光能里', '蓬萊里', '國順里', '保安里', '朝陽里', '揚雅里'], lat: 25.0635, lng: 121.5130 },
  { name: '中山區', villages: ['中山里', '正義里', '大直里', '劍潭里', '圓山里', '松江里', '新生里', '民安里', '復華里', '行政里'], lat: 25.0685, lng: 121.5330 },
  { name: '松山區', villages: ['民有里', '民福里', '復建里', '中華里', '中崙里', '敦化里', '三民里', '新東里', '精忠里', '東昌里'], lat: 25.0500, lng: 121.5575 },
  { name: '大安區', villages: ['仁愛里', '敦安里', '光武里', '龍安里', '新龍里', '錦安里', '住安里', '法治里', '通化里', '臨江里'], lat: 25.0265, lng: 121.5436 },
  { name: '萬華區', villages: ['福星里', '萬壽里', '西門里', '新起里', '青山里', '柳鄉里', '華江里', '綠堤里', '忠貞里', '日善里'], lat: 25.0340, lng: 121.4970 },
  { name: '信義區', villages: ['三張里', '六藝里', '中興里', '興雅里', '黎忠里', '黎平里', '永吉里', '景勤里', '惠安里', '安康里'], lat: 25.0300, lng: 121.5680 },
  { name: '士林區', villages: ['福林里', '芝山里', '名山里', '蘭雅里', '德行里', '天母里', '三玉里', '公館里', '社子里', '富光里'], lat: 25.0930, lng: 121.5250 },
  { name: '北投區', villages: ['中央里', '長安里', '大同里', '吉利里', '立農里', '東華里', '榮光里', '永和里', '石牌里', '振華里'], lat: 25.1320, lng: 121.5010 },
  { name: '內湖區', villages: ['湖興里', '內湖里', '西湖里', '港墘里', '瑞光里', '紫陽里', '清白里', '週美里', '金龍里', '碧山里'], lat: 25.0830, lng: 121.5890 },
  { name: '南港區', villages: ['三重里', '萬福里', '新光里', '聯成里', '鴻福里', '南港里', '成福里', '玉成里', '中研里', '舊莊里'], lat: 25.0550, lng: 121.6070 },
  { name: '文山區', villages: ['萬盛里', '興豐里', '興光里', '明興里', '木柵里', '木新里', '景美里', '萬年里', '指南里', '政大里'], lat: 24.9890, lng: 121.5700 },
];

const roads = ['中正路', '民生路', '忠孝路', '仁愛路', '信義路', '和平路', '復興路', '建國路', '敦化路', '光復路', '松江路', '南京東路', '八德路', '市民大道', '基隆路'];
const parties: PoliticalParty[] = [PoliticalParty.KMT, PoliticalParty.DPP, PoliticalParty.TPP, PoliticalParty.NPP, PoliticalParty.INDEPENDENT, PoliticalParty.INDEPENDENT, PoliticalParty.UNKNOWN, PoliticalParty.UNKNOWN, PoliticalParty.UNKNOWN];
const stances: PoliticalStance[] = [PoliticalStance.STRONG_SUPPORT, PoliticalStance.SUPPORT, PoliticalStance.SUPPORT, PoliticalStance.LEAN_SUPPORT, PoliticalStance.LEAN_SUPPORT, PoliticalStance.NEUTRAL, PoliticalStance.NEUTRAL, PoliticalStance.UNDECIDED, PoliticalStance.UNDECIDED, PoliticalStance.LEAN_OPPOSE, PoliticalStance.OPPOSE];
const occupations = ['企業主', '教師', '工程師', '醫師', '護理師', '公務員', '退休', '家管', '商人', '律師', '會計師', '業務員', '技師', '司機', '服務業', '金融業', '科技業', '自由業', '軍警', '學生'];
const tagsList = ['里長推薦', '商會成員', '教育界', '家長會', '社區發展協會', '宮廟', '志工團', '青年會', '婦女會', '長青會', '校友會', '同鄉會', '專業人士', '地方仕紳', '意見領袖', '社區熱心'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone(): string {
  return `09${randomInt(10, 99)}-${String(randomInt(0, 999)).padStart(3, '0')}-${String(randomInt(0, 999)).padStart(3, '0')}`;
}

@Injectable()
export class AdminSeedService {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(private prisma: PrismaService) {}

  async seedForUser(userId: string) {
    this.logger.log(`開始為使用者 ${userId} 建立種子資料...`);

    // 找到使用者
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error(`使用者 ${userId} 不存在`);

    // 找到使用者的第一個 campaign（先查 TeamMember，再查 ownerId）
    const teamMember = await this.prisma.teamMember.findFirst({
      where: { userId },
      include: { campaign: true },
    });

    let campaign: any;
    if (teamMember?.campaign) {
      campaign = teamMember.campaign;
      this.logger.log(`使用現有活動 (TeamMember): ${campaign.name}`);
    } else {
      // 再查 Campaign.ownerId
      const ownedCampaign = await this.prisma.campaign.findFirst({
        where: { ownerId: userId },
        orderBy: { createdAt: 'asc' },
      });
      if (ownedCampaign) {
        campaign = ownedCampaign;
        // 順便補建 TeamMember 記錄
        await this.prisma.teamMember.upsert({
          where: { userId_campaignId: { userId, campaignId: campaign.id } },
          update: {},
          create: { userId, campaignId: campaign.id, role: UserRole.ADMIN },
        });
        this.logger.log(`使用現有活動 (ownerId): ${campaign.name}`);
      } else {
        // 都找不到才建立新活動
        campaign = await this.prisma.campaign.create({
          data: {
            ownerId: userId,
            name: '2026 台北市議員選舉',
            electionType: ElectionType.CITY_COUNCILOR,
            electionDate: new Date('2026-11-26'),
            city: '台北市',
            district: '中山區',
            description: '第七選區市議員選舉',
          },
        });
        await this.prisma.teamMember.create({
          data: { userId, campaignId: campaign.id, role: UserRole.ADMIN },
        });
        this.logger.log(`建立新活動: ${campaign.name}`);
      }
    }

    // 先檢查現有選民數量
    const existingVoters = await this.prisma.voter.count({ where: { campaignId: campaign.id } });
    if (existingVoters > 50) {
      return {
        message: '此活動已有足夠資料，跳過 seed',
        campaign: campaign.name,
        existingVoters,
      };
    }

    // ==================== 建立 500 位選民 ====================
    this.logger.log('建立 500 位選民...');
    const voters: any[] = [];

    for (let i = 0; i < 500; i++) {
      const isMale = Math.random() > 0.5;
      const surname = randomItem(surnames);
      const firstName = isMale ? randomItem(maleNames) : randomItem(femaleNames);
      const name = surname + firstName;
      const district = randomItem(districts);
      const village = randomItem(district.villages);
      const road = randomItem(roads);
      const number = randomInt(1, 300);
      const hasFloor = Math.random() > 0.5;
      const floor = hasFloor ? `${randomInt(1, 15)}樓` : '';
      const address = `台北市${district.name}${road}${number}號${floor}`;
      const latOffset = (Math.random() - 0.5) * 0.02;
      const lngOffset = (Math.random() - 0.5) * 0.02;

      const voter = await this.prisma.voter.create({
        data: {
          campaignId: campaign.id,
          name,
          phone: generatePhone(),
          address,
          city: '台北市',
          districtName: district.name,
          village,
          latitude: district.lat + latOffset,
          longitude: district.lng + lngOffset,
          politicalParty: randomItem(parties),
          stance: randomItem(stances),
          influenceScore: randomInt(10, 95),
          age: randomInt(25, 75),
          gender: isMale ? Gender.M : Gender.F,
          occupation: randomItem(occupations),
          tags: Array.from({ length: randomInt(0, 3) }, () => randomItem(tagsList)).filter((v, i, a) => a.indexOf(v) === i),
          notes: Math.random() > 0.7 ? randomItem(['熱心公益', '社區活躍', '有影響力', '需追蹤', '里長推薦']) : null,
          createdBy: userId,
        },
      });
      voters.push(voter);
    }
    this.logger.log(`建立 ${voters.length} 位選民`);

    // ==================== 建立選民關係 ====================
    const relationTypes: RelationType[] = [RelationType.FAMILY, RelationType.SPOUSE, RelationType.NEIGHBOR, RelationType.FRIEND, RelationType.COLLEAGUE, RelationType.COMMUNITY];
    let relationCount = 0;
    for (let i = 0; i < 100; i++) {
      const srcIdx = randomInt(0, voters.length - 1);
      let tgtIdx = randomInt(0, voters.length - 1);
      while (tgtIdx === srcIdx) tgtIdx = randomInt(0, voters.length - 1);
      try {
        await this.prisma.voterRelationship.create({
          data: {
            sourceVoterId: voters[srcIdx].id,
            targetVoterId: voters[tgtIdx].id,
            relationType: randomItem(relationTypes),
            influenceWeight: randomInt(30, 90),
          },
        });
        relationCount++;
      } catch { /* skip duplicates */ }
    }

    // ==================== 建立接觸紀錄 ====================
    const contactTypes: ContactType[] = [ContactType.HOME_VISIT, ContactType.STREET_VISIT, ContactType.PHONE_CALL, ContactType.LIVING_ROOM, ContactType.MARKETPLACE, ContactType.TEMPLE, ContactType.EVENT];
    const outcomes: ContactOutcome[] = [ContactOutcome.POSITIVE, ContactOutcome.POSITIVE, ContactOutcome.NEUTRAL, ContactOutcome.NEUTRAL, ContactOutcome.NEGATIVE, ContactOutcome.NOT_HOME, ContactOutcome.NO_RESPONSE];
    const topics = ['政策討論', '地方建設', '社會福利', '教育議題', '經濟發展', '環境保護', '交通問題', '醫療照護', '青年就業', '長照政策'];
    const contactNotes = ['表達高度支持', '反應良好', '態度中立', '需要再追蹤', '有其他支持對象', '不在家', '希望了解更多政見', '關心社區發展'];

    let contactCount = 0;
    for (let i = 0; i < 800; i++) {
      const voter = randomItem(voters);
      const daysAgo = randomInt(0, 60);
      const contactDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      await this.prisma.contact.create({
        data: {
          voterId: voter.id,
          userId,
          campaignId: campaign.id,
          type: randomItem(contactTypes),
          outcome: randomItem(outcomes),
          contactDate,
          notes: randomItem(contactNotes),
          topics: Array.from({ length: randomInt(1, 3) }, () => randomItem(topics)).filter((v, i, a) => a.indexOf(v) === i),
          nextAction: Math.random() > 0.7 ? randomItem(['再次拜訪', '電話追蹤', '寄送文宣', '邀請參加活動']) : null,
        },
      });
      await this.prisma.voter.update({ where: { id: voter.id }, data: { contactCount: { increment: 1 }, lastContactAt: contactDate } });
      contactCount++;
    }

    // ==================== 建立活動 ====================
    const eventTypes: EventType[] = [EventType.LIVING_ROOM, EventType.COMMUNITY, EventType.TEMPLE, EventType.CAMPAIGN, EventType.MEETING];
    const eventNames = ['客廳會', '社區座談會', '里民大會', '造勢晚會', '政見發表會', '青年論壇', '婦女座談', '長青聯誼', '志工餐會', '建設說明會'];
    const events: any[] = [];

    for (let i = 0; i < 25; i++) {
      const host = randomItem(voters);
      const daysOffset = randomInt(-30, 30);
      const startTime = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);
      startTime.setHours(randomInt(9, 19), 0, 0, 0);
      const endTime = new Date(startTime.getTime() + randomInt(1, 3) * 60 * 60 * 1000);
      const status = daysOffset < -7 ? EventStatus.COMPLETED : daysOffset < 0 ? EventStatus.CONFIRMED : EventStatus.PLANNED;

      const event = await this.prisma.event.create({
        data: {
          campaignId: campaign.id,
          type: randomItem(eventTypes),
          status,
          name: `${host.name.substring(0, 1)}${randomItem(['先生', '小姐'])}${randomItem(eventNames)}`,
          description: `在${host.districtName}${host.village}舉辦`,
          hostVoterId: host.id,
          address: host.address,
          locationLat: host.latitude,
          locationLng: host.longitude,
          startTime,
          endTime,
          expectedAttendees: randomInt(10, 50),
          actualAttendees: status === EventStatus.COMPLETED ? randomInt(8, 45) : null,
          createdBy: userId,
        },
      });
      events.push(event);

      const attendees = [...voters].sort(() => Math.random() - 0.5).slice(0, randomInt(5, 15));
      for (const att of attendees) {
        if (att.id !== host.id) {
          try {
            await this.prisma.eventAttendee.create({
              data: { eventId: event.id, voterId: att.id, status: status === EventStatus.COMPLETED ? 'ATTENDED' : 'CONFIRMED' },
            });
          } catch { /* skip */ }
        }
      }
    }

    // ==================== 建立行程 ====================
    for (let dayOffset = -14; dayOffset <= 7; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0);
      const status = dayOffset < -3 ? ScheduleStatus.COMPLETED : dayOffset < 0 ? ScheduleStatus.IN_PROGRESS : ScheduleStatus.PLANNED;

      const schedule = await this.prisma.schedule.create({
        data: {
          campaignId: campaign.id,
          userId,
          date,
          title: `${date.getMonth() + 1}/${date.getDate()} 拜訪行程`,
          description: `${randomItem(districts).name}重點選民拜訪`,
          status,
          totalDistance: randomInt(5, 20),
          estimatedDuration: randomInt(180, 480),
        },
      });

      const itemCount = randomInt(5, 12);
      const shuffled = [...voters].sort(() => Math.random() - 0.5).slice(0, itemCount);
      let currentTime = new Date(date);
      currentTime.setHours(9, 0, 0, 0);

      for (let i = 0; i < shuffled.length; i++) {
        const v = shuffled[i];
        const itemStatus: ScheduleItemStatus = status === ScheduleStatus.COMPLETED ? ScheduleItemStatus.COMPLETED : status === ScheduleStatus.IN_PROGRESS && i < 3 ? ScheduleItemStatus.COMPLETED : ScheduleItemStatus.PENDING;
        await this.prisma.scheduleItem.create({
          data: {
            scheduleId: schedule.id,
            order: i + 1,
            type: 'VOTER_VISIT',
            voterId: v.id,
            address: v.address,
            locationLat: v.latitude,
            locationLng: v.longitude,
            plannedTime: new Date(currentTime),
            duration: randomInt(15, 45),
            status: itemStatus,
            travelDistance: i > 0 ? randomInt(1, 5) / 10 : 0,
            travelDuration: i > 0 ? randomInt(5, 20) : 0,
          },
        });
        currentTime = new Date(currentTime.getTime() + randomInt(30, 60) * 60 * 1000);
      }
    }

    const summary = {
      message: '種子資料建立完成',
      campaign: campaign.name,
      voters: voters.length,
      relations: relationCount,
      contacts: contactCount,
      events: events.length,
      schedules: 22,
    };
    this.logger.log(JSON.stringify(summary));
    return summary;
  }

  /**
   * 清理錯誤建立的 seed campaign 並重新 seed 到使用者的原始 campaign
   */
  async cleanupAndReseed(userId: string) {
    this.logger.log(`開始清理並重新 seed 使用者 ${userId}...`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error(`使用者 ${userId} 不存在`);

    // 找到所有使用者相關的 campaigns
    const ownedCampaigns = await this.prisma.campaign.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { voters: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const memberCampaigns = await this.prisma.teamMember.findMany({
      where: { userId },
      include: {
        campaign: {
          include: { _count: { select: { voters: true } } },
        },
      },
    });

    // 合併所有 campaigns（去重）
    const allCampaignMap = new Map<string, any>();
    for (const c of ownedCampaigns) {
      allCampaignMap.set(c.id, c);
    }
    for (const tm of memberCampaigns) {
      if (tm.campaign) {
        allCampaignMap.set(tm.campaign.id, tm.campaign);
      }
    }
    const allCampaigns = Array.from(allCampaignMap.values());

    this.logger.log(`找到 ${allCampaigns.length} 個相關活動:`);
    for (const c of allCampaigns) {
      this.logger.log(`  - ${c.name} (${c.id}): ${c._count.voters} 位選民`);
    }

    if (allCampaigns.length < 1) {
      return { message: '找不到任何活動', userId };
    }

    // 策略：找到最早建立的 campaign（原始的），刪除其他所有的
    // 然後 seed 到原始 campaign
    const [originalCampaign, ...extraCampaigns] = allCampaigns.sort(
      (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    // 刪除額外的 campaigns（cascade 會清理相關資料）
    const deletedNames: string[] = [];
    for (const extra of extraCampaigns) {
      this.logger.log(`刪除額外活動: ${extra.name} (${extra.id})`);
      await this.prisma.campaign.delete({ where: { id: extra.id } });
      deletedNames.push(extra.name);
    }

    // 清除原始 campaign 的現有資料（如果有的話，先清空再 seed）
    this.logger.log(`清除原始活動 ${originalCampaign.name} 的現有資料...`);
    await this.prisma.scheduleItem.deleteMany({
      where: { schedule: { campaignId: originalCampaign.id } },
    });
    await this.prisma.schedule.deleteMany({ where: { campaignId: originalCampaign.id } });
    await this.prisma.eventAttendee.deleteMany({
      where: { event: { campaignId: originalCampaign.id } },
    });
    await this.prisma.event.deleteMany({ where: { campaignId: originalCampaign.id } });
    await this.prisma.contact.deleteMany({ where: { campaignId: originalCampaign.id } });
    await this.prisma.voterRelationship.deleteMany({
      where: { sourceVoter: { campaignId: originalCampaign.id } },
    });
    await this.prisma.voter.deleteMany({ where: { campaignId: originalCampaign.id } });

    // 確保 TeamMember 存在
    await this.prisma.teamMember.upsert({
      where: { userId_campaignId: { userId, campaignId: originalCampaign.id } },
      update: {},
      create: { userId, campaignId: originalCampaign.id, role: UserRole.ADMIN },
    });

    // 重新 seed（直接呼叫 seedForUser，現在會找到正確的 campaign）
    this.logger.log(`重新 seed 到活動: ${originalCampaign.name}`);
    const seedResult = await this.seedForUser(userId);

    return {
      message: '清理並重新 seed 完成',
      deletedCampaigns: deletedNames,
      originalCampaign: originalCampaign.name,
      seedResult,
    };
  }
}
