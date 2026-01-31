import { PrismaClient, ElectionType, PoliticalStance, ContactType, ContactOutcome, EventType, EventStatus, Gender, PoliticalParty, UserRole, RelationType, ScheduleStatus, ScheduleItemStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== 資料庫 ====================
const surnames = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪', '邱', '曾', '廖', '賴', '徐', '周', '葉', '蘇', '莊', '江', '呂', '何', '羅', '高', '蕭', '潘', '朱', '簡', '鍾', '彭', '游', '詹', '胡', '施', '沈', '余', '趙', '盧', '梁', '顏', '柯', '翁', '魏', '孫', '戴'];
const maleNames = ['志明', '建宏', '俊傑', '文彬', '家豪', '宗翰', '冠宇', '柏翰', '彥廷', '宇軒', '承翰', '冠廷', '柏均', '彥宏', '建志', '明宏', '志豪', '俊宏', '家銘', '宗憲', '冠霖', '柏宏', '彥均', '宇翔', '承恩', '柏毅', '彥志', '建華', '明志', '志偉', '俊廷', '家維', '宗翔', '冠穎', '柏勳', '宇恆', '承軒', '冠佑', '國強', '文正'];
const femaleNames = ['淑芬', '美玲', '雅婷', '怡君', '佳蓉', '宜珊', '欣怡', '雅琪', '佩君', '惠如', '雅惠', '淑娟', '美華', '怡萱', '佳慧', '宜芳', '欣蓉', '雅玲', '佩珊', '惠雯', '雅芳', '淑貞', '美君', '怡婷', '佳琪', '宜蓁', '欣儀', '雅雯', '佩怡', '惠芬', '雅如', '淑惠', '美雯', '怡伶', '佳玲', '宜君', '欣穎', '雅萍', '佩蓉', '惠婷'];

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

const roads = ['中正路', '民生路', '忠孝路', '仁愛路', '信義路', '和平路', '復興路', '建國路', '敦化路', '光復路', '松江路', '南京東路', '八德路', '市民大道', '基隆路', '羅斯福路', '新生南路', '金山南路', '中山北路', '承德路', '民權東路', '長安東路', '延吉街', '永吉路', '健康路'];
const parties: PoliticalParty[] = [PoliticalParty.KMT, PoliticalParty.DPP, PoliticalParty.TPP, PoliticalParty.NPP, PoliticalParty.INDEPENDENT, PoliticalParty.INDEPENDENT, PoliticalParty.UNKNOWN, PoliticalParty.UNKNOWN, PoliticalParty.UNKNOWN];
const stances: PoliticalStance[] = [PoliticalStance.STRONG_SUPPORT, PoliticalStance.SUPPORT, PoliticalStance.SUPPORT, PoliticalStance.LEAN_SUPPORT, PoliticalStance.LEAN_SUPPORT, PoliticalStance.NEUTRAL, PoliticalStance.NEUTRAL, PoliticalStance.UNDECIDED, PoliticalStance.UNDECIDED, PoliticalStance.LEAN_OPPOSE, PoliticalStance.OPPOSE];
const occupations = ['企業主', '教師', '工程師', '醫師', '護理師', '公務員', '退休', '家管', '商人', '律師', '會計師', '業務員', '技師', '司機', '廚師', '美髮師', '服務業', '金融業', '科技業', '製造業', '建築業', '自由業', '軍警', '農漁業', '學生'];
const tagsList = ['里長推薦', '商會成員', '教育界', '家長會', '社區發展協會', '宮廟', '志工團', '青年會', '婦女會', '長青會', '校友會', '同鄉會', '獅子會', '扶輪社', '專業人士', '地方仕紳', '意見領袖', '社區熱心', '環保志工', '文化協會'];

// 工具函數
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone(): string {
  return `09${randomInt(10, 99)}-${String(randomInt(0, 999)).padStart(3, '0')}-${String(randomInt(0, 999)).padStart(3, '0')}`;
}

function generateEmail(name: string): string | null {
  if (Math.random() > 0.7) return null;
  const providers = ['gmail.com', 'yahoo.com.tw', 'hotmail.com', 'outlook.com', 'pchome.com.tw'];
  return `${name.toLowerCase()}${randomInt(1, 999)}@${randomItem(providers)}`;
}

async function main() {
  console.log('🌱 開始建立種子資料（500+ 筆）...\n');

  // 清除舊資料
  console.log('🗑️  清除舊資料...');
  await prisma.scheduleItem.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.eventAttendee.deleteMany();
  await prisma.event.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.voterRelationship.deleteMany();
  await prisma.voter.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.activityLog.deleteMany();
  // 保留 user，因為可能有其他關聯

  // 建立測試使用者
  const user = await prisma.user.upsert({
    where: { lineUserId: 'test-line-user-id' },
    update: {},
    create: {
      lineUserId: 'test-line-user-id',
      name: '測試使用者',
      email: 'test@example.com',
      phone: '0912345678',
      // 不設定 avatarUrl，UI 會自動顯示使用者名稱首字
    },
  });
  console.log('✅ 建立測試使用者:', user.name);

  // 建立測試選舉活動
  const campaign = await prisma.campaign.create({
    data: {
      id: 'test-campaign-id',
      ownerId: user.id,
      name: '2026 台北市議員選舉',
      electionType: ElectionType.CITY_COUNCILOR,
      electionDate: new Date('2026-11-26'),
      city: '台北市',
      district: '大安區',
      description: '第七選區市議員選舉',
    },
  });
  console.log('✅ 建立測試選舉活動:', campaign.name);

  // 建立團隊成員
  await prisma.teamMember.create({
    data: {
      userId: user.id,
      campaignId: campaign.id,
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ 建立團隊成員');

  // ==================== 建立 500 位選民 ====================
  console.log('\n📊 建立 500 位選民資料...');
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
    
    // 在區域中心點附近隨機偏移
    const latOffset = (Math.random() - 0.5) * 0.02;
    const lngOffset = (Math.random() - 0.5) * 0.02;

    const voter = await prisma.voter.create({
      data: {
        campaignId: campaign.id,
        name,
        phone: generatePhone(),
        email: generateEmail(surname),
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
        notes: Math.random() > 0.7 ? randomItem(['熱心公益', '社區活躍', '有影響力', '需追蹤', '老朋友', '新認識', '里長推薦']) : null,
        createdBy: user.id,
      },
    });
    voters.push(voter);

    if ((i + 1) % 100 === 0) {
      console.log(`   已建立 ${i + 1} 位選民...`);
    }
  }
  console.log(`✅ 共建立 ${voters.length} 位選民`);

  // ==================== 建立選民關係 ====================
  console.log('\n🔗 建立選民關係...');
  const relationTypes: RelationType[] = [RelationType.FAMILY, RelationType.SPOUSE, RelationType.NEIGHBOR, RelationType.FRIEND, RelationType.COLLEAGUE, RelationType.COMMUNITY];
  let relationCount = 0;

  for (let i = 0; i < 100; i++) {
    const sourceIdx = randomInt(0, voters.length - 1);
    let targetIdx = randomInt(0, voters.length - 1);
    while (targetIdx === sourceIdx) {
      targetIdx = randomInt(0, voters.length - 1);
    }

    try {
      await prisma.voterRelationship.create({
        data: {
          sourceVoterId: voters[sourceIdx].id,
          targetVoterId: voters[targetIdx].id,
          relationType: randomItem(relationTypes),
          influenceWeight: randomInt(30, 90),
          notes: Math.random() > 0.5 ? randomItem(['認識多年', '同社區', '工作關係', '親戚介紹']) : null,
        },
      });
      relationCount++;
    } catch (e) {
      // 忽略重複關係
    }
  }
  console.log(`✅ 建立 ${relationCount} 組選民關係`);

  // ==================== 建立接觸紀錄 ====================
  console.log('\n📞 建立接觸紀錄...');
  const contactTypes: ContactType[] = [ContactType.HOME_VISIT, ContactType.STREET_VISIT, ContactType.PHONE_CALL, ContactType.LIVING_ROOM, ContactType.MARKETPLACE, ContactType.TEMPLE, ContactType.EVENT];
  const outcomes: ContactOutcome[] = [ContactOutcome.POSITIVE, ContactOutcome.POSITIVE, ContactOutcome.NEUTRAL, ContactOutcome.NEUTRAL, ContactOutcome.NEGATIVE, ContactOutcome.NOT_HOME, ContactOutcome.NO_RESPONSE];
  const topics = ['政策討論', '地方建設', '社會福利', '教育議題', '經濟發展', '環境保護', '交通問題', '治安問題', '醫療照護', '青年就業', '長照政策', '一般寒暄'];
  const contactNotes = ['表達高度支持', '反應良好', '態度中立', '需要再追蹤', '有其他支持對象', '不在家', '拒絕交談', '希望了解更多政見', '關心社區發展', '反映鄰里問題'];

  let contactCount = 0;
  for (let i = 0; i < 800; i++) {
    const voter = randomItem(voters);
    const daysAgo = randomInt(0, 60);
    const contactDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    await prisma.contact.create({
      data: {
        voterId: voter.id,
        userId: user.id,
        campaignId: campaign.id,
        type: randomItem(contactTypes),
        outcome: randomItem(outcomes),
        contactDate,
        notes: randomItem(contactNotes),
        topics: Array.from({ length: randomInt(1, 3) }, () => randomItem(topics)).filter((v, i, a) => a.indexOf(v) === i),
        nextAction: Math.random() > 0.7 ? randomItem(['再次拜訪', '電話追蹤', '寄送文宣', '邀請參加活動']) : null,
        followUpDate: Math.random() > 0.8 ? new Date(Date.now() + randomInt(3, 14) * 24 * 60 * 60 * 1000) : null,
      },
    });

    // 更新選民接觸次數
    await prisma.voter.update({
      where: { id: voter.id },
      data: {
        contactCount: { increment: 1 },
        lastContactAt: contactDate,
      },
    });

    contactCount++;
    if (contactCount % 200 === 0) {
      console.log(`   已建立 ${contactCount} 筆接觸紀錄...`);
    }
  }
  console.log(`✅ 共建立 ${contactCount} 筆接觸紀錄`);

  // ==================== 建立活動 ====================
  console.log('\n🎉 建立活動...');
  const eventTypes: EventType[] = [EventType.LIVING_ROOM, EventType.COMMUNITY, EventType.TEMPLE, EventType.CAMPAIGN, EventType.MEETING];
  const eventStatuses: EventStatus[] = [EventStatus.COMPLETED, EventStatus.COMPLETED, EventStatus.CONFIRMED, EventStatus.PLANNED, EventStatus.PLANNED];
  const eventNames = ['客廳會', '社區座談會', '里民大會', '造勢晚會', '政見發表會', '青年論壇', '婦女座談', '長青聯誼', '志工感謝餐會', '地方建設說明會'];

  const events: any[] = [];
  for (let i = 0; i < 25; i++) {
    const host = randomItem(voters);
    const daysOffset = randomInt(-30, 30);
    const startTime = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);
    startTime.setHours(randomInt(9, 19), 0, 0, 0);
    const endTime = new Date(startTime.getTime() + randomInt(1, 3) * 60 * 60 * 1000);
    const status = daysOffset < -7 ? EventStatus.COMPLETED : daysOffset < 0 ? EventStatus.CONFIRMED : randomItem(eventStatuses);

    const event = await prisma.event.create({
      data: {
        campaignId: campaign.id,
        type: randomItem(eventTypes),
        status,
        name: `${host.name.substring(0, 1)}${randomItem(['先生', '小姐', '女士'])}${randomItem(eventNames)}`,
        description: `在${host.districtName}${host.village}舉辦`,
        hostVoterId: host.id,
        address: host.address,
        locationLat: host.latitude,
        locationLng: host.longitude,
        startTime,
        endTime,
        expectedAttendees: randomInt(10, 50),
        actualAttendees: status === EventStatus.COMPLETED ? randomInt(8, 45) : null,
        createdBy: user.id,
      },
    });
    events.push(event);

    // 為活動新增參與者
    const attendeeCount = randomInt(5, 15);
    const shuffledVoters = [...voters].sort(() => Math.random() - 0.5).slice(0, attendeeCount);
    for (const attendee of shuffledVoters) {
      if (attendee.id !== host.id) {
        try {
          await prisma.eventAttendee.create({
            data: {
              eventId: event.id,
              voterId: attendee.id,
              status: status === EventStatus.COMPLETED ? 'ATTENDED' : 'CONFIRMED',
            },
          });
        } catch (e) {
          // 忽略重複
        }
      }
    }
  }
  console.log(`✅ 建立 ${events.length} 場活動`);

  // ==================== 建立行程 ====================
  console.log('\n📅 建立行程...');
  const scheduleStatuses: ScheduleStatus[] = [ScheduleStatus.COMPLETED, ScheduleStatus.COMPLETED, ScheduleStatus.IN_PROGRESS, ScheduleStatus.PLANNED, ScheduleStatus.DRAFT];

  for (let dayOffset = -14; dayOffset <= 7; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    const status = dayOffset < -3 ? ScheduleStatus.COMPLETED : 
                   dayOffset < 0 ? ScheduleStatus.IN_PROGRESS : 
                   dayOffset === 0 ? ScheduleStatus.PLANNED :
                   randomItem(scheduleStatuses);

    const schedule = await prisma.schedule.create({
      data: {
        campaignId: campaign.id,
        userId: user.id,
        date,
        title: `${date.getMonth() + 1}/${date.getDate()} 拜訪行程`,
        description: `${randomItem(districts).name}重點選民拜訪`,
        status,
        totalDistance: randomInt(5, 20),
        estimatedDuration: randomInt(180, 480),
      },
    });

    // 為行程新增拜訪項目
    const itemCount = randomInt(5, 12);
    const shuffledVoters = [...voters].sort(() => Math.random() - 0.5).slice(0, itemCount);
    let currentTime = new Date(date);
    currentTime.setHours(9, 0, 0, 0);

    for (let i = 0; i < shuffledVoters.length; i++) {
      const voter = shuffledVoters[i];
      const itemStatus: ScheduleItemStatus = status === ScheduleStatus.COMPLETED ? ScheduleItemStatus.COMPLETED :
                        status === ScheduleStatus.IN_PROGRESS && i < 3 ? ScheduleItemStatus.COMPLETED :
                        ScheduleItemStatus.PENDING;

      await prisma.scheduleItem.create({
        data: {
          scheduleId: schedule.id,
          order: i + 1,
          type: 'VOTER_VISIT',
          voterId: voter.id,
          address: voter.address,
          locationLat: voter.latitude,
          locationLng: voter.longitude,
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
  console.log(`✅ 建立 22 天的行程資料`);

  // ==================== 建立選區資料 ====================
  console.log('\n🗺️  建立選區資料...');
  let taipeiCity = await prisma.district.findFirst({
    where: { name: '台北市', level: 'CITY' },
  });

  if (!taipeiCity) {
    taipeiCity = await prisma.district.create({
      data: {
        name: '台北市',
        level: 'CITY',
        code: 'TPE',
        registeredVoters: 2200000,
        centerLat: 25.0330,
        centerLng: 121.5654,
      },
    });
  }

  for (const district of districts) {
    const existing = await prisma.district.findFirst({
      where: { name: district.name, level: 'DISTRICT', parentId: taipeiCity.id },
    });

    if (!existing) {
      const districtRecord = await prisma.district.create({
        data: {
          name: district.name,
          level: 'DISTRICT',
          parentId: taipeiCity.id,
          registeredVoters: randomInt(100000, 300000),
          centerLat: district.lat,
          centerLng: district.lng,
        },
      });

      // 建立里
      for (const village of district.villages) {
        await prisma.district.create({
          data: {
            name: village,
            level: 'VILLAGE',
            parentId: districtRecord.id,
            registeredVoters: randomInt(2000, 8000),
            centerLat: district.lat + (Math.random() - 0.5) * 0.01,
            centerLng: district.lng + (Math.random() - 0.5) * 0.01,
          },
        });
      }
    }
  }
  console.log('✅ 建立選區資料');

  // ==================== 完成 ====================
  console.log('\n' + '='.repeat(50));
  console.log('🎉 種子資料建立完成！');
  console.log('='.repeat(50));
  console.log('\n📋 資料摘要:');
  console.log(`   👤 選民: 500 位`);
  console.log(`   🔗 選民關係: ${relationCount} 組`);
  console.log(`   📞 接觸紀錄: ${contactCount} 筆`);
  console.log(`   🎉 活動: ${events.length} 場`);
  console.log(`   📅 行程: 22 天`);
  console.log(`   🗺️  選區: 12 區 120 里`);
  console.log('\n📋 測試帳號資訊:');
  console.log('   LINE User ID: test-line-user-id');
  console.log('   使用者名稱: 測試使用者');
  console.log('   選舉活動: 2026 台北市議員選舉');
  console.log('\n💡 提示: 在瀏覽器中訪問 http://localhost:3000 查看資料');
}

main()
  .catch((e) => {
    console.error('❌ 種子資料建立失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
