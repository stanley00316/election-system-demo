'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NumericKeypad } from '@/components/ui/numeric-keypad';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCampaignStore } from '@/stores/campaign';
import { campaignsApi, districtsApi, subscriptionsApi } from '@/lib/api';
import { ArrowLeft, Save, AlertTriangle, Info, ExternalLink, Loader2 } from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { useToast } from '@/hooks/use-toast';
import { DistrictSelector, type DistrictSelection } from '@/components/settings/DistrictSelector';

// 選舉類型對應 Plan category
const ELECTION_TYPE_TO_CATEGORY: Record<string, string> = {
  VILLAGE_CHIEF: 'VILLAGE_CHIEF',
  TOWNSHIP_REP: 'REPRESENTATIVE',
  CITY_COUNCILOR: 'COUNCILOR',
  MAYOR: 'MAYOR',
  LEGISLATOR: 'LEGISLATOR',
  PRESIDENT: 'LEGISLATOR',
};

// 選舉類型中文標籤
const ELECTION_TYPE_LABELS: Record<string, string> = {
  VILLAGE_CHIEF: '里長',
  TOWNSHIP_REP: '民代',
  CITY_COUNCILOR: '議員',
  MAYOR: '市長',
  LEGISLATOR: '立委',
  PRESIDENT: '總統',
};

// Plan category 中文標籤
const CATEGORY_LABELS: Record<string, string> = {
  VILLAGE_CHIEF: '里長',
  REPRESENTATIVE: '民代',
  COUNCILOR: '議員',
  MAYOR: '市長',
  LEGISLATOR: '立委',
};

