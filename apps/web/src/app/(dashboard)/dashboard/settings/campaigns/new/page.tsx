'use client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCampaignStore } from '@/stores/campaign';
import { campaignsApi, districtsApi } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DistrictSelector, type DistrictSelection } from '@/components/settings/DistrictSelector';

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

  // 根據選擇的縣市獲取區列表
  const { data: districts = [], isLoading: isLoadingDistricts } = useQuery({
    queryKey: ['districts', selectedCity],
    queryFn: () => districtsApi.getByCity(selectedCity),
    enabled: !!selectedCity,
  });

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
      toast({
        title: '錯誤',
        description: error.message || '建立失敗',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CampaignFormData) => {
    createMutation.mutate(data);
  };

  const electionType = watch('electionType');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">建立選舉活動</h1>
          <p className="text-muted-foreground">設定新的選舉活動</p>
        </div>
      </div>

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
                <Input
                  id="constituency"
                  type="number"
                  {...register('constituency')}
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
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? '建立中...' : '建立活動'}
          </Button>
        </div>
      </form>
    </div>
  );
}
