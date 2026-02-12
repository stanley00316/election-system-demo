'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon, Star, Trash2, Edit2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PhotoLightbox } from './PhotoLightbox';

export interface PhotoItem {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  createdAt: string;
  uploader?: { id: string; name: string } | null;
}

interface PhotoGridProps {
  photos: PhotoItem[];
  onSetCover?: (photoId: string) => void;
  onDelete?: (photoId: string) => void;
  onEditCaption?: (photoId: string, caption: string) => void;
  coverPhotoId?: string | null;
  readonly?: boolean;
  className?: string;
}

export function PhotoGrid({
  photos,
  onSetCover,
  onDelete,
  onEditCaption,
  coverPhotoId,
  readonly = false,
  className,
}: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-3" />
        <p className="text-sm">尚無照片</p>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2',
          className,
        )}
      >
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer bg-muted"
            onClick={() => setLightboxIndex(index)}
          >
            <img
              src={photo.thumbnailUrl || photo.url}
              alt={photo.caption || '照片'}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />

            {/* Cover badge */}
            {coverPhotoId === photo.id && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star className="h-3 w-3" />
                封面
              </div>
            )}

            {/* Hover overlay */}
            {!readonly && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onSetCover && coverPhotoId !== photo.id && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetCover(photo.id);
                          }}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          設為封面
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(photo.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          刪除
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}

            {/* Caption */}
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">{photo.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
