import { PrismaClient, PlanCategory, PlanInterval } from '@prisma/client';

const prisma = new PrismaClient();

// 戰區分級定價資料
// 基準：三級戰區－南投縣
// 依「戰區強度 × 人口比例」調整

interface CityPricing {
  city: string;
  regionLevel: number;
  prices: {
    VILLAGE_CHIEF: number;
    REPRESENTATIVE: number;
    COUNCILOR: number;
    MAYOR: number;
    LEGISLATOR: number;
  };
}

// 完整價目表
const pricingData: CityPricing[] = [
  // 一級戰區｜六都（高度競爭）
  {
    city: '新北市',
    regionLevel: 1,
    prices: {
      VILLAGE_CHIEF: 231200,
      REPRESENTATIVE: 257100,
      COUNCILOR: 343600,
      MAYOR: 1451000,
      LEGISLATOR: 1008000,
    },
  },
  {
    city: '台北市',
    regionLevel: 1,
    prices: {
      VILLAGE_CHIEF: 139100,
      REPRESENTATIVE: 154700,
      COUNCILOR: 206800,
      MAYOR: 873600,
      LEGISLATOR: 607000,
    },
  },
  {
    city: '桃園市',
    regionLevel: 1,
    prices: {
      VILLAGE_CHIEF: 134300,
      REPRESENTATIVE: 149400,
      COUNCILOR: 199600,
      MAYOR: 843200,
      LEGISLATOR: 585900,
    },
  },
  {
    city: '台中市',
    regionLevel: 1,
    prices: {
      VILLAGE_CHIEF: 163900,
      REPRESENTATIVE: 182300,
      COUNCILOR: 243600,
      MAYOR: 1029600,
      LEGISLATOR: 715000,
    },
  },
  {
    city: '台南市',
    regionLevel: 1,
    prices: {
      VILLAGE_CHIEF: 106100,
      REPRESENTATIVE: 118100,
      COUNCILOR: 157600,
      MAYOR: 665700,
      LEGISLATOR: 462500,
    },
  },
  {
    city: '高雄市',
    regionLevel: 1,
    prices: {
      VILLAGE_CHIEF: 155700,
      REPRESENTATIVE: 173200,
      COUNCILOR: 231200,
      MAYOR: 976500,
      LEGISLATOR: 678900,
    },
  },

  // 二級戰區｜次高強度選區
  {
    city: '彰化縣',
    regionLevel: 2,
    prices: {
      VILLAGE_CHIEF: 69100,
      REPRESENTATIVE: 76800,
      COUNCILOR: 102800,
      MAYOR: 434000,
      LEGISLATOR: 301500,
    },
  },
  {
    city: '屏東縣',
    regionLevel: 2,
    prices: {
      VILLAGE_CHIEF: 44600,
      REPRESENTATIVE: 49600,
      COUNCILOR: 66400,
      MAYOR: 280400,
      LEGISLATOR: 195000,
    },
  },
  {
    city: '新竹縣',
    regionLevel: 2,
    prices: {
      VILLAGE_CHIEF: 34100,
      REPRESENTATIVE: 38000,
      COUNCILOR: 50800,
      MAYOR: 214500,
      LEGISLATOR: 149200,
    },
  },
  {
    city: '新竹市',
    regionLevel: 2,
    prices: {
      VILLAGE_CHIEF: 26000,
      REPRESENTATIVE: 29000,
      COUNCILOR: 38700,
      MAYOR: 163400,
      LEGISLATOR: 113700,
    },
  },

  // 三級戰區｜全台定價基準
  {
    city: '南投縣',
    regionLevel: 3,
    prices: {
      VILLAGE_CHIEF: 26800,
      REPRESENTATIVE: 29800,
      COUNCILOR: 39800,
      MAYOR: 168000,
      LEGISLATOR: 116800,
    },
  },
  {
    city: '苗栗縣',
    regionLevel: 3,
    prices: {
      VILLAGE_CHIEF: 30300,
      REPRESENTATIVE: 33700,
      COUNCILOR: 45000,
      MAYOR: 190000,
      LEGISLATOR: 132000,
    },
  },
  {
    city: '雲林縣',
    regionLevel: 3,
    prices: {
      VILLAGE_CHIEF: 37200,
      REPRESENTATIVE: 41400,
      COUNCILOR: 55300,
      MAYOR: 233500,
      LEGISLATOR: 162300,
    },
  },
  {
    city: '宜蘭縣',
    regionLevel: 3,
    prices: {
      VILLAGE_CHIEF: 25700,
      REPRESENTATIVE: 28600,
      COUNCILOR: 38200,
      MAYOR: 161200,
      LEGISLATOR: 112000,
    },
  },

  // 四級戰區｜低密度選區
  {
    city: '嘉義縣',
    regionLevel: 4,
    prices: {
      VILLAGE_CHIEF: 27000,
      REPRESENTATIVE: 30000,
      COUNCILOR: 40200,
      MAYOR: 169700,
      LEGISLATOR: 118000,
    },
  },
  {
    city: '基隆市',
    regionLevel: 4,
    prices: {
      VILLAGE_CHIEF: 20500,
      REPRESENTATIVE: 22800,
      COUNCILOR: 30600,
      MAYOR: 129200,
      LEGISLATOR: 89800,
    },
  },
  {
    city: '花蓮縣',
    regionLevel: 4,
    prices: {
      VILLAGE_CHIEF: 17800,
      REPRESENTATIVE: 19800,
      COUNCILOR: 26600,
      MAYOR: 112300,
      LEGISLATOR: 78100,
    },
  },
  {
    city: '嘉義市',
    regionLevel: 4,
    prices: {
      VILLAGE_CHIEF: 14900,
      REPRESENTATIVE: 16600,
      COUNCILOR: 22200,
      MAYOR: 93700,
      LEGISLATOR: 65200,
    },
  },
  {
    city: '台東縣',
    regionLevel: 4,
    prices: {
      VILLAGE_CHIEF: 11900,
      REPRESENTATIVE: 13200,
      COUNCILOR: 17700,
      MAYOR: 74700,
      LEGISLATOR: 51900,
    },
  },

  // 五級戰區｜離島（專案型）
  {
    city: '金門縣',
    regionLevel: 5,
    prices: {
      VILLAGE_CHIEF: 8000,
      REPRESENTATIVE: 8900,
      COUNCILOR: 11900,
      MAYOR: 50200,
      LEGISLATOR: 34900,
    },
  },
  {
    city: '澎湖縣',
    regionLevel: 5,
    prices: {
      VILLAGE_CHIEF: 6100,
      REPRESENTATIVE: 6800,
      COUNCILOR: 9100,
      MAYOR: 38400,
      LEGISLATOR: 26700,
    },
  },
  {
    city: '連江縣',
    regionLevel: 5,
    prices: {
      VILLAGE_CHIEF: 800,
      REPRESENTATIVE: 900,
      COUNCILOR: 1200,
      MAYOR: 5100,
      LEGISLATOR: 3500,
    },
  },
];

