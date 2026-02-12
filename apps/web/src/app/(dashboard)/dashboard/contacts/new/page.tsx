'use client';

import { useRouter, useSearchParams } from 'next/navigation';
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
import { useCampaignStore } from '@/stores/campaign';
import { contactsApi, votersApi } from '@/lib/api';
import { ArrowLeft, Save, Search, MapPin, Loader2, Navigation } from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { CONTACT_TYPE_LABELS, CONTACT_OUTCOME_LABELS } from '@/shared';

// 從共用常量取得所有接觸類型和結果的 keys
const CONTACT_TYPES = Object.keys(CONTACT_TYPE_LABELS) as [string, ...string[]];
const CONTACT_OUTCOMES = Object.keys(CONTACT_OUTCOME_LABELS) as [string, ...string[]];

const contactSchema = z.object({
  voterId: z.string().min(1, '請選擇選民'),
  type: z.enum(CONTACT_TYPES),
  outcome: z.enum(CONTACT_OUTCOMES),
  contactDate: z.string().optional(),
  location: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  notes: z.string().optional(),
  topics: z.string().optional(),
  nextAction: z.string().optional(),
  followUpDate: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function NewContactPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { currentCampaign } = useCampaignStore();
  const { toast } = useToast();
  
  const preselectedVoterId = searchParams.get('voterId');
  const [voterSearch, setVoterSearch] = useState('');
  const [selectedVoter, setSelectedVoter] = useState<any>(null);
  const [gpsDetecting, setGpsDetecting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      type: 'HOME_VISIT',
      outcome: 'NEUTRAL',
      contactDate: new Date().toISOString().split('T')[0],
      voterId: preselectedVoterId || '',
    },
  });

  // Fetch preselected voter
  const { data: preselectedVoterData } = useQuery({
    queryKey: ['voter', preselectedVoterId],
    queryFn: () => votersApi.getById(preselectedVoterId!),
    enabled: !!preselectedVoterId,
  });

  useEffect(() => {
    if (preselectedVoterData) {
      setSelectedVoter(preselectedVoterData);
    }
  }, [preselectedVoterData]);

  // Search voters
  const { data: voterSearchResults } = useQuery({
    queryKey: ['voters', 'search', voterSearch, currentCampaign?.id],
    queryFn: () =>
      votersApi.getAll({
        campaignId: currentCampaign?.id,
        search: voterSearch,
        limit: 10,
      }),
    enabled: !!voterSearch && voterSearch.length >= 2 && !!currentCampaign?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: ContactFormData) =>
      contactsApi.create({
        ...data,
        campaignId: currentCampaign?.id,
        topics: data.topics ? data.topics.split(',').map((t) => t.trim()) : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['voter', selectedVoter?.id] });
      toast({
        title: '成功',
        description: '接觸紀錄已建立',
      });
      if (preselectedVoterId) {
        router.push(`/dashboard/voters/${preselectedVoterId}`);
      } else {
        router.push('/dashboard/contacts');
      }
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '建立失敗',
        variant: 'destructive',
      });
    },
  });

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      toast({ title: '不支援', description: '您的裝置不支援定位功能', variant: 'destructive' });
      return;
    }
    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setValue('locationLat', lat);
        setValue('locationLng', lng);
        // 反向地理編碼
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-TW`
        )
          .then((res) => res.json())
          .then((data) => {
            if (data?.display_name) {
              const city = data.address?.city || data.address?.county || '';
              const district = data.address?.suburb || data.address?.district || data.address?.town || '';
              const locationText = [city, district].filter(Boolean).join('');
              setValue('location', locationText || data.display_name.split(',')[0]);
            }
            setGpsDetecting(false);
          })
          .catch(() => {
            setValue('location', `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setGpsDetecting(false);
          });
      },
      () => {
        toast({ title: '定位失敗', description: '無法取得您的位置', variant: 'destructive' });
        setGpsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const onSubmit = (data: ContactFormData) => {
    createMutation.mutate(data);
  };

  const selectVoter = (voter: any) => {
    setSelectedVoter(voter);
    setValue('voterId', voter.id);
    setVoterSearch('');
  };

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
        <BackButton href={preselectedVoterId ? `/dashboard/voters/${preselectedVoterId}` : '/dashboard/contacts'} />
        <div>
          <h1 className="text-2xl font-bold">新增接觸紀錄</h1>
          <p className="text-muted-foreground">記錄與選民的接觸</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Voter Selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>選擇選民</CardTitle>
              <CardDescription>搜尋並選擇要記錄接觸的選民</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedVoter ? (
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-medium">
                        {selectedVoter.name?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{selectedVoter.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedVoter.phone || '無電話'} · {selectedVoter.address || '無地址'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedVoter(null);
                      setValue('voterId', '');
                    }}
                  >
                    更換
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜尋選民姓名、電話..."
                      className="pl-10"
                      value={voterSearch}
                      onChange={(e) => setVoterSearch(e.target.value)}
                    />
                  </div>
                  {(voterSearchResults?.data?.length ?? 0) > 0 && (
                    <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {voterSearchResults?.data?.map((voter: any) => (
                        <button
                          key={voter.id}
                          type="button"
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left"
                          onClick={() => selectVoter(voter)}
                        >
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <span className="text-sm font-medium">
                              {voter.name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{voter.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {voter.phone || voter.address || '無聯絡資訊'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.voterId && (
                    <p className="text-sm text-destructive">{errors.voterId.message}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle>接觸資訊</CardTitle>
              <CardDescription>記錄接觸的方式與結果</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">接觸類型 *</Label>
                  <Select
                    defaultValue="HOME_VISIT"
                    onValueChange={(value) => setValue('type', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇類型" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outcome">接觸結果 *</Label>
                  <Select
                    defaultValue="NEUTRAL"
                    onValueChange={(value) => setValue('outcome', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇結果" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTACT_OUTCOME_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactDate">接觸日期</Label>
                <Input
                  id="contactDate"
                  type="date"
                  {...register('contactDate')}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="location">地點</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDetectGps}
                    disabled={gpsDetecting}
                  >
                    {gpsDetecting ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        定位中...
                      </>
                    ) : (
                      <>
                        <Navigation className="h-3 w-3 mr-1" />
                        自動定位
                      </>
                    )}
                  </Button>
                </div>
                <Input
                  id="location"
                  {...register('location')}
                  placeholder="接觸地點（可自動定位）"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topics">討論主題</Label>
                <Input
                  id="topics"
                  {...register('topics')}
                  placeholder="用逗號分隔，例如：政策, 社區問題"
                />
              </div>
            </CardContent>
          </Card>

          {/* Follow Up */}
          <Card>
            <CardHeader>
              <CardTitle>後續追蹤</CardTitle>
              <CardDescription>記錄需要後續追蹤的事項</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nextAction">後續行動</Label>
                <Input
                  id="nextAction"
                  {...register('nextAction')}
                  placeholder="下次需要做的事情"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="followUpDate">追蹤日期</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  {...register('followUpDate')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">備註</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="接觸詳細內容..."
                  className="min-h-[120px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href={preselectedVoterId ? `/dashboard/voters/${preselectedVoterId}` : '/dashboard/contacts'}>
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
    </div>
  );
}
