'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { contactsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { CONTACT_TYPE_LABELS, CONTACT_OUTCOME_LABELS } from '@/shared';
import { Loader2, Navigation } from 'lucide-react';

const CONTACT_TYPES = Object.keys(CONTACT_TYPE_LABELS) as [string, ...string[]];
const CONTACT_OUTCOMES = Object.keys(CONTACT_OUTCOME_LABELS) as [string, ...string[]];

const editContactSchema = z.object({
  type: z.enum(CONTACT_TYPES),
  outcome: z.enum(CONTACT_OUTCOMES),
  contactDate: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  topics: z.string().optional(),
  nextAction: z.string().optional(),
  followUpDate: z.string().optional(),
});

type EditContactFormData = z.infer<typeof editContactSchema>;

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any | null;
  voterId: string;
}

export function EditContactDialog({
  open,
  onOpenChange,
  contact,
  voterId,
}: EditContactDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [gpsDetecting, setGpsDetecting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditContactFormData>({
    resolver: zodResolver(editContactSchema),
  });

  // 開啟時預填既有值
  useEffect(() => {
    if (contact && open) {
      const date = contact.contactDate
        ? new Date(contact.contactDate).toISOString().split('T')[0]
        : '';
      const followUp = contact.followUpDate
        ? new Date(contact.followUpDate).toISOString().split('T')[0]
        : '';
      reset({
        type: contact.type || 'HOME_VISIT',
        outcome: contact.outcome || 'NEUTRAL',
        contactDate: date,
        location: contact.location || '',
        notes: contact.notes || '',
        topics: Array.isArray(contact.topics) ? contact.topics.join(', ') : '',
        nextAction: contact.nextAction || '',
        followUpDate: followUp,
      });
    }
  }, [contact, open, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: EditContactFormData) =>
      contactsApi.update(contact.id, {
        ...data,
        topics: data.topics ? data.topics.split(',').map((t) => t.trim()).filter(Boolean) : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voter', voterId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: '成功', description: '接觸紀錄已更新' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '更新失敗',
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
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-TW`,
        )
          .then((res) => res.json())
          .then((data) => {
            if (data?.display_name) {
              const city = data.address?.city || data.address?.county || '';
              const district =
                data.address?.suburb || data.address?.district || data.address?.town || '';
              setValue('location', [city, district].filter(Boolean).join('') || data.display_name.split(',')[0]);
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
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const onSubmit = (data: EditContactFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>編輯接觸紀錄</DialogTitle>
          <DialogDescription>修改此次接觸的詳細資訊</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* 接觸類型 */}
          <div className="space-y-2">
            <Label>接觸類型</Label>
            <Select
              value={watch('type')}
              onValueChange={(v) => setValue('type', v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CONTACT_TYPE_LABELS[t as keyof typeof CONTACT_TYPE_LABELS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 接觸結果 */}
          <div className="space-y-2">
            <Label>接觸結果</Label>
            <Select
              value={watch('outcome')}
              onValueChange={(v) => setValue('outcome', v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {CONTACT_OUTCOME_LABELS[o as keyof typeof CONTACT_OUTCOME_LABELS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 接觸日期 */}
          <div className="space-y-2">
            <Label>接觸日期</Label>
            <Input type="date" {...register('contactDate')} />
          </div>

          {/* 地點 */}
          <div className="space-y-2">
            <Label>地點</Label>
            <div className="flex gap-2">
              <Input {...register('location')} placeholder="輸入地點或使用定位" className="flex-1" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleDetectGps}
                disabled={gpsDetecting}
              >
                {gpsDetecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* 討論主題 */}
          <div className="space-y-2">
            <Label>討論主題</Label>
            <Input {...register('topics')} placeholder="以逗號分隔多個主題" />
          </div>

          {/* 後續行動 */}
          <div className="space-y-2">
            <Label>後續行動</Label>
            <Input {...register('nextAction')} placeholder="下次需執行的行動" />
          </div>

          {/* 追蹤日期 */}
          <div className="space-y-2">
            <Label>追蹤日期</Label>
            <Input type="date" {...register('followUpDate')} />
          </div>

          {/* 備註 */}
          <div className="space-y-2">
            <Label>備註</Label>
            <Textarea {...register('notes')} placeholder="其他備註事項" rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              儲存變更
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
