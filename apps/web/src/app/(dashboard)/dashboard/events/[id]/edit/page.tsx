'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { NumericKeypad } from '@/components/ui/numeric-keypad';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  actualAttendees: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

// 將 ISO 日期時間轉換為 datetime-local 格式
function toDatetimeLocal(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const eventId = params.id as string;

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getById(eventId),
    enabled: !!eventId,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  });

  // 當資料載入後填入表單
  useEffect(() => {
    if (event) {
      reset({
        name: event.name || '',
        type: event.type || 'LIVING_ROOM',
        status: event.status || 'PLANNED',
        description: event.description || '',
        address: event.address || '',
        startTime: toDatetimeLocal(event.startTime),
        endTime: toDatetimeLocal(event.endTime),
        expectedAttendees: event.expectedAttendees || undefined,
        actualAttendees: event.actualAttendees || undefined,
        notes: event.notes || '',
      });
    }
  }, [event, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: EventFormData) =>
      eventsApi.update(eventId, {
        ...data,
        startTime: new Date(data.startTime).toISOString(),
        endTime: data.endTime ? new Date(data.endTime).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: '成功',
        description: '活動已更新',
      });
      router.push(`/dashboard/events/${eventId}`);
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '更新活動失敗',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EventFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">活動不存在</p>
            <Link href="/dashboard/events">
              <Button variant="outline" className="mt-4">
                返回活動列表
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton href={`/dashboard/events/${eventId}`} />
        <div>
          <h1 className="text-2xl font-bold">編輯活動</h1>
          <p className="text-muted-foreground">修改「{event.name}」活動資訊</p>
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
                    value={watch('type')}
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
                    value={watch('status')}
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

              <div className="grid gap-4 md:grid-cols-2">
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
                  <Label htmlFor="actualAttendees">實際人數</Label>
                  <NumericKeypad
                    value={watch('actualAttendees')}
                    onChange={(val) => setValue('actualAttendees', val)}
                    min={0}
                    placeholder="實際參與人數"
                  />
                </div>
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
          <Link href={`/dashboard/events/${eventId}`}>
            <Button variant="outline" type="button">
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? '儲存中...' : '儲存變更'}
          </Button>
        </div>
      </form>
    </div>
  );
}
