'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { authApi, isDemoMode } from '@/lib/api';
import { demoUser, demoCampaign } from '@/lib/demo-data';
import { Loader2, AlertCircle, Play } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, setAuth } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
  const callbackUrl = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL || 
    `${typeof window !== 'undefined' ? window.location.origin : ''}/login`;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // 檢查 LINE 是否已設定
  const isLineConfigured = channelId && 
    channelId !== 'your-line-channel-id' && 
    channelId.length > 5;

  // 檢查是否為開發環境
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 處理 LINE 回呼
  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // 處理 LINE 回傳的錯誤
    if (errorParam) {
      setError(decodeURIComponent(errorDescription || 'LINE 登入失敗'));
      return;
    }

    if (code) {
      handleLineCallback(code);
    }
  }, [searchParams]);

  // 已登入則根據身分導向對應介面
  useEffect(() => {
    if (isAuthenticated) {
      const pendingInviteCode = sessionStorage.getItem('pendingInviteCode');
      if (pendingInviteCode) {
        // 有待處理的邀請，導向邀請頁面
        router.push(`/join/${pendingInviteCode}`);
      } else {
        // 根據身分導向
        const user = useAuthStore.getState().user;
        if (user?.isAdmin) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }
    }
  }, [isAuthenticated, router]);

  const handleLineCallback = async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.lineCallback(code, callbackUrl);
      setAuth(result.user, result.accessToken);

      // 根據身分自動導向對應介面
      if (result.user.isAdmin) {
        router.push('/admin');  // 管理員導向管理後台
      } else {
        router.push('/dashboard');  // 一般使用者導向儀表板
      }
    } catch (err: any) {
      console.error('LINE login failed:', err);
      setError(err?.message || 'LINE 登入失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLineLogin = () => {
    if (!isLineConfigured) {
      setError('LINE 登入尚未設定。請先在 LINE Developers Console 建立 Channel，並設定環境變數。');
      return;
    }

    setError(null);
    const state = Math.random().toString(36).substring(7);
    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}&scope=profile%20openid`;
    window.location.href = lineAuthUrl;
  };

  // 示範模式快速登入
  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 直接使用示範資料設定認證狀態
      const demoToken = 'demo-token-' + Date.now();
      
      // 儲存示範活動 ID 到 localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentCampaignId', demoCampaign.id);
      }
      
      setAuth(demoUser, demoToken);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Demo login failed:', err);
      setError('示範登入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 開發環境快速登入
  const handleDevLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/auth/dev-login`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '開發登入失敗');
      }
      const result = await response.json();
      setAuth(result.user, result.accessToken);
      
      // 根據身分自動導向對應介面
      if (result.user.isAdmin) {
        router.push('/admin');  // 管理員導向管理後台
      } else {
        router.push('/dashboard');  // 一般使用者導向儀表板
      }
    } catch (err: any) {
      console.error('Dev login failed:', err);
      setError(err?.message || '開發登入失敗，請確認後端服務是否運行');
    } finally {
      setIsLoading(false);
    }
  };

  // 示範模式：顯示不同的 UI
  if (isDemoMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">選</span>
            </div>
            <CardTitle className="text-2xl">選情管理系統</CardTitle>
            <CardDescription className="text-base">
              專為台灣選舉打造的數位化管理工具
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 示範模式提示 */}
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                示範模式
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                點擊下方按鈕即可體驗完整系統功能，包含 500 位選民資料、800 筆接觸紀錄等示範內容。
              </p>
            </div>

            {/* 錯誤訊息 */}
            {error && (
              <div className="flex items-start gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 立即體驗按鈕 */}
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md"
              size="lg"
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Play className="mr-2 h-5 w-5" />
              )}
              {isLoading ? '載入中...' : '立即體驗'}
            </Button>

            {/* 功能列表 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                選民管理
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                接觸紀錄
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                行程規劃
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                地圖檢視
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                選情分析
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                團隊協作
              </div>
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              示範資料會在重新整理頁面後重置
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">選</span>
          </div>
          <CardTitle className="text-2xl">登入選情系統</CardTitle>
          <CardDescription>
            使用您的 LINE 帳號登入
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 錯誤訊息 */}
          {error && (
            <div className="flex items-start gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
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

          {/* LINE 未設定提示 */}
          {!isLineConfigured && (
            <p className="text-xs text-amber-600 text-center">
              LINE 登入尚未設定，請參考文件設定 LINE Channel
            </p>
          )}
          
          {/* 開發環境快速登入 */}
          {isDevelopment && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    開發環境
                  </span>
                </div>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={handleDevLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                開發環境快速登入（測試帳號）
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                此按鈕僅在開發環境顯示，使用預設測試帳號登入
              </p>
            </>
          )}
          
          <div className="text-center text-sm text-muted-foreground">
            <p>登入即表示您同意我們的</p>
            <p>
              <Link href="/terms" className="underline hover:text-foreground">
                服務條款
              </Link>
              {' 和 '}
              <Link href="/privacy" className="underline hover:text-foreground">
                隱私政策
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
