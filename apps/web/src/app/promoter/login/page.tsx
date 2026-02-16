'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { isDemoMode } from '@/lib/api';
import { demoUser, demoCampaign } from '@/lib/demo-data';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Play,
  Megaphone,
  TrendingUp,
  Link2,
  Gift,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react';

function PromoterLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, setAuth } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
  const callbackUrl = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL ||
    `${typeof window !== 'undefined' ? window.location.origin : ''}/login`;

  const isLineConfigured = channelId &&
    channelId !== 'your-line-channel-id' &&
    channelId.length > 5;

  const status = searchParams.get('status');

  // 已登入的推廣者 → 直接進入儀表板
  useEffect(() => {
    if (isAuthenticated && user) {
      const promoter = user.promoter;
      if (promoter?.isActive && promoter?.status === 'APPROVED') {
        router.replace('/promoter/dashboard');
      }
      // 非推廣者但已登入：留在此頁顯示狀態
    }
  }, [isAuthenticated, user, router]);

  const handleLineLogin = () => {
    if (!isLineConfigured) {
      setError('LINE 登入尚未設定。請先在 LINE Developers Console 建立 Channel，並設定環境變數。');
      return;
    }

    setError(null);
    // 標記意圖角色為推廣者
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('intendedRole', 'promoter');
    }
    // OWASP A08: 使用加密安全的隨機值作為 OAuth state，防止 CSRF 攻擊
    const stateArray = new Uint8Array(32);
    crypto.getRandomValues(stateArray);
    const state = Array.from(stateArray, b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('oauth_state', state);
    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}&scope=profile%20openid`;
    window.location.href = lineAuthUrl;
  };

  // Demo 模式快速登入
  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const demoToken = 'demo-token-' + Date.now();
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentCampaignId', demoCampaign.id);
      }
      setAuth(demoUser, demoToken);
      router.push('/promoter/dashboard');
    } catch (err: any) {
      console.error('Demo login failed:', err);
      setError('示範登入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 已登入但非核准推廣者 → 顯示狀態頁
  if (isAuthenticated && user) {
    const promoter = user.promoter;

    // 有推廣者記錄但未核准
    if (promoter && !(promoter.isActive && promoter.status === 'APPROVED')) {
      const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
        PENDING: {
          label: '待審核',
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          icon: <Clock className="h-8 w-8 text-amber-500" />,
          description: '您的推廣者申請已送出，正在等待管理員審核。審核通過後，您將可以使用推廣者功能。',
        },
        SUSPENDED: {
          label: '已停用',
          color: 'text-red-600 bg-red-50 border-red-200',
          icon: <XCircle className="h-8 w-8 text-red-500" />,
          description: '您的推廣者帳號已被停用。如有疑問，請聯繫管理員。',
        },
      };

      const currentStatus = statusMap[promoter.status] || statusMap['PENDING'];

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
          <Card className="w-full max-w-md border-gray-700 bg-gray-800/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                {currentStatus.icon}
              </div>
              <CardTitle className="text-xl text-white">
                推廣者申請狀態：{currentStatus.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`rounded-lg p-4 border ${currentStatus.color}`}>
                <p className="text-sm">{currentStatus.description}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                  onClick={() => router.push('/dashboard')}
                >
                  前往使用者介面
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                  onClick={() => {
                    useAuthStore.getState().logout();
                    router.push('/promoter/login');
                  }}
                >
                  登出
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // 沒有推廣者記錄 → 導向申請
    if (!promoter) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
          <Card className="w-full max-w-md border-gray-700 bg-gray-800/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <FileText className="h-8 w-8 text-blue-400" />
              </div>
              <CardTitle className="text-xl text-white">尚未成為推廣者</CardTitle>
              <CardDescription className="text-gray-400">
                您目前尚未申請成為推廣者，請先提交申請，待管理員審核通過後即可使用推廣者功能。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                size="lg"
                onClick={() => router.push('/promoter/register')}
              >
                <Megaphone className="mr-2 h-5 w-5" />
                立即申請成為推廣者
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                  onClick={() => router.push('/dashboard')}
                >
                  前往使用者介面
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                  onClick={() => {
                    useAuthStore.getState().logout();
                    router.push('/promoter/login');
                  }}
                >
                  登出
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Demo 模式
  if (isDemoMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <Card className="w-full max-w-md border-gray-700 bg-gray-800/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Megaphone className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">推廣者平台</CardTitle>
            <CardDescription className="text-gray-400 text-base">
              管理您的推廣成效與獎勵
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 示範模式提示 */}
            <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
              <h3 className="font-medium text-purple-200 mb-2">示範模式</h3>
              <p className="text-sm text-purple-300">
                點擊下方按鈕體驗推廣者後台功能，包含推薦紀錄、分享連結管理、試用邀請等。
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-md"
              size="lg"
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Play className="mr-2 h-5 w-5" />
              )}
              {isLoading ? '載入中...' : '體驗推廣者後台'}
            </Button>

            {/* 推廣者功能列表 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                推廣成效
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Link2 className="h-4 w-4 text-purple-400" />
                分享連結
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Gift className="h-4 w-4 text-purple-400" />
                試用管理
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <DollarSign className="h-4 w-4 text-purple-400" />
                獎勵追蹤
              </div>
            </div>

            <p className="text-xs text-center text-gray-500">
              示範資料會在重新整理頁面後重置
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 正式模式：未登入的推廣者登入頁
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <Card className="w-full max-w-md border-gray-700 bg-gray-800/50 backdrop-blur">
        <div className="pt-4 px-4">
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            返回登入
          </Link>
        </div>
        <CardHeader className="text-center pt-2">
          <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Megaphone className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">推廣者登入</CardTitle>
          <CardDescription className="text-gray-400">
            使用您的 LINE 帳號登入推廣者平台
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* LINE 登入按鈕 */}
          <Button
            className="w-full bg-[#06C755] hover:bg-[#05b04c] text-white"
            size="lg"
            onClick={handleLineLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.12 3.42 7.58 8.07 8.35.31.07.74.21.85.48.1.24.06.62.03.87l-.14.82c-.04.24-.19.95.83.52s5.52-3.26 7.53-5.58C21.16 13.48 22 11.99 22 10.5 22 5.82 17.52 2 12 2zm-3.97 8.87H6.1a.47.47 0 0 1-.47-.47V7.1c0-.26.21-.47.47-.47s.47.21.47.47v2.83h1.47c.26 0 .47.21.47.47s-.21.47-.47.47zm2.25-.47a.47.47 0 0 1-.94 0V7.1a.47.47 0 0 1 .94 0v3.3zm4.22 0a.47.47 0 0 1-.38.46.47.47 0 0 1-.52-.23l-2.1-2.86v2.63a.47.47 0 0 1-.94 0V7.1c0-.19.12-.36.29-.43a.47.47 0 0 1 .52.11l2.19 2.97V7.1a.47.47 0 0 1 .94 0v3.3zm3.55-1.93h-1.47v-.9h1.47c.26 0 .47-.21.47-.47s-.21-.47-.47-.47h-1.94a.47.47 0 0 0-.47.47v3.3c0 .26.21.47.47.47h1.94c.26 0 .47-.21.47-.47s-.21-.47-.47-.47h-1.47v-.9h1.47c.26 0 .47-.21.47-.47s-.21-.47-.47-.47z"/>
              </svg>
            )}
            {isLoading ? '登入中...' : '使用 LINE 登入'}
          </Button>

          {!isLineConfigured && (
            <p className="text-xs text-amber-400 text-center">
              LINE 登入尚未設定，請參考文件設定 LINE Channel
            </p>
          )}

          {/* 推廣者功能介紹 */}
          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-gray-300">推廣者平台功能</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                推廣成效追蹤
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Link2 className="h-3.5 w-3.5 text-purple-400" />
                專屬分享連結
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Gift className="h-3.5 w-3.5 text-purple-400" />
                試用邀請管理
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <DollarSign className="h-3.5 w-3.5 text-purple-400" />
                獎勵即時追蹤
              </div>
            </div>
          </div>

          {/* 分隔線 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-gray-800 px-2 text-gray-500">
                還不是推廣者？
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            onClick={() => router.push('/promoter/register')}
          >
            <Megaphone className="mr-2 h-4 w-4" />
            申請成為推廣者
          </Button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-gray-500 hover:text-gray-300 underline"
            >
              我是一般使用者，前往使用者登入
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PromoterLoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <Card className="w-full max-w-md border-gray-700 bg-gray-800/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function PromoterLoginPage() {
  return (
    <Suspense fallback={<PromoterLoginLoading />}>
      <PromoterLoginContent />
    </Suspense>
  );
}
