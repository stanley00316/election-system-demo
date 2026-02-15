/**
 * 示範模式靜態資料
 * 基於 apps/api/prisma/seed.ts 的資料結構生成
 * 用於 Vercel 純前端部署，無需後端 API
 */

// ==================== 基礎資料 ====================
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
const parties = ['KMT', 'DPP', 'TPP', 'NPP', 'INDEPENDENT', 'INDEPENDENT', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN'];
const stances = ['STRONG_SUPPORT', 'SUPPORT', 'SUPPORT', 'LEAN_SUPPORT', 'LEAN_SUPPORT', 'NEUTRAL', 'NEUTRAL', 'UNDECIDED', 'UNDECIDED', 'LEAN_OPPOSE', 'OPPOSE'];
const occupations = ['企業主', '教師', '工程師', '醫師', '護理師', '公務員', '退休', '家管', '商人', '律師', '會計師', '業務員', '技師', '司機', '廚師', '美髮師', '服務業', '金融業', '科技業', '製造業', '建築業', '自由業', '軍警', '農漁業', '學生'];
const tagsList = ['里長推薦', '商會成員', '教育界', '家長會', '社區發展協會', '宮廟', '志工團', '青年會', '婦女會', '長青會', '校友會', '同鄉會', '獅子會', '扶輪社', '專業人士', '地方仕紳', '意見領袖', '社區熱心', '環保志工', '文化協會'];
const contactTypes = ['HOME_VISIT', 'STREET_VISIT', 'PHONE_CALL', 'LINE_CALL', 'LIVING_ROOM', 'MARKETPLACE', 'TEMPLE', 'EVENT'];
const outcomes = ['POSITIVE', 'POSITIVE', 'NEUTRAL', 'NEUTRAL', 'NEGATIVE', 'NOT_HOME', 'NO_RESPONSE'];
const topics = ['政策討論', '地方建設', '社會福利', '教育議題', '經濟發展', '環境保護', '交通問題', '治安問題', '醫療照護', '青年就業', '長照政策', '一般寒暄'];
const contactNotes = ['表達高度支持', '反應良好', '態度中立', '需要再追蹤', '有其他支持對象', '不在家', '拒絕交談', '希望了解更多政見', '關心社區發展', '反映鄰里問題', 'LINE 已讀未回', 'LINE 聊天互動良好', 'LINE 傳送政見資料', '透過 LINE 約定下次見面'];
const eventTypes = ['LIVING_ROOM', 'COMMUNITY', 'TEMPLE', 'CAMPAIGN', 'MEETING'];
const eventStatuses = ['COMPLETED', 'COMPLETED', 'CONFIRMED', 'PLANNED', 'PLANNED'];
const eventNames = ['客廳會', '社區座談會', '里民大會', '造勢晚會', '政見發表會', '青年論壇', '婦女座談', '長青聯誼', '志工感謝餐會', '地方建設說明會'];
const relationTypes = ['FAMILY', 'SPOUSE', 'NEIGHBOR', 'FRIEND', 'COLLEAGUE', 'COMMUNITY'];

// 工具函數
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generatePhone(): string {
  return `09${randomInt(10, 99)}-${String(randomInt(0, 999)).padStart(3, '0')}-${String(randomInt(0, 999)).padStart(3, '0')}`;
}

function generateEmail(name: string): string | null {
  if (Math.random() > 0.7) return null;
  const providers = ['gmail.com', 'yahoo.com.tw', 'hotmail.com', 'outlook.com', 'pchome.com.tw'];
  return `${name.toLowerCase()}${randomInt(1, 999)}@${randomItem(providers)}`;
}

// 使用固定種子確保每次生成相同資料
let seed = 12345;
function seededRandom(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

function seededRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)];
}

function seededRandomInt(min: number, max: number): number {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}

// ==================== 生成示範資料 ====================

