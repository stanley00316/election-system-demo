'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCampaignStore } from '@/stores/campaign';
import { eventsApi } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { useToast } from '@/hooks/use-toast';

const eventSchema = z.object({
  name: z.string().min(1, '活動名稱為必填'),
  type: z.enum([
    'LIVING_ROOM',
    'FUNERAL',
    'WEDDING',
    'COMMUNITY',
    'TEMPLE',
    'CAMPAIGN',
    'MEETING',
    'OTHER',
  ]),
  status: z.enum(['PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  startTime: z.string().min(1, '開始時間為必填'),
  endTime: z.string().optional(),
  expectedAttendees: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

export default function NewEventPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentCampaign } = useCampaignStore();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: 'LIVING_ROOM',
      status: 'PLANNED',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: EventFormData) =>
      eventsApi.create({
        ...data,
        campaignId: currentCampaign?.id,
        startTime: new Date(data.startTime).toISOString(),
        endTime: data.endTime ? new Date(data.endTime).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: '成功',
        description: '活動已建立',
      });
      router.push('/dashboard/events');
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '建立活動失敗',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EventFormData) => {
    createMutation.mutate(data);
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
        <BackButton href="/dashboard/events" />
        <div>
          <h1 className="text-2xl font-bold">新增活動</h1>
          <p className="text-muted-foreground">建立客廳會、公祭等活動</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>活動資訊</CardTitle>
              <CardDescription>活動的基本資訊</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">活動名稱 *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="例如：王先生客廳會"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">活動類型 *</Label>
                  <Select
                    defaultValue="LIVING_ROOM"
                    onValueChange={(value) => setValue('type', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇類型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LIVING_ROOM">客廳會</SelectItem>
                      <SelectItem value="FUNERAL">公祭</SelectItem>
                      <SelectItem value="WEDDING">喜事</SelectItem>
                      <SelectItem value="COMMUNITY">社區活動</SelectItem>
                      <SelectItem value="TEMPLE">廟會</SelectItem>
                      <SelectItem value="CAMPAIGN">競選活動</SelectItem>
                      <SelectItem value="MEETING">座談會</SelectItem>
                      <SelectItem value="OTHER">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">狀態</Label>
                  <Select
                    defaultValue="PLANNED"
                    onValueChange={(value) => setValue('status', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇狀態" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNED">規劃中</SelectItem>
                      <SelectItem value="CONFIRMED">已確認</SelectItem>
                      <SelectItem value="IN_PROGRESS">進行中</SelectItem>
                      <SelectItem value="COMPLETED">已完成</SelectItem>
                      <SelectItem value="CANCELLED">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">活動說明</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="活動詳細說明..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Time & Location */}
          <Card>
            <CardHeader>
              <CardTitle>時間與地點</CardTitle>
              <CardDescription>活動的時間與地點資訊</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">活動地址</Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder="輸入活動地點"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startTime">開始時間 *</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    {...register('startTime')}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-destructive">{errors.startTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">結束時間</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    {...register('endTime')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedAttendees">預期人數</Label>
                <NumericKeypad
                  value={watch('expectedAttendees')}
                  onChange={(val) => setValue('expectedAttendees', val)}
                  min={0}
                  placeholder="預計參與人數"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">備註</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="其他備註..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/events">
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
