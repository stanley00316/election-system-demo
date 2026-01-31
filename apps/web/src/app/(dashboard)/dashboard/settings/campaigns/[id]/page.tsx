'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useCampaignStore } from '@/stores/campaign';
import { campaignsApi, districtsApi } from '@/lib/api';
import { ArrowLeft, Save, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { currentCampaign, setCurrentCampaign, removeCampaign } = useCampaignStore();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 取得活動資料
  const { data: campaign, isLoading, error } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.getById(id),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
  });

  const selectedCity = watch('city');
  const selectedDistrict = watch('district');

  // 根據選擇的縣市獲取區列表
  const { data: districts = [], isLoading: isLoadingDistricts } = useQuery({
    queryKey: ['districts', selectedCity],
    queryFn: () => districtsApi.getByCity(selectedCity),
    enabled: !!selectedCity,
  });

  // 當縣市改變時，清除區的值
  const handleCityChange = (value: string) => {
    setValue('city', value, { shouldDirty: true });
    setValue('district', '', { shouldDirty: true });
  };

  // 當活動資料載入後，填入表單
  useEffect(() => {
    if (campaign) {
      reset({
        name: campaign.name || '',
        electionType: campaign.electionType || 'CITY_COUNCILOR',
        city: campaign.city || '',
        district: campaign.district || '',
        village: campaign.village || '',
        constituency: campaign.constituency || undefined,
        electionDate: campaign.electionDate 
          ? new Date(campaign.electionDate).toISOString().split('T')[0]
          : '',
        description: campaign.description || '',
      });
    }
  }, [campaign, reset]);

  // 更新 mutation
  const updateMutation = useMutation({
    mutationFn: (data: CampaignFormData) =>
      campaignsApi.update(id, {
        ...data,
        electionDate: data.electionDate ? new Date(data.electionDate).toISOString() : undefined,
        constituency: data.constituency && data.constituency > 0 ? data.constituency : undefined,
      }),
    onSuccess: (updatedCampaign) => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      
      // 如果更新的是當前使用中的活動，同步更新 store
      if (currentCampaign?.id === id) {
        setCurrentCampaign(updatedCampaign);
      }
      
      toast({
        title: '成功',
        description: '活動設定已更新',
      });
      router.push('/dashboard/settings/campaigns');
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '更新失敗',
        variant: 'destructive',
      });
    },
  });

  // 刪除 mutation
  const deleteMutation = useMutation({
    mutationFn: () => campaignsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      
      // 如果刪除的是當前使用中的活動，清除 store
      if (currentCampaign?.id === id) {
        removeCampaign(id);
        setCurrentCampaign(null);
      }
      
      toast({
        title: '成功',
        description: '活動已刪除',
      });
      router.push('/dashboard/settings/campaigns');
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '刪除失敗',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CampaignFormData) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const electionType = watch('electionType');

  // 載入中
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 錯誤狀態
  if (error || !campaign) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">找不到活動</h1>
            <p className="text-muted-foreground">該活動可能已被刪除或您沒有權限存取</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">編輯活動設定</h1>
            <p className="text-muted-foreground">{campaign.name}</p>
          </div>
        </div>
        
        {/* 刪除按鈕 */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              刪除活動
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>確認刪除</DialogTitle>
              <DialogDescription>
                您確定要刪除「{campaign.name}」嗎？此操作無法復原，所有相關的選民、接觸紀錄、活動等資料都將被刪除。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    刪除中...
                  </>
                ) : (
                  '確認刪除'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                value={electionType}
                onValueChange={(value) => setValue('electionType', value as any, { shouldDirty: true })}
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

        <Card>
          <CardHeader>
            <CardTitle>選區設定</CardTitle>
            <CardDescription>設定您的選區範圍</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">縣市 *</Label>
                <Select 
                  value={selectedCity}
                  onValueChange={handleCityChange}
                >
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
                  value={selectedDistrict}
                  onValueChange={(value) => setValue('district', value, { shouldDirty: true })}
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
          <Button 
            type="submit" 
            disabled={isSubmitting || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                儲存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                儲存變更
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
