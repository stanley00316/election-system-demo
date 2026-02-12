'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, ImageIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCampaignStore } from '@/stores/campaign';
import { albumsApi } from '@/lib/api';
import { AlbumCard } from '@/components/albums/AlbumCard';

export default function AlbumsPage() {
  const { currentCampaign } = useCampaignStore();
  const [filter, setFilter] = useState<'all' | 'published' | 'unpublished'>('all');

  const { data: albums, isLoading } = useQuery({
    queryKey: ['albums', currentCampaign?.id, filter],
    queryFn: () =>
      albumsApi.getAll({
        campaignId: currentCampaign!.id,
        ...(filter === 'published' && { isPublished: 'true' }),
        ...(filter === 'unpublished' && { isPublished: 'false' }),
      }),
    enabled: !!currentCampaign?.id,
  });

  if (!currentCampaign) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        請先選擇選舉活動
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">相簿</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理活動紀實照片，發表分享相簿
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/albums/new">
            <Plus className="h-4 w-4 mr-2" />
            建立相簿
          </Link>
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'all' as const, label: '全部' },
          { key: 'published' as const, label: '已發表' },
          { key: 'unpublished' as const, label: '未發表' },
        ].map(({ key, label }) => (
          <Badge
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter(key)}
          >
            {label}
          </Badge>
        ))}
      </div>

      {/* Album Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border bg-card overflow-hidden animate-pulse">
              <div className="aspect-video bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : albums && albums.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {albums.map((album: any) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">尚無相簿</h3>
          <p className="text-sm text-muted-foreground mb-4">
            建立第一本相簿，開始記錄活動紀實
          </p>
          <Button asChild>
            <Link href="/dashboard/albums/new">
              <Plus className="h-4 w-4 mr-2" />
              建立相簿
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
