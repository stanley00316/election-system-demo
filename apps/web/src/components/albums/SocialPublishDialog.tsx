'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { albumsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

// 各平台 SVG 圖示
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
    </svg>
  );
}

const platformConfigs = [
  {
    key: 'facebook' as const,
    name: 'Facebook',
    icon: <FacebookIcon className="h-4 w-4" />,
    color: '#1877F2',
  },
  {
    key: 'line' as const,
    name: 'LINE',
    icon: <LineIcon className="h-4 w-4" />,
    color: '#06C755',
  },
  {
    key: 'x' as const,
    name: 'X (Twitter)',
    icon: <XIcon className="h-4 w-4" />,
    color: '#000000',
  },
  {
    key: 'instagram' as const,
    name: 'Instagram',
    icon: <InstagramIcon className="h-4 w-4" />,
    color: '#E4405F',
  },
];

interface SocialShareResult {
  platform: string;
  success: boolean;
  postUrl?: string;
  error?: string;
}

interface SocialPublishDialogProps {
  albumId: string;
  albumTitle: string;
  isPublished: boolean;
}

export function SocialPublishDialog({
  albumId,
  albumTitle,
  isPublished,
}: SocialPublishDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState<SocialShareResult[] | null>(null);

  // 查詢各平台設定狀態
  const { data: platformStatus } = useQuery({
    queryKey: ['social-status'],
    queryFn: () => albumsApi.getSocialStatus(),
    enabled: open,
  });

  // 發佈 mutation
  const publishMutation = useMutation({
    mutationFn: () =>
      albumsApi.shareSocial(albumId, {
        platforms: selectedPlatforms,
        message: message || undefined,
      }),
    onSuccess: (data) => {
      setResults(data);
      const successes = data.filter((r: SocialShareResult) => r.success).length;
      const failures = data.length - successes;

      if (successes > 0 && failures === 0) {
        toast({ title: `已成功發佈到 ${successes} 個平台` });
      } else if (successes > 0 && failures > 0) {
        toast({
          title: `${successes} 個平台成功，${failures} 個失敗`,
          variant: 'destructive',
        });
      } else {
        toast({ title: '所有平台發佈失敗', variant: 'destructive' });
      }
    },
    onError: (err: any) => {
      toast({
        title: '發佈失敗',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handlePublish = () => {
    if (selectedPlatforms.length === 0) {
      toast({ title: '請至少選擇一個平台', variant: 'destructive' });
      return;
    }
    publishMutation.mutate();
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // reset state on close
      setSelectedPlatforms([]);
      setMessage('');
      setResults(null);
    }
  };

  const configuredPlatforms = platformConfigs.filter(
    (p) => platformStatus?.[p.key]
  );
  const hasConfiguredPlatforms = configuredPlatforms.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!isPublished}
          title={!isPublished ? '請先發表相簿' : '發佈到社群平台'}
        >
          <Send className="h-4 w-4 mr-2" />
          發佈到社群
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>發佈到社群平台</DialogTitle>
          <DialogDescription>
            將「{albumTitle}」發佈到選定的社群平台
          </DialogDescription>
        </DialogHeader>

        {/* 已有發佈結果 */}
        {results ? (
          <div className="space-y-3 py-2">
            <p className="text-sm font-medium">發佈結果</p>
            {results.map((result) => {
              const config = platformConfigs.find(
                (p) => p.key === result.platform
              );
              return (
                <div
                  key={result.platform}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: config?.color }}>
                      {config?.icon}
                    </span>
                    <span className="text-sm font-medium">
                      {config?.name || result.platform}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <>
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-800 hover:bg-green-100"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          成功
                        </Badge>
                        {result.postUrl && (
                          <a
                            href={result.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                      </>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        失敗
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                關閉
              </Button>
            </DialogFooter>
          </div>
        ) : !hasConfiguredPlatforms ? (
          /* 尚未設定任何平台 */
          <div className="py-6 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              尚未設定任何社群平台 API 金鑰。
            </p>
            <p className="text-sm text-muted-foreground">
              請至「設定 &gt; 社群帳號」頁面查看設定方式。
            </p>
            <Link href="/dashboard/settings/social">
              <Button variant="outline" size="sm" className="mt-2">
                前往設定
              </Button>
            </Link>
          </div>
        ) : (
          /* 選擇平台 & 輸入訊息 */
          <div className="space-y-4 py-2">
            {/* 平台選擇 */}
            <div className="space-y-2">
              <p className="text-sm font-medium">選擇平台</p>
              <div className="grid grid-cols-2 gap-2">
                {platformConfigs.map((platform) => {
                  const isConfigured = platformStatus?.[platform.key] ?? false;
                  const isSelected = selectedPlatforms.includes(platform.key);

                  return (
                    <button
                      key={platform.key}
                      type="button"
                      disabled={!isConfigured}
                      onClick={() => togglePlatform(platform.key)}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-lg border text-left transition-colors',
                        isConfigured
                          ? 'hover:bg-muted cursor-pointer'
                          : 'opacity-50 cursor-not-allowed',
                        isSelected && 'border-primary bg-primary/5'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={!isConfigured}
                        className="pointer-events-none"
                      />
                      <span style={{ color: platform.color }}>
                        {platform.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{platform.name}</p>
                        {!isConfigured && (
                          <p className="text-xs text-muted-foreground">
                            未設定
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 自訂訊息 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                自訂訊息
                <span className="text-muted-foreground font-normal ml-1">
                  （選填）
                </span>
              </label>
              <Textarea
                placeholder="輸入要附帶的訊息文字（留空將使用預設內容）"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                取消
              </Button>
              <Button
                onClick={handlePublish}
                disabled={
                  selectedPlatforms.length === 0 || publishMutation.isPending
                }
              >
                {publishMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    發佈中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    發佈到 {selectedPlatforms.length || ''} 個平台
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
