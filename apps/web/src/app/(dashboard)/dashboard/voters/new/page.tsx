'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NumericKeypad } from '@/components/ui/numeric-keypad';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCampaignStore } from '@/stores/campaign';
import { votersApi } from '@/lib/api';
import { ArrowLeft, Save, QrCode } from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { useToast } from '@/hooks/use-toast';
import { useHydration } from '@/hooks/use-hydration';

// 動態匯入 QR 掃描器元件，避免 SSR 錯誤
const LineQrScanner = dynamic(
  () => import('@/components/common/LineQrScanner').then(mod => mod.LineQrScanner),
  { ssr: false }
);

const voterSchema = z.object({
  name: z.string().min(1, '姓名為必填欄位'),
  phone: z.string().optional(),
  email: z.string().email('Email 格式不正確').optional().or(z.literal('')),
  lineId: z.string().optional(),
  lineUrl: z.string().url('LINE 連結格式不正確').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  districtName: z.string().optional(),
  village: z.string().optional(),
  age: z.coerce.number().min(0).max(150).optional().or(z.literal('')),
  gender: z.enum(['M', 'F', 'OTHER']).optional(),
  occupation: z.string().optional(),
  politicalParty: z.string().optional(),
  stance: z.enum([
    'STRONG_SUPPORT',
    'SUPPORT',
    'LEAN_SUPPORT',
    'NEUTRAL',
    'UNDECIDED',
    'LEAN_OPPOSE',
    'OPPOSE',
    'STRONG_OPPOSE',
  ]).optional(),
  influenceScore: z.coerce.number().min(0).max(100).optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
});

type VoterFormData = z.infer<typeof voterSchema>;

