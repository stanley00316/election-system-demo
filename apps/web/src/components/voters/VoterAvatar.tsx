'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { voterAvatarApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface VoterAvatarProps {
  voterId: string;
  voterName: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
  onAvatarChange?: () => void;
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-16 w-16 text-lg',
  lg: 'h-24 w-24 text-2xl',
};

export function VoterAvatar({
  voterId,
  voterName,
  avatarUrl,
  size = 'md',
  editable = false,
  onAvatarChange,
  className,
}: VoterAvatarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 前端預驗證
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: '不支援的檔案格式',
        description: '請使用 JPG、PNG、WebP 或 HEIC 格式',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: '檔案過大',
        description: '照片大小不能超過 10MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      await voterAvatarApi.upload(voterId, file);
      toast({ title: '辨識照已更新' });
      onAvatarChange?.();
    } catch (err: any) {
      toast({
        title: '上傳失敗',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    setIsUploading(true);
    try {
      await voterAvatarApi.delete(voterId);
      toast({ title: '辨識照已移除' });
      onAvatarChange?.();
    } catch (err: any) {
      toast({
        title: '移除失敗',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn('relative inline-flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden bg-muted flex items-center justify-center relative',
          sizeMap[size],
          editable && 'cursor-pointer group',
        )}
        onClick={() => editable && inputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="h-1/2 w-1/2 animate-spin text-muted-foreground" />
        ) : avatarUrl ? (
          <img
            src={avatarUrl}
            alt={voterName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-medium text-muted-foreground">
            {voterName?.charAt(0) || <User className="h-1/2 w-1/2" />}
          </span>
        )}

        {/* Edit overlay */}
        {editable && !isUploading && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="h-1/3 w-1/3 text-white" />
          </div>
        )}
      </div>

      {editable && (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={handleUpload}
        />
      )}

      {editable && avatarUrl && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-destructive"
          onClick={handleDelete}
          disabled={isUploading}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          移除
        </Button>
      )}
    </div>
  );
}
