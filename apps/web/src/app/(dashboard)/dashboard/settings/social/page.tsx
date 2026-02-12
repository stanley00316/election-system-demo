'use client';

import { useQuery } from '@tanstack/react-query';
import { albumsApi } from '@/lib/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

// 社群平台 SVG 圖示（與 ShareButtons 一致）
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

interface PlatformConfig {
  key: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  docsUrl: string;
  envVars: string[];
}

const platforms: PlatformConfig[] = [
  {
    key: 'facebook',
    name: 'Facebook',
    icon: <FacebookIcon className="h-6 w-6" />,
    color: '#1877F2',
    description: '自動發佈相簿到 Facebook 粉絲專頁。需要建立 Facebook App 並取得粉絲專頁的 Page Access Token。',
    docsUrl: 'https://developers.facebook.com/docs/pages-api/posts',
    envVars: ['FACEBOOK_APP_ID', 'FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN'],
  },
  {
    key: 'line',
    name: 'LINE',
    icon: <LineIcon className="h-6 w-6" />,
    color: '#06C755',
    description: '透過 LINE Messaging API 廣播相簿卡片給所有好友。需要設定 LINE Messaging API 的 Channel Access Token。',
    docsUrl: 'https://developers.line.biz/en/docs/messaging-api/',
    envVars: ['LINE_MESSAGING_ACCESS_TOKEN'],
  },
  {
    key: 'x',
    name: 'X (Twitter)',
    icon: <XIcon className="h-6 w-6" />,
    color: '#000000',
    description: '自動發推文到 X (Twitter) 帳號。需要建立 Twitter Developer App 並取得 OAuth 1.0a 憑證。',
    docsUrl: 'https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/introduction',
    envVars: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'],
  },
  {
    key: 'instagram',
    name: 'Instagram',
    icon: <InstagramIcon className="h-6 w-6" />,
    color: '#E4405F',
    description: '自動發佈照片到 Instagram Business 帳號。透過 Facebook Graph API 操作，需要完成 Facebook Business 審核。',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api/guides/content-publishing/',
    envVars: ['FACEBOOK_PAGE_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'],
  },
];

export default function SocialSettingsPage() {
  const { data: status, isLoading } = useQuery({
    queryKey: ['social-status'],
    queryFn: () => albumsApi.getSocialStatus(),
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">社群帳號設定</h1>
          <p className="text-muted-foreground">
            連結社群平台帳號，啟用自動發佈相簿功能
          </p>
        </div>
      </div>

      {/* 說明 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-lg">💡</span>
            </div>
            <div>
              <p className="font-medium">設定方式</p>
              <p className="text-sm text-muted-foreground mt-1">
                社群平台 API 金鑰需由系統管理員在後端環境變數中設定。設定完成後，您即可從相簿詳情頁直接發佈到各平台。
                若僅需分享連結（不需要 API 金鑰），請至相簿詳情頁使用「分享按鈕」功能。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 平台列表 */}
      <div className="grid gap-4 md:grid-cols-2">
        {platforms.map((platform) => {
          const isConnected = status?.[platform.key] ?? false;

          return (
            <Card key={platform.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `${platform.color}15`,
                        color: platform.color,
                      }}
                    >
                      {platform.icon}
                    </div>
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                  </div>
                  <Badge
                    variant={isConnected ? 'default' : 'secondary'}
                    className={
                      isConnected
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : ''
                    }
                  >
                    {isLoading ? (
                      '檢查中...'
                    ) : isConnected ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        已連結
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        未設定
                      </span>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription>{platform.description}</CardDescription>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    需要的環境變數：
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {platform.envVars.map((v) => (
                      <code
                        key={v}
                        className="text-xs bg-muted px-1.5 py-0.5 rounded"
                      >
                        {v}
                      </code>
                    ))}
                  </div>
                </div>

                <a
                  href={platform.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="mt-2">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    查看文件
                  </Button>
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
