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

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.17.408-2.264 1.33-3.084.89-.792 2.14-1.28 3.726-1.456.946-.104 1.9-.086 2.818.049-.059-.477-.2-.9-.422-1.263-.357-.583-.93-.903-1.702-.952-1.155-.072-2.063.345-2.273.66l-1.752-1.19c.68-1.006 2.07-1.65 3.63-1.573 1.38.068 2.479.566 3.175 1.44.608.763.958 1.79 1.044 3.054l.006.117c.94.456 1.688 1.103 2.215 1.94.824 1.306 1.098 2.978.771 4.707C20.964 21.383 18.244 24 12.186 24zm1.638-8.178c-.642.017-1.17.15-1.564.395-.453.284-.688.653-.662 1.04.037.585.628.984 1.476.996.969-.028 1.728-.412 2.258-1.14.343-.473.583-1.066.723-1.773-.71-.147-1.46-.234-2.204-.25l-.027-.268z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
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
  {
    key: 'threads' as const,
    name: 'Threads',
    icon: <ThreadsIcon className="h-4 w-4" />,
    color: '#000000',
  },
  {
    key: 'tiktok' as const,
    name: 'TikTok',
    icon: <TikTokIcon className="h-4 w-4" />,
    color: '#000000',
  },
  {
    key: 'youtube' as const,
    name: 'YouTube',
    icon: <YouTubeIcon className="h-4 w-4" />,
    color: '#FF0000',
  },
  {
    key: 'telegram' as const,
    name: 'Telegram',
    icon: <TelegramIcon className="h-4 w-4" />,
    color: '#26A5E4',
  },
  {
    key: 'whatsapp' as const,
    name: 'WhatsApp',
    icon: <WhatsAppIcon className="h-4 w-4" />,
    color: '#25D366',
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
