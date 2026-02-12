'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useToast } from '@/hooks/use-toast';
import { useCampaignStore } from '@/stores/campaign';
import { albumsApi, eventsApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function NewAlbumPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentCampaign } = useCampaignStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventId, setEventId] = useState<string>('');

  // 載入活動列表
  const { data: events } = useQuery({
    queryKey: ['events', currentCampaign?.id],
    queryFn: () => eventsApi.getAll(currentCampaign!.id),
    enabled: !!currentCampaign?.id,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      albumsApi.create({
        campaignId: currentCampaign!.id,
        title,
        description: description || undefined,
        eventId: eventId || undefined,
      }),
    onSuccess: (data) => {
      toast({ title: '相簿已建立' });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      router.push(`/dashboard/albums/${data.id}`);
    },
    onError: (err: any) => {
      toast({
        title: '建立失敗',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  if (!currentCampaign) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        請先選擇選舉活動
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">建立相簿</h1>
        <p className="text-sm text-muted-foreground mt-1">
          為活動紀實建立新相簿
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">相簿標題</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：社區座談會 2026/02"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">說明（選填）</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="相簿的簡短說明..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>關聯活動（選填）</Label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger>
              <SelectValue placeholder="選擇活動..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">不關聯活動</SelectItem>
              {events?.map((event: any) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            建立相簿
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}
