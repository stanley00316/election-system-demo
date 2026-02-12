'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { albumsApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function EditAlbumPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const albumId = params.id as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data: album, isLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => albumsApi.getById(albumId),
    enabled: !!albumId,
  });

  useEffect(() => {
    if (album) {
      setTitle(album.title);
      setDescription(album.description || '');
    }
  }, [album]);

  const updateMutation = useMutation({
    mutationFn: () =>
      albumsApi.update(albumId, {
        title,
        description: description || undefined,
      }),
    onSuccess: () => {
      toast({ title: '相簿已更新' });
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      router.push(`/dashboard/albums/${albumId}`);
    },
    onError: (err: any) => {
      toast({
        title: '更新失敗',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">編輯相簿</h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">相簿標題</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">說明（選填）</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {album?.event && (
          <div className="space-y-2">
            <Label>關聯活動</Label>
            <p className="text-sm text-muted-foreground">{album.event.name}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!title.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            儲存變更
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}