// 示範使用者
export const demoUser = {
  id: 'demo-user-id',
  lineUserId: 'demo-line-user-id',
  name: '示範使用者',
  email: 'demo@example.com',
  phone: '0912345678',
  avatarUrl: undefined as string | undefined,
  isActive: true,
  isAdmin: false,
  isSuperAdmin: false,
  consentAcceptedAt: null as string | null,
  consentVersion: null as string | null,
  portraitConsentAcceptedAt: null as string | null,
  promoter: {
    id: 'demo-promoter-id',
    status: 'APPROVED',
    isActive: true,
  },
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date().toISOString(),
};

// 示範選舉活動
export const demoCampaign = {
  id: 'demo-campaign-id',
  ownerId: demoUser.id,
  name: '2026 台北市議員選舉',
  electionType: 'CITY_COUNCILOR',
  electionDate: '2026-11-26',
  city: '台北市',
  district: '大安區',
  description: '第七選區市議員選舉',
  createdAt: new Date('2024-06-01').toISOString(),
  updatedAt: new Date().toISOString(),
};

// 為 demoUser 新增 campaigns 和 teamMembers（解決循環依賴）
(demoUser as any).campaigns = [demoCampaign];
(demoUser as any).teamMembers = [{
  id: 'demo-team-member-id',
  campaignId: demoCampaign.id,
  userId: demoUser.id,
  role: 'ADMIN',
}];

