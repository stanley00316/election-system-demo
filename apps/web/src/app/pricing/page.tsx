'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Zap, Shield, Users, BarChart3, Loader2, MapPin, Vote, ChevronDown, ArrowLeft, Info } from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { subscriptionsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth';

// 選舉類型中文標籤（用於顯示引導訊息）
const upgradeElectionTypeLabels: Record<string, string> = {
  VILLAGE_CHIEF: '里長',
  TOWNSHIP_REP: '民代',
  CITY_COUNCILOR: '議員',
  MAYOR: '市長',
  LEGISLATOR: '立委',
  PRESIDENT: '總統',
};

interface CityGroup {
  regionLevel: number;
  label: string;
  cities: string[];
}

interface ElectionType {
  code: string;
  label: string;
  category: string;
}

interface Plan {
  id: string;
  name: string;
  code: string;
  price: number;
  interval: string;
  voterLimit: number | null;
  teamLimit: number | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  city: string | null;
  category: string | null;
  regionLevel: number | null;
  description: string | null;
}

const electionTypeLabels: Record<string, string> = {
  VILLAGE_CHIEF: '里長',
  TOWNSHIP_REP: '民代',
  CITY_COUNCILOR: '議員',
  MAYOR: '市長',
  LEGISLATOR: '立委',
};

const regionLevelColors: Record<number, string> = {
  1: 'bg-red-100 text-red-800',
  2: 'bg-orange-100 text-orange-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-green-100 text-green-800',
  5: 'bg-blue-100 text-blue-800',
};

// 靜態 fallback 資料：API 不可用時仍可正常顯示選項
const FALLBACK_CITY_GROUPS: CityGroup[] = [
  { regionLevel: 1, label: '一級戰區（六都）', cities: ['新北市', '台北市', '桃園市', '台中市', '台南市', '高雄市'] },
  { regionLevel: 2, label: '二級戰區', cities: ['彰化縣', '屏東縣', '新竹縣', '新竹市'] },
  { regionLevel: 3, label: '三級戰區（基準）', cities: ['南投縣', '苗栗縣', '雲林縣', '宜蘭縣'] },
  { regionLevel: 4, label: '四級戰區', cities: ['嘉義縣', '基隆市', '花蓮縣', '嘉義市', '台東縣'] },
  { regionLevel: 5, label: '五級戰區（離島）', cities: ['金門縣', '澎湖縣', '連江縣'] },
];

const FALLBACK_ELECTION_TYPES: ElectionType[] = [
  { code: 'VILLAGE_CHIEF', label: '里長', category: 'VILLAGE_CHIEF' },
  { code: 'TOWNSHIP_REP', label: '民代', category: 'REPRESENTATIVE' },
  { code: 'CITY_COUNCILOR', label: '議員', category: 'COUNCILOR' },
  { code: 'MAYOR', label: '市長', category: 'MAYOR' },
  { code: 'LEGISLATOR', label: '立委', category: 'LEGISLATOR' },
];

