import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DistrictLevel } from '@prisma/client';

@Injectable()
export class DistrictsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const district = await this.prisma.district.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!district) {
      throw new NotFoundException('選區不存在');
    }

    return district;
  }

  async findByCity(city: string) {
    // 先找到城市
    const cityDistrict = await this.prisma.district.findFirst({
      where: {
        name: city,
        level: DistrictLevel.CITY,
      },
    });

    if (!cityDistrict) {
      return [];
    }

    // 取得該城市下的所有區
    return this.prisma.district.findMany({
      where: {
        parentId: cityDistrict.id,
        level: DistrictLevel.DISTRICT,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findByParent(parentId: string) {
    return this.prisma.district.findMany({
      where: { parentId },
      orderBy: { name: 'asc' },
    });
  }

  async findAll(level?: DistrictLevel) {
    const where = level ? { level } : {};
    return this.prisma.district.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getStats(districtId: string, campaignId: string) {
    const district = await this.findById(districtId);

    // 查詢該選區的選民統計
    const stats = await this.prisma.voter.groupBy({
      by: ['stance'],
      where: {
        campaignId,
        OR: [
          { city: district.name },
          { districtName: district.name },
          { village: district.name },
        ],
      },
      _count: true,
    });

    const totalVoters = stats.reduce((sum, s) => sum + s._count, 0);
    const contactedVoters = await this.prisma.voter.count({
      where: {
        campaignId,
        OR: [
          { city: district.name },
          { districtName: district.name },
          { village: district.name },
        ],
        contactCount: { gt: 0 },
      },
    });

    const stanceDistribution = stats.reduce(
      (acc, s) => ({ ...acc, [s.stance]: s._count }),
      {},
    );

    // 計算支持率
    const supportCount = stats
      .filter(s => ['STRONG_SUPPORT', 'SUPPORT', 'LEAN_SUPPORT'].includes(s.stance))
      .reduce((sum, s) => sum + s._count, 0);

    return {
      districtId: district.id,
      districtName: district.name,
      totalVoters,
      registeredVoters: district.registeredVoters,
      contactedVoters,
      contactRate: totalVoters > 0 ? contactedVoters / totalVoters : 0,
      supportRate: totalVoters > 0 ? supportCount / totalVoters : 0,
      stanceDistribution,
    };
  }

  async create(data: {
    name: string;
    level: DistrictLevel;
    parentId?: string;
    code?: string;
    registeredVoters?: number;
    centerLat?: number;
    centerLng?: number;
  }) {
    return this.prisma.district.create({
      data,
    });
  }

  async seedTaiwanDistricts() {
    // 台灣縣市及其區域資料
    const citiesWithDistricts: {
      name: string;
      lat: number;
      lng: number;
      districts: string[];
    }[] = [
      {
        name: '台北市',
        lat: 25.033,
        lng: 121.5654,
        districts: [
          '中正區', '大同區', '中山區', '松山區', '大安區', '萬華區',
          '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區',
        ],
      },
      {
        name: '新北市',
        lat: 25.0169,
        lng: 121.4627,
        districts: [
          '板橋區', '三重區', '中和區', '永和區', '新莊區', '新店區',
          '土城區', '蘆洲區', '樹林區', '汐止區', '鶯歌區', '三峽區',
          '淡水區', '瑞芳區', '五股區', '泰山區', '林口區', '深坑區',
          '石碇區', '坪林區', '三芝區', '石門區', '八里區', '平溪區',
          '雙溪區', '貢寮區', '金山區', '萬里區', '烏來區',
        ],
      },
      {
        name: '桃園市',
        lat: 24.9936,
        lng: 121.301,
        districts: [
          '桃園區', '中壢區', '平鎮區', '八德區', '楊梅區', '蘆竹區',
          '大溪區', '龍潭區', '龜山區', '大園區', '觀音區', '新屋區', '復興區',
        ],
      },
      {
        name: '台中市',
        lat: 24.1477,
        lng: 120.6736,
        districts: [
          '中區', '東區', '南區', '西區', '北區', '北屯區', '西屯區',
          '南屯區', '太平區', '大里區', '霧峰區', '烏日區', '豐原區',
          '后里區', '石岡區', '東勢區', '和平區', '新社區', '潭子區',
          '大雅區', '神岡區', '大肚區', '沙鹿區', '龍井區', '梧棲區',
          '清水區', '大甲區', '外埔區', '大安區',
        ],
      },
      {
        name: '台南市',
        lat: 22.9998,
        lng: 120.227,
        districts: [
          '中西區', '東區', '南區', '北區', '安平區', '安南區', '永康區',
          '歸仁區', '新化區', '左鎮區', '玉井區', '楠西區', '南化區',
          '仁德區', '關廟區', '龍崎區', '官田區', '麻豆區', '佳里區',
          '西港區', '七股區', '將軍區', '學甲區', '北門區', '新營區',
          '後壁區', '白河區', '東山區', '六甲區', '下營區', '柳營區',
          '鹽水區', '善化區', '大內區', '山上區', '新市區', '安定區',
        ],
      },
      {
        name: '高雄市',
        lat: 22.6273,
        lng: 120.3014,
        districts: [
          '楠梓區', '左營區', '鼓山區', '三民區', '鹽埕區', '前金區',
          '新興區', '苓雅區', '前鎮區', '旗津區', '小港區', '鳳山區',
          '林園區', '大寮區', '大樹區', '大社區', '仁武區', '鳥松區',
          '岡山區', '橋頭區', '燕巢區', '田寮區', '阿蓮區', '路竹區',
          '湖內區', '茄萣區', '永安區', '彌陀區', '梓官區', '旗山區',
          '美濃區', '六龜區', '甲仙區', '杉林區', '內門區', '茂林區',
          '桃源區', '那瑪夏區',
        ],
      },
      {
        name: '基隆市',
        lat: 25.1276,
        lng: 121.7392,
        districts: ['中正區', '七堵區', '暖暖區', '仁愛區', '中山區', '安樂區', '信義區'],
      },
      {
        name: '新竹市',
        lat: 24.8138,
        lng: 120.9675,
        districts: ['東區', '北區', '香山區'],
      },
      {
        name: '嘉義市',
        lat: 23.4801,
        lng: 120.4491,
        districts: ['東區', '西區'],
      },
      {
        name: '新竹縣',
        lat: 24.8387,
        lng: 121.0178,
        districts: [
          '竹北市', '竹東鎮', '新埔鎮', '關西鎮', '湖口鄉', '新豐鄉',
          '芎林鄉', '橫山鄉', '北埔鄉', '寶山鄉', '峨眉鄉', '尖石鄉', '五峰鄉',
        ],
      },
      {
        name: '苗栗縣',
        lat: 24.5602,
        lng: 120.8214,
        districts: [
          '苗栗市', '頭份市', '竹南鎮', '後龍鎮', '通霄鎮', '苑裡鎮',
          '卓蘭鎮', '造橋鄉', '西湖鄉', '頭屋鄉', '公館鄉', '銅鑼鄉',
          '三義鄉', '大湖鄉', '獅潭鄉', '三灣鄉', '南庄鄉', '泰安鄉',
        ],
      },
      {
        name: '彰化縣',
        lat: 24.0518,
        lng: 120.5161,
        districts: [
          '彰化市', '員林市', '鹿港鎮', '和美鎮', '北斗鎮', '溪湖鎮',
          '田中鎮', '二林鎮', '線西鄉', '伸港鄉', '福興鄉', '秀水鄉',
          '花壇鄉', '芬園鄉', '大村鄉', '埔鹽鄉', '埔心鄉', '永靖鄉',
          '社頭鄉', '二水鄉', '田尾鄉', '埤頭鄉', '芳苑鄉', '大城鄉',
          '竹塘鄉', '溪州鄉',
        ],
      },
      {
        name: '南投縣',
        lat: 23.9609,
        lng: 120.9718,
        districts: [
          '南投市', '埔里鎮', '草屯鎮', '竹山鎮', '集集鎮', '名間鄉',
          '鹿谷鄉', '中寮鄉', '魚池鄉', '國姓鄉', '水里鄉', '信義鄉', '仁愛鄉',
        ],
      },
      {
        name: '雲林縣',
        lat: 23.7092,
        lng: 120.4313,
        districts: [
          '斗六市', '斗南鎮', '虎尾鎮', '西螺鎮', '土庫鎮', '北港鎮',
          '林內鄉', '古坑鄉', '大埤鄉', '莿桐鄉', '褒忠鄉', '二崙鄉',
          '崙背鄉', '麥寮鄉', '東勢鄉', '台西鄉', '元長鄉', '四湖鄉',
          '口湖鄉', '水林鄉',
        ],
      },
      {
        name: '嘉義縣',
        lat: 23.4519,
        lng: 120.2553,
        districts: [
          '太保市', '朴子市', '布袋鎮', '大林鎮', '民雄鄉', '溪口鄉',
          '新港鄉', '六腳鄉', '東石鄉', '義竹鄉', '鹿草鄉', '水上鄉',
          '中埔鄉', '竹崎鄉', '梅山鄉', '番路鄉', '大埔鄉', '阿里山鄉',
        ],
      },
      {
        name: '屏東縣',
        lat: 22.5519,
        lng: 120.5487,
        districts: [
          '屏東市', '潮州鎮', '東港鎮', '恆春鎮', '萬丹鄉', '長治鄉',
          '麟洛鄉', '九如鄉', '里港鄉', '鹽埔鄉', '高樹鄉', '萬巒鄉',
          '內埔鄉', '竹田鄉', '新埤鄉', '枋寮鄉', '新園鄉', '崁頂鄉',
          '林邊鄉', '南州鄉', '佳冬鄉', '琉球鄉', '車城鄉', '滿州鄉',
          '枋山鄉', '三地門鄉', '霧台鄉', '瑪家鄉', '泰武鄉', '來義鄉',
          '春日鄉', '獅子鄉', '牡丹鄉',
        ],
      },
      {
        name: '宜蘭縣',
        lat: 24.7021,
        lng: 121.7378,
        districts: [
          '宜蘭市', '羅東鎮', '蘇澳鎮', '頭城鎮', '礁溪鄉', '壯圍鄉',
          '員山鄉', '冬山鄉', '五結鄉', '三星鄉', '大同鄉', '南澳鄉',
        ],
      },
      {
        name: '花蓮縣',
        lat: 23.9871,
        lng: 121.6015,
        districts: [
          '花蓮市', '鳳林鎮', '玉里鎮', '新城鄉', '吉安鄉', '壽豐鄉',
          '光復鄉', '豐濱鄉', '瑞穗鄉', '富里鄉', '秀林鄉', '萬榮鄉', '卓溪鄉',
        ],
      },
      {
        name: '台東縣',
        lat: 22.7583,
        lng: 121.1444,
        districts: [
          '台東市', '成功鎮', '關山鎮', '長濱鄉', '海端鄉', '池上鄉',
          '東河鄉', '鹿野鄉', '延平鄉', '卑南鄉', '金峰鄉', '大武鄉',
          '達仁鄉', '綠島鄉', '蘭嶼鄉', '太麻里鄉',
        ],
      },
      {
        name: '澎湖縣',
        lat: 23.5711,
        lng: 119.5793,
        districts: ['馬公市', '湖西鄉', '白沙鄉', '西嶼鄉', '望安鄉', '七美鄉'],
      },
      {
        name: '金門縣',
        lat: 24.4493,
        lng: 118.3767,
        districts: ['金城鎮', '金湖鎮', '金沙鎮', '金寧鄉', '烈嶼鄉', '烏坵鄉'],
      },
      {
        name: '連江縣',
        lat: 26.1505,
        lng: 119.9499,
        districts: ['南竿鄉', '北竿鄉', '莒光鄉', '東引鄉'],
      },
    ];

    for (const cityData of citiesWithDistricts) {
      // 建立或更新縣市
      const city = await this.prisma.district.upsert({
        where: {
          name_level_parentId: {
            name: cityData.name,
            level: DistrictLevel.CITY,
            parentId: null as any,
          },
        },
        update: {
          centerLat: cityData.lat,
          centerLng: cityData.lng,
        },
        create: {
          name: cityData.name,
          level: DistrictLevel.CITY,
          centerLat: cityData.lat,
          centerLng: cityData.lng,
        },
      });

      // 建立該縣市的區域
      for (const districtName of cityData.districts) {
        await this.prisma.district.upsert({
          where: {
            name_level_parentId: {
              name: districtName,
              level: DistrictLevel.DISTRICT,
              parentId: city.id,
            },
          },
          update: {},
          create: {
            name: districtName,
            level: DistrictLevel.DISTRICT,
            parentId: city.id,
          },
        });
      }
    }

    return { message: '已建立台灣縣市及區域資料' };
  }
}