// 生成選民資料
function generateVoters(count: number): any[] {
  seed = 12345; // 重置種子
  const voters: any[] = [];

  for (let i = 0; i < count; i++) {
    const isMale = seededRandom() > 0.5;
    const surname = seededRandomItem(surnames);
    const firstName = isMale ? seededRandomItem(maleNames) : seededRandomItem(femaleNames);
    const name = surname + firstName;
    const district = seededRandomItem(districts);
    const village = seededRandomItem(district.villages);
    const road = seededRandomItem(roads);
    const number = seededRandomInt(1, 300);
    const hasFloor = seededRandom() > 0.5;
    const floor = hasFloor ? `${seededRandomInt(1, 15)}樓` : '';
    const address = `台北市${district.name}${road}${number}號${floor}`;
    
    const latOffset = (seededRandom() - 0.5) * 0.02;
    const lngOffset = (seededRandom() - 0.5) * 0.02;

    // 所有選民都有 LINE（現代人常用 LINE）
    // 使用隨機英文字母和數字組合生成 LINE ID
    const lineIdPrefix = ['user', 'tw', 'line', 'id', 'tp'][seededRandomInt(0, 4)];
    const lineId = `${lineIdPrefix}${seededRandomInt(10000, 99999)}`;
    const lineUrl = seededRandom() > 0.3 ? `https://line.me/ti/p/~${lineId}` : null;
    
    // 有些人只有 LINE 沒有電話（30% 的情況）
    const hasPhone = seededRandom() > 0.3;

    voters.push({
      id: `voter-${i + 1}`,
      campaignId: demoCampaign.id,
      name,
      phone: hasPhone ? generatePhone() : null,
      email: generateEmail(surname),
      lineId,
      lineUrl,
      address,
      city: '台北市',
      districtName: district.name,
      village,
      neighborhood: `${seededRandomInt(1, 20)}鄰`,
      latitude: district.lat + latOffset,
      longitude: district.lng + lngOffset,
      politicalParty: seededRandomItem(parties),
      stance: seededRandomItem(stances),
      influenceScore: seededRandomInt(10, 95),
      age: seededRandomInt(25, 75),
      gender: isMale ? 'M' : 'F',
      occupation: seededRandomItem(occupations),
      tags: Array.from({ length: seededRandomInt(0, 3) }, () => seededRandomItem(tagsList)).filter((v, i, a) => a.indexOf(v) === i),
      notes: seededRandom() > 0.7 ? seededRandomItem(['熱心公益', '社區活躍', '有影響力', '需追蹤', '老朋友', '新認識', '里長推薦']) : null,
      contactCount: seededRandomInt(0, 10),
      lastContactAt: seededRandom() > 0.5 ? new Date(Date.now() - seededRandomInt(1, 60) * 24 * 60 * 60 * 1000).toISOString() : null,
      createdBy: demoUser.id,
      createdAt: new Date(Date.now() - seededRandomInt(30, 180) * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return voters;
}

// 生成接觸紀錄
function generateContacts(voters: any[], count: number): any[] {
  seed = 54321; // 使用不同種子
  const contacts: any[] = [];

  for (let i = 0; i < count; i++) {
    const voter = seededRandomItem(voters);
    const daysAgo = seededRandomInt(0, 60);
    const contactDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    contacts.push({
      id: `contact-${i + 1}`,
      voterId: voter.id,
      campaignId: demoCampaign.id,
      userId: demoUser.id,
      type: seededRandomItem(contactTypes),
      outcome: seededRandomItem(outcomes),
      contactDate: contactDate.toISOString(),
      notes: seededRandomItem(contactNotes),
      topics: Array.from({ length: seededRandomInt(1, 3) }, () => seededRandomItem(topics)).filter((v, i, a) => a.indexOf(v) === i),
      nextAction: seededRandom() > 0.7 ? seededRandomItem(['再次拜訪', '電話追蹤', '寄送文宣', '邀請參加活動']) : null,
      followUpDate: seededRandom() > 0.8 ? new Date(Date.now() + seededRandomInt(3, 14) * 24 * 60 * 60 * 1000).toISOString() : null,
      createdAt: contactDate.toISOString(),
      updatedAt: contactDate.toISOString(),
      voter: {
        id: voter.id,
        name: voter.name,
        phone: voter.phone,
        lineId: voter.lineId,
        lineUrl: voter.lineUrl,
        address: voter.address,
        stance: voter.stance,
      },
      user: {
        id: demoUser.id,
        name: demoUser.name,
      },
    });
  }

  return contacts.sort((a, b) => new Date(b.contactDate).getTime() - new Date(a.contactDate).getTime());
}

// 生成活動
function generateEvents(voters: any[], count: number): any[] {
  seed = 67890; // 使用不同種子
  const events: any[] = [];

  for (let i = 0; i < count; i++) {
    const host = seededRandomItem(voters);
    const daysOffset = seededRandomInt(-30, 30);
    const startTime = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);
    startTime.setHours(seededRandomInt(9, 19), 0, 0, 0);
    const endTime = new Date(startTime.getTime() + seededRandomInt(1, 3) * 60 * 60 * 1000);
    const status = daysOffset < -7 ? 'COMPLETED' : daysOffset < 0 ? 'CONFIRMED' : seededRandomItem(eventStatuses);

    events.push({
      id: `event-${i + 1}`,
      campaignId: demoCampaign.id,
      type: seededRandomItem(eventTypes),
      status,
      name: `${host.name.substring(0, 1)}${seededRandomItem(['先生', '小姐', '女士'])}${seededRandomItem(eventNames)}`,
      description: `在${host.districtName}${host.village}舉辦`,
      hostVoterId: host.id,
      address: host.address,
      locationLat: host.latitude,
      locationLng: host.longitude,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      expectedAttendees: seededRandomInt(10, 50),
      actualAttendees: status === 'COMPLETED' ? seededRandomInt(8, 45) : null,
      createdBy: demoUser.id,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      host: {
        id: host.id,
        name: host.name,
        phone: host.phone,
      },
    });
  }

  return events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

// 生成行程
function generateSchedules(voters: any[]): any[] {
  seed = 11111; // 使用不同種子
  const schedules: any[] = [];

  for (let dayOffset = -14; dayOffset <= 7; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    const status = dayOffset < -3 ? 'COMPLETED' : 
                   dayOffset < 0 ? 'IN_PROGRESS' : 
                   dayOffset === 0 ? 'PLANNED' :
                   seededRandomItem(['COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'PLANNED', 'DRAFT']);

    const items: any[] = [];
    const itemCount = seededRandomInt(5, 12);
    const shuffledVoters = [...voters].sort(() => seededRandom() - 0.5).slice(0, itemCount);
    let currentTime = new Date(date);
    currentTime.setHours(9, 0, 0, 0);

    for (let i = 0; i < shuffledVoters.length; i++) {
      const voter = shuffledVoters[i];
      const itemStatus = status === 'COMPLETED' ? 'COMPLETED' :
                        status === 'IN_PROGRESS' && i < 3 ? 'COMPLETED' :
                        'PENDING';

      items.push({
        id: `schedule-item-${dayOffset + 15}-${i + 1}`,
        scheduleId: `schedule-${dayOffset + 15}`,
        order: i + 1,
        type: 'VOTER_VISIT',
        voterId: voter.id,
        address: voter.address,
        locationLat: voter.latitude,
        locationLng: voter.longitude,
        plannedTime: new Date(currentTime).toISOString(),
        duration: seededRandomInt(15, 45),
        status: itemStatus,
        travelDistance: i > 0 ? seededRandomInt(1, 5) / 10 : 0,
        travelDuration: i > 0 ? seededRandomInt(5, 20) : 0,
        voter: {
          id: voter.id,
          name: voter.name,
          phone: voter.phone,
          address: voter.address,
          stance: voter.stance,
        },
      });

      currentTime = new Date(currentTime.getTime() + seededRandomInt(30, 60) * 60 * 1000);
    }

    schedules.push({
      id: `schedule-${dayOffset + 15}`,
      campaignId: demoCampaign.id,
      userId: demoUser.id,
      date: date.toISOString(),
      title: `${date.getMonth() + 1}/${date.getDate()} 拜訪行程`,
      description: `${seededRandomItem(districts).name}重點選民拜訪`,
      status,
      totalDistance: seededRandomInt(5, 20),
      estimatedDuration: seededRandomInt(180, 480),
      items,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return schedules;
}

// 生成選民關係
function generateRelationships(voters: any[], count: number): any[] {
  seed = 22222; // 使用不同種子
  const relationships: any[] = [];
  const usedPairs = new Set<string>();

  for (let i = 0; i < count; i++) {
    const sourceIdx = seededRandomInt(0, voters.length - 1);
    let targetIdx = seededRandomInt(0, voters.length - 1);
    while (targetIdx === sourceIdx) {
      targetIdx = seededRandomInt(0, voters.length - 1);
    }

    const pairKey = `${sourceIdx}-${targetIdx}`;
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);

    relationships.push({
      id: `relationship-${i + 1}`,
      sourceVoterId: voters[sourceIdx].id,
      targetVoterId: voters[targetIdx].id,
      relationType: seededRandomItem(relationTypes),
      influenceWeight: seededRandomInt(30, 90),
      notes: seededRandom() > 0.5 ? seededRandomItem(['認識多年', '同社區', '工作關係', '親戚介紹']) : null,
      source: {
        id: voters[sourceIdx].id,
        name: voters[sourceIdx].name,
      },
      target: {
        id: voters[targetIdx].id,
        name: voters[targetIdx].name,
      },
    });
  }

  return relationships;
}

// 生成選區資料
function generateDistricts(): any[] {
  const districtRecords: any[] = [];
  
  // 台北市
  const taipeiCity = {
    id: 'district-taipei',
    name: '台北市',
    level: 'CITY',
    code: 'TPE',
    parentId: null,
    registeredVoters: 2200000,
    centerLat: 25.0330,
    centerLng: 121.5654,
  };
  districtRecords.push(taipeiCity);

  // 各區
  districts.forEach((district, idx) => {
    const districtRecord = {
      id: `district-${idx + 1}`,
      name: district.name,
      level: 'DISTRICT',
      parentId: taipeiCity.id,
      registeredVoters: randomInt(100000, 300000),
      centerLat: district.lat,
      centerLng: district.lng,
    };
    districtRecords.push(districtRecord);

    // 各里
    district.villages.forEach((village, vidx) => {
      districtRecords.push({
        id: `village-${idx + 1}-${vidx + 1}`,
        name: village,
        level: 'VILLAGE',
        parentId: districtRecord.id,
        registeredVoters: randomInt(2000, 8000),
        centerLat: district.lat + (Math.random() - 0.5) * 0.01,
        centerLng: district.lng + (Math.random() - 0.5) * 0.01,
      });
    });
  });

  return districtRecords;
}

// ==================== 匯出示範資料 ====================

// 防禦性包裝：確保任何資料生成失敗時不會導致整個模組崩潰
function safeGenerate<T>(name: string, fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (e) {
    console.error(`[Demo] ${name} failed:`, e);
    return fallback;
  }
}

// 生成所有資料（每個步驟獨立 try-catch，避免單點失敗導致全部 undefined）
export const demoVoters = safeGenerate('generateVoters', () => generateVoters(500), []);
export const demoContacts = safeGenerate('generateContacts', () => generateContacts(demoVoters, 800), []);
export const demoEvents = safeGenerate('generateEvents', () => generateEvents(demoVoters, 25), []);
export const demoSchedules = safeGenerate('generateSchedules', () => generateSchedules(demoVoters), []);
export const demoRelationships = safeGenerate('generateRelationships', () => generateRelationships(demoVoters, 100), []);
export const demoDistricts = safeGenerate('generateDistricts', () => generateDistricts(), []);

// 統計資料（安全存取，避免空陣列導致 NaN）
export const demoStats = safeGenerate('demoStats', () => ({
  totalVoters: demoVoters.length,
  totalContacts: demoContacts.length,
  totalEvents: demoEvents.length,
  totalSchedules: demoSchedules.length,
  
  // 支持度分布
  stanceDistribution: {
    STRONG_SUPPORT: demoVoters.filter(v => v.stance === 'STRONG_SUPPORT').length,
    SUPPORT: demoVoters.filter(v => v.stance === 'SUPPORT').length,
    LEAN_SUPPORT: demoVoters.filter(v => v.stance === 'LEAN_SUPPORT').length,
    NEUTRAL: demoVoters.filter(v => v.stance === 'NEUTRAL').length,
    UNDECIDED: demoVoters.filter(v => v.stance === 'UNDECIDED').length,
    LEAN_OPPOSE: demoVoters.filter(v => v.stance === 'LEAN_OPPOSE').length,
    OPPOSE: demoVoters.filter(v => v.stance === 'OPPOSE').length,
    STRONG_OPPOSE: demoVoters.filter(v => v.stance === 'STRONG_OPPOSE').length,
  },
  
  // 區域分布
  districtDistribution: districts.map(d => ({
    name: d.name,
    count: demoVoters.filter(v => v.districtName === d.name).length,
  })),
  
  // 接觸類型分布
  contactTypeDistribution: contactTypes.map(t => ({
    type: t,
    count: demoContacts.filter(c => c.type === t).length,
  })),
  
  // 每日接觸數（最近 30 天）
  dailyContacts: Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    return {
      date: date.toISOString().split('T')[0],
      count: demoContacts.filter(c => {
        const contactDate = new Date(c.contactDate);
        return contactDate >= date && contactDate < nextDate;
      }).length,
    };
  }).reverse(),
}), {
  totalVoters: 0,
  totalContacts: 0,
  totalEvents: 0,
  totalSchedules: 0,
  stanceDistribution: {
    STRONG_SUPPORT: 0, SUPPORT: 0, LEAN_SUPPORT: 0, NEUTRAL: 0,
    UNDECIDED: 0, LEAN_OPPOSE: 0, OPPOSE: 0, STRONG_OPPOSE: 0,
  },
  districtDistribution: [],
  contactTypeDistribution: [],
  dailyContacts: [],
});

// 訂閱方案（示範用）
export const demoPlans = [
  {
    id: 'plan-free',
    name: '免費試用',
    description: '14 天免費體驗所有功能',
    price: 0,
    interval: 'MONTH',
    features: ['選民管理', '接觸紀錄', '行程規劃', '地圖檢視', '基礎分析'],
    limits: { voters: 100, contacts: 500 },
  },
  {
    id: 'plan-pro',
    name: '專業版',
    description: '適合個人候選人使用',
    price: 1990,
    interval: 'MONTH',
    features: ['無限選民', '無限接觸紀錄', '進階分析', '團隊協作', '優先支援'],
    limits: { voters: -1, contacts: -1 },
  },
];