// 完整定價表（與 seed-plans.ts 同步）
const FALLBACK_PRICING: Record<string, { regionLevel: number; prices: Record<string, number> }> = {
  '新北市': { regionLevel: 1, prices: { VILLAGE_CHIEF: 231200, REPRESENTATIVE: 257100, COUNCILOR: 343600, MAYOR: 1451000, LEGISLATOR: 1008000 } },
  '台北市': { regionLevel: 1, prices: { VILLAGE_CHIEF: 139100, REPRESENTATIVE: 154700, COUNCILOR: 206800, MAYOR: 873600, LEGISLATOR: 607000 } },
  '桃園市': { regionLevel: 1, prices: { VILLAGE_CHIEF: 134300, REPRESENTATIVE: 149400, COUNCILOR: 199600, MAYOR: 843200, LEGISLATOR: 585900 } },
  '台中市': { regionLevel: 1, prices: { VILLAGE_CHIEF: 163900, REPRESENTATIVE: 182300, COUNCILOR: 243600, MAYOR: 1029600, LEGISLATOR: 715000 } },
  '台南市': { regionLevel: 1, prices: { VILLAGE_CHIEF: 106100, REPRESENTATIVE: 118100, COUNCILOR: 157600, MAYOR: 665700, LEGISLATOR: 462500 } },
  '高雄市': { regionLevel: 1, prices: { VILLAGE_CHIEF: 155700, REPRESENTATIVE: 173200, COUNCILOR: 231200, MAYOR: 976500, LEGISLATOR: 678900 } },
  '彰化縣': { regionLevel: 2, prices: { VILLAGE_CHIEF: 69100, REPRESENTATIVE: 76800, COUNCILOR: 102800, MAYOR: 434000, LEGISLATOR: 301500 } },
  '屏東縣': { regionLevel: 2, prices: { VILLAGE_CHIEF: 44600, REPRESENTATIVE: 49600, COUNCILOR: 66400, MAYOR: 280400, LEGISLATOR: 195000 } },
  '新竹縣': { regionLevel: 2, prices: { VILLAGE_CHIEF: 34100, REPRESENTATIVE: 38000, COUNCILOR: 50800, MAYOR: 214500, LEGISLATOR: 149200 } },
  '新竹市': { regionLevel: 2, prices: { VILLAGE_CHIEF: 26000, REPRESENTATIVE: 29000, COUNCILOR: 38700, MAYOR: 163400, LEGISLATOR: 113700 } },
  '南投縣': { regionLevel: 3, prices: { VILLAGE_CHIEF: 26800, REPRESENTATIVE: 29800, COUNCILOR: 39800, MAYOR: 168000, LEGISLATOR: 116800 } },
  '苗栗縣': { regionLevel: 3, prices: { VILLAGE_CHIEF: 30300, REPRESENTATIVE: 33700, COUNCILOR: 45000, MAYOR: 190000, LEGISLATOR: 132000 } },
  '雲林縣': { regionLevel: 3, prices: { VILLAGE_CHIEF: 37200, REPRESENTATIVE: 41400, COUNCILOR: 55300, MAYOR: 233500, LEGISLATOR: 162300 } },
  '宜蘭縣': { regionLevel: 3, prices: { VILLAGE_CHIEF: 25700, REPRESENTATIVE: 28600, COUNCILOR: 38200, MAYOR: 161200, LEGISLATOR: 112000 } },
  '嘉義縣': { regionLevel: 4, prices: { VILLAGE_CHIEF: 27000, REPRESENTATIVE: 30000, COUNCILOR: 40200, MAYOR: 169700, LEGISLATOR: 118000 } },
  '基隆市': { regionLevel: 4, prices: { VILLAGE_CHIEF: 20500, REPRESENTATIVE: 22800, COUNCILOR: 30600, MAYOR: 129200, LEGISLATOR: 89800 } },
  '花蓮縣': { regionLevel: 4, prices: { VILLAGE_CHIEF: 17800, REPRESENTATIVE: 19800, COUNCILOR: 26600, MAYOR: 112300, LEGISLATOR: 78100 } },
  '嘉義市': { regionLevel: 4, prices: { VILLAGE_CHIEF: 14900, REPRESENTATIVE: 16600, COUNCILOR: 22200, MAYOR: 93700, LEGISLATOR: 65200 } },
  '台東縣': { regionLevel: 4, prices: { VILLAGE_CHIEF: 11900, REPRESENTATIVE: 13200, COUNCILOR: 17700, MAYOR: 74700, LEGISLATOR: 51900 } },
  '金門縣': { regionLevel: 5, prices: { VILLAGE_CHIEF: 8000, REPRESENTATIVE: 8900, COUNCILOR: 11900, MAYOR: 50200, LEGISLATOR: 34900 } },
  '澎湖縣': { regionLevel: 5, prices: { VILLAGE_CHIEF: 6100, REPRESENTATIVE: 6800, COUNCILOR: 9100, MAYOR: 38400, LEGISLATOR: 26700 } },
  '連江縣': { regionLevel: 5, prices: { VILLAGE_CHIEF: 800, REPRESENTATIVE: 900, COUNCILOR: 1200, MAYOR: 5100, LEGISLATOR: 3500 } },
};