export default function NewVoterPage() {
  const hydrated = useHydration();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { currentCampaign } = useCampaignStore();
  const { toast } = useToast();
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  // 從 URL 取得預設的 LINE 資訊及 GPS 區域
  const defaultLineId = searchParams.get('lineId') || '';
  const defaultLineUrl = searchParams.get('lineUrl') || '';
  const defaultCity = searchParams.get('city') || '';
  const defaultDistrict = searchParams.get('district') || '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VoterFormData>({
    resolver: zodResolver(voterSchema),
    defaultValues: {
      stance: 'UNDECIDED',
      influenceScore: 0,
      lineId: defaultLineId,
      lineUrl: defaultLineUrl,
      city: defaultCity,
      districtName: defaultDistrict,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: VoterFormData) =>
      votersApi.create({
        ...data,
        campaignId: currentCampaign?.id,
        age: data.age ? Number(data.age) : undefined,
        lineId: data.lineId || undefined,
        lineUrl: data.lineUrl || undefined,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()) : [],
      }),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['voters'] });
      // 多人防重複：若後端回傳已存在標記，導向該選民詳情頁
      if (result?._alreadyExists) {
        toast({
          title: '選民已存在',
          description: `此選民已由 ${result.creator?.name || '其他團隊成員'} 建立，為您導向該選民資料`,
        });
        router.push(`/dashboard/voters/${result.id}`);
        return;
      }
      toast({
        title: '成功',
        description: '選民已建立',
      });
      router.push('/dashboard/voters');
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '建立選民失敗',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: VoterFormData) => {
    createMutation.mutate(data);
  };

  // 水合完成前顯示載入狀態，避免 SSR 與客戶端渲染不匹配
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentCampaign) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">請先選擇選舉活動</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton href="/dashboard/voters" />
        <div>
          <h1 className="text-2xl font-bold">新增選民</h1>
          <p className="text-muted-foreground">建立新的選民資料</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>基本資料</CardTitle>
              <CardDescription>選民的基本聯絡資訊</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">姓名 *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="輸入姓名"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">電話</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="0912-345-678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="example@email.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lineId">LINE</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQrScannerOpen(true)}
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    掃描 QR
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Input
                      id="lineId"
                      {...register('lineId')}
                      placeholder="LINE ID"
                    />
                  </div>
                  <div className="space-y-1">
                    <Input
                      id="lineUrl"
                      {...register('lineUrl')}
                      placeholder="LINE 連結"
                    />
                    {errors.lineUrl && (
                      <p className="text-sm text-destructive">{errors.lineUrl.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">地址</Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder="輸入完整地址"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">縣市</Label>
                  <Input
                    id="city"
                    {...register('city')}
                    placeholder="台北市"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="districtName">區</Label>
                  <Input
                    id="districtName"
                    {...register('districtName')}
                    placeholder="中正區"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="village">里</Label>
                  <Input
                    id="village"
                    {...register('village')}
                    placeholder="民生里"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle>個人資訊</CardTitle>
              <CardDescription>選民的個人背景資料</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="age">年齡</Label>
                  <NumericKeypad
                    value={watch('age')}
                    onChange={(val) => setValue('age', val as any)}
                    min={0}
                    max={150}
                    placeholder="45"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">性別</Label>
                  <Select
                    onValueChange={(value) => setValue('gender', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇性別" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">男</SelectItem>
                      <SelectItem value="F">女</SelectItem>
                      <SelectItem value="OTHER">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation">職業</Label>
                <Input
                  id="occupation"
                  {...register('occupation')}
                  placeholder="輸入職業"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="politicalParty">政黨傾向</Label>
                <Select
                  onValueChange={(value) => setValue('politicalParty', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇政黨" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KMT">國民黨</SelectItem>
                    <SelectItem value="DPP">民進黨</SelectItem>
                    <SelectItem value="TPP">民眾黨</SelectItem>
                    <SelectItem value="NPP">時代力量</SelectItem>
                    <SelectItem value="TSP">台灣基進</SelectItem>
                    <SelectItem value="INDEPENDENT">無黨籍</SelectItem>
                    <SelectItem value="OTHER">其他</SelectItem>
                    <SelectItem value="UNKNOWN">不明</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">標籤</Label>
                <Input
                  id="tags"
                  {...register('tags')}
                  placeholder="用逗號分隔，例如：里長, 社區重要人物"
                />
              </div>
            </CardContent>
          </Card>

          {/* Political Info */}
          <Card>
            <CardHeader>
              <CardTitle>政治傾向</CardTitle>
              <CardDescription>選民的政治立場評估</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stance">支持度</Label>
                <Select
                  defaultValue="UNDECIDED"
                  onValueChange={(value) => setValue('stance', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇支持度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STRONG_SUPPORT">強力支持</SelectItem>
                    <SelectItem value="SUPPORT">支持</SelectItem>
                    <SelectItem value="LEAN_SUPPORT">傾向支持</SelectItem>
                    <SelectItem value="NEUTRAL">中立</SelectItem>
                    <SelectItem value="UNDECIDED">未表態</SelectItem>
                    <SelectItem value="LEAN_OPPOSE">傾向反對</SelectItem>
                    <SelectItem value="OPPOSE">反對</SelectItem>
                    <SelectItem value="STRONG_OPPOSE">強烈反對</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="influenceScore">影響力分數 (0-100)</Label>
                <NumericKeypad
                  value={watch('influenceScore')}
                  onChange={(val) => setValue('influenceScore', val)}
                  min={0}
                  max={100}
                  placeholder="50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>備註</CardTitle>
              <CardDescription>其他需要記錄的資訊</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                {...register('notes')}
                placeholder="輸入備註..."
                className="min-h-[150px]"
              />
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/voters">
            <Button variant="outline" type="button">
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? '儲存中...' : '儲存'}
          </Button>
        </div>
      </form>

      {/* LINE QR Scanner - 條件渲染以避免 SSR 水合錯誤 */}
      {qrScannerOpen && (
        <LineQrScanner
          open={qrScannerOpen}
          onOpenChange={setQrScannerOpen}
          onScan={(result) => {
            if (result.lineId) {
              setValue('lineId', result.lineId);
            }
            setValue('lineUrl', result.lineUrl);
          }}
        />
      )}
    </div>
  );
}
