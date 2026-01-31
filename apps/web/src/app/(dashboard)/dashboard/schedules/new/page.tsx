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
import { useCampaignStore } from '@/stores/campaign';
import { schedulesApi } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const scheduleSchema = z.object({
  title: z.string().min(1, '標題為必填'),
  date: z.string().min(1, '日期為必填'),
  description: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

export default function NewSchedulePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentCampaign } = useCampaignStore();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ScheduleFormData) =>
      schedulesApi.create({
        ...data,
        campaignId: currentCampaign?.id,
        date: new Date(data.date).toISOString(),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: '成功',
        description: '行程已建立',
      });
      router.push(`/dashboard/schedules/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '建立行程失敗',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ScheduleFormData) => {
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
        <Link href="/dashboard/schedules">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">新增行程</h1>
          <p className="text-muted-foreground">規劃每日拜訪行程</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>行程資訊</CardTitle>
            <CardDescription>設定行程的基本資訊</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">行程標題 *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="例如：上午掃街行程"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">日期 *</Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">說明</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="行程說明..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/schedules">
            <Button variant="outline" type="button">
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? '建立中...' : '建立行程'}
          </Button>
        </div>
      </form>
    </div>
  );
}
