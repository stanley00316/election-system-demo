'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { PhotoLightbox } from '@/components/albums/PhotoLightbox';
import type { PhotoItem } from '@/components/albums/PhotoGrid';

interface PublicAlbumData {
  id: string;
  title: string;
  description?: string | null;
  publishedAt: string;
  campaignName: string;
  photoCount: number;
  photos: PhotoItem[];
}

export function PublicAlbumView({ album }: { album: PublicAlbumData }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl font-bold">{album.title}</h1>
          {album.description && (
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              {album.description}
            </p>
          )}
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>{album.campaignName}</span>
            <span>·</span>
            <span>{album.photoCount} 張照片</span>
            <span>·</span>
            <span>
              {new Date(album.publishedAt).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </header>

      {/* Photo Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {album.photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-3" />
            <p>此相簿尚無照片</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
            {album.photos.map((photo, index) => (
              <div
                key={photo.id}
                className="break-inside-avoid rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setLightboxIndex(index)}
              >
                <img
                  src={photo.thumbnailUrl || photo.url}
                  alt={photo.caption || '照片'}
                  className="w-full object-cover transition-transform group-hover:scale-[1.02]"
                  loading="lazy"
                />
                {photo.caption && (
                  <div className="px-3 py-2 bg-card">
                    <p className="text-sm text-muted-foreground">
                      {photo.caption}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        由選情系統建立
      </footer>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={album.photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