// 選舉類型對應中文名稱
const categoryLabels: Record<PlanCategory, string> = {
  VILLAGE_CHIEF: '里長',
  REPRESENTATIVE: '民代',
  COUNCILOR: '議員',
  MAYOR: '市長',
  LEGISLATOR: '立委',
};

// 戰區等級對應說明
const regionLevelLabels: Record<number, string> = {
  1: '一級戰區',
  2: '二級戰區',
  3: '三級戰區',
  4: '四級戰區',
  5: '五級戰區',
};

async function seedPlans() {
  console.log('開始建立分級定價方案...');

  // 首先，保留免費試用方案
  const existingFreeTrial = await prisma.plan.findUnique({
    where: { code: 'FREE_TRIAL' },
  });

  if (!existingFreeTrial) {
    await prisma.plan.create({
      data: {
        name: '免費試用',
        code: 'FREE_TRIAL',
        price: 0,
        interval: PlanInterval.MONTH,
        voterLimit: 500,
        teamLimit: 2,
        features: ['7 天免費試用', '完整功能體驗', '500 位選民上限', '2 位團隊成員'],
        isActive: true,
        sortOrder: 0,
      },
    });
    console.log('✓ 建立免費試用方案');
  }

  // 建立所有縣市 × 選舉類型的方案
  let createdCount = 0;
  let updatedCount = 0;

  for (const cityData of pricingData) {
    for (const [category, price] of Object.entries(cityData.prices)) {
      const planCategory = category as PlanCategory;
      const code = `${cityData.city}_${category}_MONTHLY`;
      const name = `${cityData.city}${categoryLabels[planCategory]}方案`;

      const existingPlan = await prisma.plan.findUnique({
        where: { code },
      });

      const planData = {
        name,
        price,
        interval: PlanInterval.MONTH,
        voterLimit: null, // 無限制
        teamLimit: 10, // 預設 10 位團隊成員
        features: [
          `${regionLevelLabels[cityData.regionLevel]}定價`,
          '無限選民數量',
          '10 位團隊成員',
          '完整選情分析',
          '行程管理功能',
          '資料匯出功能',
        ],
        isActive: true,
        sortOrder: cityData.regionLevel * 100 + Object.keys(categoryLabels).indexOf(category),
        city: cityData.city,
        category: planCategory,
        regionLevel: cityData.regionLevel,
        basePrice: price,
        description: `${cityData.city}${categoryLabels[planCategory]}選舉專用方案，${regionLevelLabels[cityData.regionLevel]}定價`,
      };

      if (existingPlan) {
        await prisma.plan.update({
          where: { code },
          data: planData,
        });
        updatedCount++;
      } else {
        await prisma.plan.create({
          data: {
            code,
            ...planData,
          },
        });
        createdCount++;
      }
    }
    console.log(`✓ ${cityData.city} - ${cityData.regionLevel}級戰區`);
  }

  console.log(`\n完成！新建 ${createdCount} 筆，更新 ${updatedCount} 筆方案`);
  console.log(`總計 ${pricingData.length} 個縣市 × 5 種選舉類型 = ${pricingData.length * 5} 筆方案`);
}

async function main() {
  try {
    await seedPlans();
  } catch (error) {
    console.error('種子資料建立失敗:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
