'use client';

import Link from 'next/link';
import { ImageIcon, Globe, Lock, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AlbumCardProps {
  album: {
    id: string;
    title: string;
    description?: string | null;
    isPublished: boolean;
    publishSlug?: string | null;
    createdAt: string;
    coverPhoto?: {
      thumbnailUrl?: string;
    } | null;
    event?: {
      id: string;
      name: string;
    } | null;
    _count: {
      photos: number;
    };
    creator?: {
      name: string;
    } | null;
  };
  className?: string;
}

export function AlbumCard({ album, className }: AlbumCardProps) {
  return (
    <Link
      href={`/dashboard/albums/${album.id}`}
      className={cn(
        'group block rounded-lg border bg-card overflow-hidden transition-shadow hover:shadow-md',
        className,
      )}
    >
      {/* Cover Photo */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {album.coverPhoto?.thumbnailUrl ? (
          <img
            src={album.coverPhoto.thumbnailUrl}
            alt={album.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Photo count badge */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <ImageIcon className="h-3 w-3" />
          {album._count.photos}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm truncate">{album.title}</h3>
          <Badge
            variant={album.isPublished ? 'default' : 'secondary'}
            className="shrink-0 text-xs"
          >
            {album.isPublished ? (
              <>
                <Globe className="h-3 w-3 mr-1" />
                已發表
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 mr-1" />
                未發表
              </>
            )}
          </Badge>
        </div>

        {album.event && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {album.event.name}
          </p>
        )}

        {album.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {album.description}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {new Date(album.createdAt).toLocaleDateString('zh-TW')}
          {album.creator && ` · ${album.creator.name}`}
        </p>
      </div>
    </Link>
  );
}