const campaignSchema = z.object({
  name: z.string().min(1, '活動名稱為必填'),
  electionType: z.enum([
    'VILLAGE_CHIEF',
    'TOWNSHIP_REP',
    'CITY_COUNCILOR',
    'LEGISLATOR',
    'MAYOR',
    'PRESIDENT',
  ]),
  city: z.string().min(1, '縣市為必填'),
  district: z.string().optional(),
  village: z.string().optional(),
  constituency: z.coerce.number().optional(),
  electionDate: z.string().optional(),
  description: z.string().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export default function NewCampaignPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setCurrentCampaign, addCampaign } = useCampaignStore();
  const { toast } = useToast();
  
  // 訂閱方案不符的錯誤對話框
  const [upgradeDialog, setUpgradeDialog] = useState<{
    open: boolean;
    message: string;
    currentPlan?: { city: string; category: string; name: string };
    requiredPlan?: { city: string; electionType: string };
    upgradeUrl?: string;
  }>({ open: false, message: '' });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      electionType: 'CITY_COUNCILOR',
    },
  });

  const selectedCity = watch('city');
  const selectedElectionType = watch('electionType');

  // 取得用戶訂閱狀態
  const { data: subscriptionData, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription-check'],
    queryFn: () => subscriptionsApi.checkSubscription(),
  });

  // 根據選擇的縣市獲取區列表
  const { data: districts = [], isLoading: isLoadingDistricts } = useQuery({
    queryKey: ['districts', selectedCity],
    queryFn: () => districtsApi.getByCity(selectedCity),
    enabled: !!selectedCity,
  });

  // 計算是否與訂閱方案一致
  const subscriptionMismatch = useMemo(() => {
    if (!subscriptionData || !subscriptionData.hasSubscription) return null;
    if (!selectedCity || !selectedElectionType) return null;
    
    const plan = subscriptionData.plan;
    // 試用期允許任意建立
    if (subscriptionData.isTrialing || plan?.code === 'FREE_TRIAL') return null;
    // 舊版通用方案無 city/category
    if (!plan?.city || !plan?.category) return null;
    
    const requiredCategory = ELECTION_TYPE_TO_CATEGORY[selectedElectionType];
    
    if (plan.city !== selectedCity) {
      return {
        type: 'city' as const,
        message: `您的訂閱方案為「${plan.city}${CATEGORY_LABELS[plan.category] || plan.category}」，與選擇的縣市「${selectedCity}」不符`,
        currentPlan: plan,
      };
    }
    
    if (plan.category !== requiredCategory) {
      return {
        type: 'electionType' as const,
        message: `您的訂閱方案為「${plan.city}${CATEGORY_LABELS[plan.category] || plan.category}」，與選擇的選舉類型「${ELECTION_TYPE_LABELS[selectedElectionType]}」不符`,
        currentPlan: plan,
      };
    }
    
    return null;
  }, [subscriptionData, selectedCity, selectedElectionType]);

  // 當縣市改變時，清除區的值
  const handleCityChange = (value: string) => {
    setValue('city', value);
    setValue('district', '');
  };

  // 地圖選區變更
  const handleDistrictSelection = (selection: DistrictSelection) => {
    if (selection.city) {
      setValue('city', selection.city);
    }
    if (selection.district) {
      setValue('district', selection.district);
    } else {
      setValue('district', '');
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: CampaignFormData) =>
      campaignsApi.create({
        ...data,
        electionDate: data.electionDate ? new Date(data.electionDate).toISOString() : undefined,
        constituency: data.constituency && data.constituency > 0 ? data.constituency : undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      addCampaign(data);
      setCurrentCampaign(data);
      toast({
        title: '成功',
        description: '選舉活動已建立',
      });
      router.push('/dashboard');
    },
    onError: (error: any) => {
      // 處理訂閱方案不符的錯誤
      if (error.code === 'CITY_MISMATCH' || error.code === 'ELECTION_TYPE_MISMATCH' || error.code === 'NO_SUBSCRIPTION') {
        setUpgradeDialog({
          open: true,
          message: error.message,
          currentPlan: error.currentPlan,
          requiredPlan: error.requiredPlan,
          upgradeUrl: error.upgradeUrl,
        });
      } else {
        toast({
          title: '錯誤',
          description: error.message || '建立失敗',
          variant: 'destructive',
        });
      }
    },
  });

  const onSubmit = (data: CampaignFormData) => {
    createMutation.mutate(data);
  };

  const electionType = watch('electionType');
  
  // 載入中狀態
  if (isLoadingSubscription) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton href="/dashboard/settings/campaigns" />
        <div>
          <h1 className="text-2xl font-bold">建立選舉活動</h1>
          <p className="text-muted-foreground">設定新的選舉活動</p>
        </div>
      </div>

      {/* 無訂閱提醒 */}
      {!subscriptionData?.hasSubscription && (
        <Alert className="border-amber-500 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">尚未訂閱方案</AlertTitle>
          <AlertDescription className="text-amber-700">
            您目前尚未訂閱任何方案。
            {subscriptionData?.canStartTrial ? (
              <span>您可以開始 7 天免費試用體驗完整功能，或選擇適合您選區的付費方案。</span>
            ) : (
              <span>請先選擇適合您選區的付費方案後再建立選舉活動。</span>
            )}
            <Link href="/pricing" className="ml-2 inline-flex items-center text-amber-900 font-medium hover:underline">
              查看方案價格 <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* 試用期提醒 */}
      {subscriptionData?.isTrialing && (
        <Alert className="border-blue-500 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">目前為試用期</AlertTitle>
          <AlertDescription className="text-blue-700">
            試用期間可建立任意選區的選舉活動。試用結束後，請依照您的選舉活動購買對應的訂閱方案。
            <Badge className="ml-2 bg-blue-100 text-blue-800">
              剩餘 {subscriptionData.daysRemaining} 天
            </Badge>
          </AlertDescription>
        </Alert>
      )}

      {/* 訂閱方案不符提醒 */}
      {subscriptionMismatch && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">選區與訂閱方案不符</AlertTitle>
          <AlertDescription className="text-red-700">
            {subscriptionMismatch.message}
            <Link 
              href={`/pricing?city=${encodeURIComponent(selectedCity)}&electionType=${selectedElectionType}`}
              className="ml-2 inline-flex items-center text-red-900 font-medium hover:underline"
            >
              調整方案 <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* 升級提示對話框 */}
      <Dialog open={upgradeDialog.open} onOpenChange={(open) => setUpgradeDialog({ ...upgradeDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              訂閱方案不符
            </DialogTitle>
            <DialogDescription className="pt-4 space-y-4">
              <p className="text-base text-foreground">{upgradeDialog.message}</p>
              
              {upgradeDialog.currentPlan && upgradeDialog.requiredPlan && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">您目前的方案</p>
                    <Badge variant="outline">
                      {upgradeDialog.currentPlan.city}{CATEGORY_LABELS[upgradeDialog.currentPlan.category] || upgradeDialog.currentPlan.category}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">需要的方案</p>
                    <Badge className="bg-primary">
                      {upgradeDialog.requiredPlan.city}{ELECTION_TYPE_LABELS[upgradeDialog.requiredPlan.electionType] || upgradeDialog.requiredPlan.electionType}
                    </Badge>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                為確保服務品質與公平性，選舉活動必須與您的訂閱方案相符。請調整您的訂閱方案，或修改選舉活動的選區設定。
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUpgradeDialog({ ...upgradeDialog, open: false })}>
              返回修改
            </Button>
            <Button asChild>
              <Link href={upgradeDialog.upgradeUrl || '/pricing'}>
                <ExternalLink className="h-4 w-4 mr-2" />
                調整訂閱方案
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>基本資訊</CardTitle>
            <CardDescription>選舉活動的基本設定</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">活動名稱 *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="例如：2026 台北市第三選區市議員"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="electionType">選舉類型 *</Label>
              <Select
                defaultValue="CITY_COUNCILOR"
                onValueChange={(value) => setValue('electionType', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VILLAGE_CHIEF">村里長</SelectItem>
                  <SelectItem value="TOWNSHIP_REP">鄉鎮市民代表</SelectItem>
                  <SelectItem value="CITY_COUNCILOR">縣市議員</SelectItem>
                  <SelectItem value="LEGISLATOR">立法委員</SelectItem>
                  <SelectItem value="MAYOR">縣市長</SelectItem>
                  <SelectItem value="PRESIDENT">總統</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="electionDate">選舉日期</Label>
              <Input
                id="electionDate"
                type="date"
                {...register('electionDate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">說明</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="活動說明..."
              />
            </div>
          </CardContent>
        </Card>

        {/* 地圖選區 */}
        <DistrictSelector
          value={{ city: selectedCity || '', district: watch('district') }}
          onChange={handleDistrictSelection}
        />

        <Card>
          <CardHeader>
            <CardTitle>選區設定</CardTitle>
            <CardDescription>或使用下拉選單手動選擇</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">縣市 *</Label>
                <Select value={selectedCity} onValueChange={handleCityChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇縣市" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="台北市">台北市</SelectItem>
                    <SelectItem value="新北市">新北市</SelectItem>
                    <SelectItem value="桃園市">桃園市</SelectItem>
                    <SelectItem value="台中市">台中市</SelectItem>
                    <SelectItem value="台南市">台南市</SelectItem>
                    <SelectItem value="高雄市">高雄市</SelectItem>
                    <SelectItem value="新竹縣">新竹縣</SelectItem>
                    <SelectItem value="新竹市">新竹市</SelectItem>
                    <SelectItem value="苗栗縣">苗栗縣</SelectItem>
                    <SelectItem value="彰化縣">彰化縣</SelectItem>
                    <SelectItem value="南投縣">南投縣</SelectItem>
                    <SelectItem value="雲林縣">雲林縣</SelectItem>
                    <SelectItem value="嘉義縣">嘉義縣</SelectItem>
                    <SelectItem value="嘉義市">嘉義市</SelectItem>
                    <SelectItem value="屏東縣">屏東縣</SelectItem>
                    <SelectItem value="宜蘭縣">宜蘭縣</SelectItem>
                    <SelectItem value="花蓮縣">花蓮縣</SelectItem>
                    <SelectItem value="台東縣">台東縣</SelectItem>
                    <SelectItem value="澎湖縣">澎湖縣</SelectItem>
                    <SelectItem value="金門縣">金門縣</SelectItem>
                    <SelectItem value="連江縣">連江縣</SelectItem>
                    <SelectItem value="基隆市">基隆市</SelectItem>
                  </SelectContent>
                </Select>
                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">區</Label>
                <Select
                  value={watch('district') || ''}
                  onValueChange={(value) => setValue('district', value)}
                  disabled={!selectedCity || isLoadingDistricts}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !selectedCity
                          ? '請先選擇縣市'
                          : isLoadingDistricts
                          ? '載入中...'
                          : districts.length === 0
                          ? '無可用選項'
                          : '選擇區'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((district: any) => (
                      <SelectItem key={district.id} value={district.name}>
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {['VILLAGE_CHIEF', 'TOWNSHIP_REP'].includes(electionType) && (
              <div className="space-y-2">
                <Label htmlFor="village">里</Label>
                <Input
                  id="village"
                  {...register('village')}
                  placeholder="例如：民生里"
                />
              </div>
            )}

            {['CITY_COUNCILOR', 'LEGISLATOR'].includes(electionType) && (
              <div className="space-y-2">
                <Label htmlFor="constituency">選區編號</Label>
                <NumericKeypad
                  value={watch('constituency')}
                  onChange={(val) => setValue('constituency', val)}
                  min={1}
                  placeholder="例如：3"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/settings/campaigns">
            <Button variant="outline" type="button">
              取消
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={isSubmitting || createMutation.isPending || !!subscriptionMismatch}
            title={subscriptionMismatch ? '請先調整訂閱方案或修改選區設定' : undefined}
          >
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? '建立中...' : '建立活動'}
          </Button>
        </div>
      </form>
    </div>
  );
}