const ELECTION_CODE_TO_CATEGORY: Record<string, string> = {
  VILLAGE_CHIEF: 'VILLAGE_CHIEF',
  TOWNSHIP_REP: 'REPRESENTATIVE',
  CITY_COUNCILOR: 'COUNCILOR',
  MAYOR: 'MAYOR',
  LEGISLATOR: 'LEGISLATOR',
};

const regionLevelLabels: Record<number, string> = {
  1: '一級戰區', 2: '二級戰區', 3: '三級戰區', 4: '四級戰區', 5: '五級戰區',
};

function buildFallbackPlan(city: string, electionType: string): Plan | null {
  const cityData = FALLBACK_PRICING[city];
  if (!cityData) return null;
  const category = ELECTION_CODE_TO_CATEGORY[electionType];
  if (!category) return null;
  const price = cityData.prices[category];
  if (price === undefined) return null;
  const label = electionTypeLabels[electionType] || electionType;
  return {
    id: `fallback-${city}-${category}`,
    name: `${city}${label}方案`,
    code: `${city}_${category}_MONTHLY`,
    price,
    interval: 'MONTH',
    voterLimit: null,
    teamLimit: 10,
    features: [`${regionLevelLabels[cityData.regionLevel]}定價`, '無限選民數量', '10 位團隊成員', '完整選情分析', '行程管理功能', '資料匯出功能'],
    isActive: true,
    sortOrder: 0,
    city,
    category,
    regionLevel: cityData.regionLevel,
    description: `${city}${label}選舉專用方案，${regionLevelLabels[cityData.regionLevel]}定價`,
  };
}

const FALLBACK_TRIAL_PLAN: Plan = {
  id: 'fallback-trial',
  name: '免費試用',
  code: 'FREE_TRIAL',
  price: 0,
  interval: 'MONTH',
  voterLimit: 500,
  teamLimit: 2,
  features: ['選民管理', '接觸紀錄', '行程規劃', '地圖檢視', '基礎分析'],
  isActive: true,
  sortOrder: 0,
  city: null,
  category: null,
  regionLevel: null,
  description: '7 天免費試用',
};

function PricingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();
  
  // 智慧返回路徑：已登入返回主控台，未登入返回首頁
  const backUrl = isAuthenticated ? '/dashboard' : '/';
  
  // 從 URL 參數取得預選的縣市和選舉類型（來自 Campaign 建立頁面的升級連結）
  const urlCity = searchParams.get('city');
  const urlElectionType = searchParams.get('electionType');
  
  // 選擇狀態
  const [selectedCity, setSelectedCity] = useState<string>(urlCity || '');
  const [selectedElectionType, setSelectedElectionType] = useState<string>(urlElectionType || '');
  
  // 資料狀態
  const [cityGroups, setCityGroups] = useState<CityGroup[]>([]);
  const [electionTypes, setElectionTypes] = useState<ElectionType[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [trialPlan, setTrialPlan] = useState<Plan | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  
  // 載入狀態
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  // 載入縣市和選舉類型
  useEffect(() => {
    loadInitialData();
  }, []);

  // 當選擇變更時載入方案
  useEffect(() => {
    if (selectedCity && selectedElectionType) {
      loadPlan();
    }
  }, [selectedCity, selectedElectionType]);

  const loadInitialData = async () => {
    try {
      const [cities, types, subscription] = await Promise.all([
        subscriptionsApi.getAvailableCities(),
        subscriptionsApi.getElectionTypes(),
        subscriptionsApi.checkSubscription().catch(() => null),
      ]);
      // API 回傳空陣列時使用 fallback
      setCityGroups(cities?.length ? cities : FALLBACK_CITY_GROUPS);
      setElectionTypes(types?.length ? types : FALLBACK_ELECTION_TYPES);
      setCurrentSubscription(subscription);
    } catch (error) {
      console.error('載入資料失敗，使用靜態資料:', error);
      setCityGroups(FALLBACK_CITY_GROUPS);
      setElectionTypes(FALLBACK_ELECTION_TYPES);
    } finally {
      setIsLoadingCities(false);
    }
  };

  const loadPlan = async () => {
    setIsLoadingPlan(true);
    try {
      const result = await subscriptionsApi.getPlanByLocation(selectedCity, selectedElectionType);
      setCurrentPlan(result.plan);
      setTrialPlan(result.trialPlan);
    } catch (error) {
      console.error('載入方案失敗，使用靜態定價:', error);
      // API 不可用時使用 fallback 定價
      const fallbackPlan = buildFallbackPlan(selectedCity, selectedElectionType);
      setCurrentPlan(fallbackPlan);
      setTrialPlan(FALLBACK_TRIAL_PLAN);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    try {
      await subscriptionsApi.startTrial();
      toast({
        title: '試用已開始！',
        description: '您的 7 天免費試用已啟動，享受完整功能吧！',
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: '無法開始試用',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handleSubscribe = (plan: Plan) => {
    if (plan.code === 'FREE_TRIAL') {
      handleStartTrial();
    } else {
      router.push(`/checkout?planId=${plan.id}&city=${encodeURIComponent(selectedCity)}&electionType=${selectedElectionType}`);
    }
  };

  const formatPrice = (price: number) => {
    return `NT$ ${price.toLocaleString('zh-TW')}`;
  };

  const getRegionLevelBadge = (level: number | null) => {
    if (!level) return null;
    const labels: Record<number, string> = {
      1: '一級戰區',
      2: '二級戰區',
      3: '三級戰區',
      4: '四級戰區',
      5: '五級戰區',
    };
    return (
      <Badge className={regionLevelColors[level]}>
        {labels[level]}
      </Badge>
    );
  };

  if (isLoadingCities) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 返回按鈕 - 頂部固定區塊 */}
        <div className="sticky top-4 z-10 mb-6">
          <BackButton href={backUrl} label={isAuthenticated ? '返回主控台' : '返回首頁'} />
        </div>

        {/* 來自 Campaign 建立頁面的升級引導提示 */}
        {urlCity && urlElectionType && (
          <Alert className="mb-6 border-blue-500 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">選擇適合您的方案</AlertTitle>
            <AlertDescription className="text-blue-700">
              建立「{urlCity}{upgradeElectionTypeLabels[urlElectionType] || urlElectionType}」選舉活動需要對應的訂閱方案。
              我們已為您預選該選區，請確認後完成訂閱。
            </AlertDescription>
          </Alert>
        )}

        {/* 標題區 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            選擇適合您的方案
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            全台戰區分級定價，依據「戰區強度 × 人口比例」量身訂製
          </p>
        </div>

        {/* 選擇區域 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              選擇您的選區
            </CardTitle>
            <CardDescription>
              根據您的選舉區域和類型，顯示專屬定價方案
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 縣市選擇 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">縣市</label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇縣市" />
                  </SelectTrigger>
                  <SelectContent>
                    {cityGroups.map((group) => (
                      <SelectGroup key={group.regionLevel}>
                        <SelectLabel className="text-xs text-muted-foreground">
                          {group.label}
                        </SelectLabel>
                        {group.cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 選舉類型選擇 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">選舉類型</label>
                <Select value={selectedElectionType} onValueChange={setSelectedElectionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇選舉類型" />
                  </SelectTrigger>
                  <SelectContent>
                    {electionTypes.map((type) => (
                      <SelectItem key={type.code} value={type.code}>
                        <div className="flex items-center gap-2">
                          <Vote className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 方案顯示區 */}
        {!selectedCity || !selectedElectionType ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">請選擇您的選區</h3>
            <p className="text-muted-foreground">
              選擇縣市和選舉類型後，將顯示專屬定價方案
            </p>
          </div>
        ) : isLoadingPlan ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : currentPlan ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* 免費試用卡片 */}
            {trialPlan && (
              <Card className="border-border">
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-2">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold">{trialPlan.name}</CardTitle>
                  <CardDescription>體驗完整功能</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-foreground">免費</span>
                    <p className="text-sm text-muted-foreground mt-1">7 天試用期</p>
                  </div>
                  <ul className="space-y-3">
                    {(trialPlan.features as string[]).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant="outline"
                    size="lg"
                    disabled={currentSubscription?.hasSubscription || isStartingTrial}
                    onClick={handleStartTrial}
                  >
                    {isStartingTrial ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        處理中...
                      </>
                    ) : currentSubscription?.hasSubscription ? (
                      '已使用過試用'
                    ) : (
                      '開始免費試用'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* 付費方案卡片 */}
            <Card className="border-primary shadow-lg relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1 rounded-full">
                  推薦方案
                </span>
              </div>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center gap-2 mb-2">
                  {getRegionLevelBadge(currentPlan.regionLevel)}
                </div>
                <CardTitle className="text-2xl font-bold">
                  {selectedCity} {electionTypeLabels[selectedElectionType]}
                </CardTitle>
                <CardDescription>{currentPlan.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold text-foreground">
                    {formatPrice(currentPlan.price)}
                  </span>
                  <span className="text-muted-foreground">/月</span>
                  <p className="text-sm text-green-600 mt-1">
                    年繳 {formatPrice(currentPlan.price * 10)} 享 83 折
                  </p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>無限選民數量</span>
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>
                      {currentPlan.teamLimit
                        ? `最多 ${currentPlan.teamLimit} 位團隊成員`
                        : '無限團隊成員'}
                    </span>
                  </li>
                  {(currentPlan.features as string[]).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-muted-foreground">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleSubscribe(currentPlan)}
                >
                  立即訂閱
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              找不到符合條件的方案，請嘗試其他選擇
            </p>
          </div>
        )}

        {/* 價格說明 */}
        <div className="mt-12 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>定價說明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div key={level} className="text-center">
                    <Badge className={`${regionLevelColors[level]} mb-2`}>
                      {level}級戰區
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {level === 1 && '六都（高競爭）'}
                      {level === 2 && '次高強度'}
                      {level === 3 && '基準（南投）'}
                      {level === 4 && '低密度'}
                      {level === 5 && '離島專案'}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                價格依據「戰區強度 × 人口比例」計算，三級戰區（南投縣）為全台定價基準。
                選舉類型包含：里長、民代（鄉鎮市民代表/區民代表）、議員、市長、立委。
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ 區塊 */}
        <div className="max-w-3xl mx-auto mt-12">
          <h2 className="text-2xl font-bold text-center mb-8">常見問題</h2>
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">試用期結束後會自動扣款嗎？</h3>
              <p className="text-muted-foreground">
                不會。試用期結束後，您需要手動選擇付費方案才會開始計費。我們不會在未經您同意的情況下扣款。
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">為什麼不同縣市價格不同？</h3>
              <p className="text-muted-foreground">
                我們依據「戰區強度 × 人口比例」計算價格。六都競爭激烈、選民眾多，需要更完整的系統支援；
                離島地區選舉規模較小，因此價格也相應調整，讓各地候選人都能負擔得起。
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">可以隨時取消訂閱嗎？</h3>
              <p className="text-muted-foreground">
                是的，您可以隨時取消訂閱。取消後，您仍可使用服務直到目前計費週期結束。
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">支援哪些付款方式？</h3>
              <p className="text-muted-foreground">
                我們支援信用卡、ATM 轉帳、超商付款（透過綠界 ECPay）以及國際信用卡（透過 Stripe）。
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            還有其他問題嗎？
          </p>
          <Button variant="link" className="text-primary" asChild>
            <a href="https://line.me/ti/p/@487leezq" target="_blank" rel="noopener noreferrer">
              聯繫客服 (LINE: @487leezq)
            </a>
          </Button>
        </div>

        {/* 底部返回按鈕 */}
        <div className="text-center mt-8 pb-8">
          <BackButton href={backUrl} label={isAuthenticated ? '返回主控台' : '返回首頁'} />
        </div>
      </div>
    </div>
  );
}

// 包裝組件以處理 Suspense 邊界
export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <PricingPageContent />
    </Suspense>
  );
}
