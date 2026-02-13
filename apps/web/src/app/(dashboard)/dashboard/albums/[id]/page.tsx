'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { albumsApi, photosApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PhotoGrid } from '@/components/albums/PhotoGrid';
import { PhotoUploader } from '@/components/albums/PhotoUploader';
import { PublishToggle } from '@/components/albums/PublishToggle';
import { ShareButtons } from '@/components/albums/ShareButtons';
import { SocialPublishDialog } from '@/components/albums/SocialPublishDialog';
import {
  Edit2,
  Trash2,
  ArrowLeft,
  Calendar,
  Loader2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AlbumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const albumId = params.id as string;

  const { data: album, isLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => albumsApi.getById(albumId),
    enabled: !!albumId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => albumsApi.delete(albumId),
    onSuccess: () => {
      toast({ title: '相簿已刪除' });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      router.push('/dashboard/albums');
    },
  });

  const setCoverMutation = useMutation({
    mutationFn: (photoId: string) => albumsApi.setCoverPhoto(albumId, photoId),
    onSuccess: () => {
      toast({ title: '封面已更新' });
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: string) => photosApi.delete(photoId),
    onSuccess: () => {
      toast({ title: '照片已刪除' });
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
    },
  });

  const handleUpload = async (files: File[]) => {
    try {
      await albumsApi.uploadPhotos(albumId, files);
      toast({ title: `已上傳 ${files.length} 張照片` });
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
    } catch (err: any) {
      toast({
        title: '上傳失敗',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const handlePublish = async () => {
    const result = await albumsApi.publish(albumId);
    queryClient.invalidateQueries({ queryKey: ['album', albumId] });
    return result;
  };

  const handleUnpublish = async () => {
    const result = await albumsApi.unpublish(albumId);
    queryClient.invalidateQueries({ queryKey: ['album', albumId] });
    return result;
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        相簿不存在
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{album.title}</h1>
            {album.event && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-4 w-4" />
                {album.event.name}
              </p>
            )}
          </div>
        </div>

        {album.description && (
          <p className="text-sm text-muted-foreground">{album.description}</p>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <PublishToggle
              isPublished={album.isPublished}
              publishSlug={album.publishSlug}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
            />
            {album.isPublished && album.publishSlug && (
              <div className="flex flex-col gap-1">
                <ShareButtons
                  url={`${typeof window !== 'undefined' ? window.location.origin : ''}/p/${album.publishSlug}`}
                  title={album.title}
                  description={album.description || undefined}
                  compact
                />
                <p className="text-xs text-muted-foreground">
                  點擊圖示分享到各平台，或使用右側「發佈到社群」自動發佈
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <SocialPublishDialog
              albumId={albumId}
              albumTitle={album.title}
              isPublished={album.isPublished}
            />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/albums/${albumId}/edit`}>
                <Edit2 className="h-4 w-4 mr-2" />
                編輯
              </Link>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  刪除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>確定要刪除此相簿？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作會刪除相簿內所有照片，且無法復原。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    確認刪除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <PhotoUploader onUpload={handleUpload} />

      {/* Photo Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          共 {album.photos?.length || 0} 張照片
        </p>
      </div>

      {/* Photo Grid */}
      <PhotoGrid
        photos={album.photos || []}
        coverPhotoId={album.coverPhoto?.id}
        onSetCover={(photoId) => setCoverMutation.mutate(photoId)}
        onDelete={(photoId) => deletePhotoMutation.mutate(photoId)}
      />
    </div>
  );
}
