'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth';
import { authApi, roleInvitesApi, isDemoMode, getProductionUrl } from '@/lib/api';
import { demoUser, demoCampaign } from '@/lib/demo-data';
import {
  Loader2, AlertCircle, Play, Users, Phone, MapPin, BarChart3,
  CalendarDays, UsersRound, Megaphone, Shield, ChevronRight,
  Vote, CheckCircle2, Globe, TrendingUp, ArrowRight,
} from 'lucide-react';

/**
 * 根據使用者角色決定導向路徑
 * 多角色 → /role-select，單角色 → 對應 Dashboard
 */
function getPostLoginPath(user: any): string {
  const roles: string[] = [];
  if (user?.isAdmin || user?.isSuperAdmin) roles.push('admin');
  if (user?.promoter?.isActive && user?.promoter?.status === 'APPROVED') roles.push('promoter');
  roles.push('user'); // 所有人都有使用者角色

  if (roles.length > 1) {
    return '/role-select';
  }
  return '/dashboard';
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, setAuth, setTempAuth } = useAuthStore();

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
      // OWASP A08: 驗證 OAuth state 參數，防止 CSRF 攻擊
      const returnedState = searchParams.get('state');
      const savedState = sessionStorage.getItem('oauth_state');
      if (!returnedState || !savedState || returnedState !== savedState) {
        setError('登入驗證失敗（state 參數不符），請重新登入');
        sessionStorage.removeItem('oauth_state');
        return;
      }
      sessionStorage.removeItem('oauth_state'); // 一次性使用，立即清除
      handleLineCallback(code);
    }
  }, [searchParams]);

  // 已登入則根據身分導向對應介面
  useEffect(() => {
    if (isAuthenticated) {
      const pendingInviteCode = sessionStorage.getItem('pendingInviteCode');
      const pendingTrialCode = sessionStorage.getItem('pendingTrialCode');
      const pendingPromoterCode = sessionStorage.getItem('pendingPromoterCode');
      const pendingRoleInvite = sessionStorage.getItem('pendingRoleInvite');

      // 讀取並清除意圖角色
      const intendedRole = typeof window !== 'undefined'
        ? sessionStorage.getItem('intendedRole')
        : null;
      if (intendedRole) {
        sessionStorage.removeItem('intendedRole');
      }

      // 有角色邀請 → 導向邀請落地頁（由落地頁自動 claim）
      if (pendingRoleInvite) {
        sessionStorage.removeItem('pendingRoleInvite');
        router.push(`/join-role/${pendingRoleInvite}`);
      } else if (pendingInviteCode) {
        // 有待處理的邀請，導向邀請頁面
        router.push(`/join/${pendingInviteCode}`);
      } else if (pendingTrialCode) {
        // 有待處理的試用邀請，導向試用啟用頁
        router.push(`/trial/${pendingTrialCode}`);
      } else if (pendingPromoterCode) {
        // 有推廣碼，導向定價頁面（推廣碼已存入 sessionStorage）
        router.push('/pricing');
      } else if (intendedRole === 'user') {
        router.push('/dashboard');
      } else if (intendedRole === 'promoter') {
        const user = useAuthStore.getState().user;
        const promoter = user?.promoter;
        if (promoter?.isActive && promoter?.status === 'APPROVED') {
          router.push('/promoter/dashboard');
        } else if (promoter) {
          router.push('/promoter/login?status=pending');
        } else {
          router.push('/promoter/register');
        }
      } else {
        // 根據身分導向（多角色 → 角色選擇頁）
        const user = useAuthStore.getState().user;
        router.push(getPostLoginPath(user));
      }
    }
  }, [isAuthenticated, router]);

  /**
   * 計算登入後的導向路徑（根據角色和 sessionStorage 中的待處理項目）
   */
  const computePostLoginRedirect = (user: any): string => {
    const intendedRole = typeof window !== 'undefined'
      ? sessionStorage.getItem('intendedRole')
      : null;
    if (intendedRole) sessionStorage.removeItem('intendedRole');

    const pendingRoleInvite = typeof window !== 'undefined'
      ? sessionStorage.getItem('pendingRoleInvite')
      : null;
    const pendingTrialCode = typeof window !== 'undefined'
      ? sessionStorage.getItem('pendingTrialCode')
      : null;

    if (pendingRoleInvite) {
      sessionStorage.removeItem('pendingRoleInvite');
      return `/join-role/${pendingRoleInvite}`;
    }
    if (pendingTrialCode) {
      return `/trial/${pendingTrialCode}`;
    }
    if (intendedRole === 'user') return '/dashboard';
    if (intendedRole === 'promoter') {
      const { promoter } = user;
      if (promoter?.isActive && promoter?.status === 'APPROVED') return '/promoter/dashboard';
      if (promoter) return '/promoter/login?status=pending';
      return '/promoter/register';
    }
    return getPostLoginPath(user);
  };

  /**
   * 從 cookie 或 sessionStorage 取得推廣碼
   * 優先順序：cookie ref_code > sessionStorage pendingPromoterCode
   */
  const getPromoterCode = (): string | null => {
    if (typeof window === 'undefined') return null;
    // 優先讀取 middleware 設定的 cookie（?ref=CODE 來源）
    const cookieMatch = document.cookie.match(/(?:^|;\s*)ref_code=([^;]*)/);
    const cookieCode = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    // Fallback 到 sessionStorage（/s/CODE 來源）
    const sessionCode = sessionStorage.getItem('pendingPromoterCode');
    return cookieCode || sessionCode || null;
  };

  /**
   * 清除所有推廣碼來源
   */
  const clearPromoterCode = () => {
    if (typeof window === 'undefined') return;
    // 清除 cookie
    document.cookie = 'ref_code=; path=/; max-age=0';
    // 清除 sessionStorage
    sessionStorage.removeItem('pendingPromoterCode');
  };

  const handleLineCallback = async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // 從 cookie 或 sessionStorage 取得推廣碼
      const pendingPromoterCode = getPromoterCode();

      // OWASP A04: 將 state 傳遞給後端做 HMAC 簽章驗證
      const savedState = sessionStorage.getItem('oauth_state') || undefined;
      const result = await authApi.lineCallback(code, callbackUrl, pendingPromoterCode || undefined, savedState);

      // 清除已使用的推廣碼
      if (pendingPromoterCode) {
        clearPromoterCode();
      }

      // 2FA 流程：後端要求雙因素驗證
      if (result.requiresTwoFactor && result.tempToken) {
        const redirectPath = computePostLoginRedirect(result.user);
        setTempAuth(result.tempToken, result.user, redirectPath);

        if (result.setupRequired) {
          router.push('/setup-2fa');
        } else {
          router.push('/verify-2fa');
        }
        return;
      }

      // 直接登入（向下相容：理論上不再走此路徑）
      if (result.accessToken) {
        setAuth(result.user, result.accessToken);
        router.push(computePostLoginRedirect(result.user));
      }
    } catch (err: any) {
      console.error('LINE login failed:', err);
      setError(err?.message || 'LINE 登入失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLineLogin = async () => {
    if (!isLineConfigured) {
      setError('LINE 登入尚未設定。請先在 LINE Developers Console 建立 Channel，並設定環境變數。');
      return;
    }

    setError(null);
    // 標記意圖角色為使用者
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('intendedRole', 'user');
    }
    // OWASP A04: 從後端取得 HMAC 簽章的 state，同時用於前端 + 後端雙重驗證
    try {
      const { state: serverState } = await authApi.generateOAuthState();
      sessionStorage.setItem('oauth_state', serverState);
      const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${serverState}&scope=profile%20openid`;
      window.location.href = lineAuthUrl;
    } catch {
      // Fallback：若後端不可用，使用本地隨機 state
      const stateArray = new Uint8Array(32);
      crypto.getRandomValues(stateArray);
      const state = Array.from(stateArray, b => b.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem('oauth_state', state);
      const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}&scope=profile%20openid`;
      window.location.href = lineAuthUrl;
    }
  };

  // 示範模式快速登入（支援不同角色入口）
  const handleDemoLogin = async (role: 'user' | 'promoter' | 'admin' = 'user') => {
    setIsLoading(true);
    setError(null);
    try {
      const demoToken = 'demo-token-' + Date.now();
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('currentCampaignId', demoCampaign.id);
          sessionStorage.setItem('intendedRole', role);
        } catch (e) {
          console.warn('[Demo] Storage write failed:', e);
        }
      }
      
      setAuth(demoUser, demoToken);

      // 根據選擇的角色導向不同儀表板
      switch (role) {
        case 'promoter':
          router.push('/promoter/dashboard');
          break;
        case 'admin':
          router.push('/admin');
          break;
        case 'user':
        default:
          router.push('/dashboard');
          break;
      }
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
      
      // 根據角色導向對應介面
      router.push(getPostLoginPath(result.user));
    } catch (err: any) {
      console.error('Dev login failed:', err);
      setError(err?.message || '開發登入失敗，請確認後端服務是否運行');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== 示範模式：產品著陸頁 ==========
  if (isDemoMode) {
    const features = [
      { icon: Users,        title: '選民管理',   desc: '建立選民資料庫，標記政治傾向與偏好，精準掌握選區動態' },
      { icon: Phone,        title: '接觸紀錄',   desc: '記錄每次拜訪、電話、LINE 訊息等接觸，追蹤選民互動歷程' },
      { icon: MapPin,       title: '地圖熱力圖', desc: '視覺化選民分佈，一眼掌握重點村里與空白區域' },
      { icon: BarChart3,    title: '選情分析',   desc: '支持度統計、接觸趨勢圖表，數據驅動的選戰策略' },
      { icon: CalendarDays, title: '行程規劃',   desc: '候選人行程管理、活動安排，團隊成員共享日曆' },
      { icon: UsersRound,   title: '團隊協作',   desc: '多角色團隊管理、權限控制，高效分工不遺漏' },
      { icon: Megaphone,    title: '推廣系統',   desc: '推廣人員專屬面板，追蹤推薦成效與佣金' },
      { icon: Shield,       title: '管理後台',   desc: '使用者管理、訂閱管理、營收總覽，系統一手掌控' },
    ];

    const roleEntries = [
      {
        role: 'user' as const,
        icon: Vote,
        title: '候選人團隊',
        desc: '選民管理、接觸紀錄、選情分析、行程規劃',
        gradient: 'from-blue-500 to-indigo-600',
        hoverGradient: 'hover:from-blue-600 hover:to-indigo-700',
        bgLight: 'bg-blue-50 dark:bg-blue-950/40',
        borderColor: 'border-blue-200 dark:border-blue-800',
        iconBg: 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400',
      },
      {
        role: 'promoter' as const,
        icon: Megaphone,
        title: '推廣人員',
        desc: '推廣成效追蹤、分享連結、佣金報表',
        gradient: 'from-emerald-500 to-teal-600',
        hoverGradient: 'hover:from-emerald-600 hover:to-teal-700',
        bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400',
      },
    ];

    const stats = [
      { value: '500+', label: '選民資料' },
      { value: '800+', label: '接觸紀錄' },
      { value: '12',   label: '行政區域' },
      { value: '120',  label: '村里' },
      { value: '25',   label: '活動場次' },
      { value: '5',    label: '選舉類型' },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        {/* ── 導航列 ── */}
        <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
                <span className="text-white font-bold text-lg">選</span>
              </div>
              <span className="text-lg font-bold tracking-tight">選情管理系統</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                展示模式
              </Badge>
              <a href={getProductionUrl()} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  正式使用
                  <ChevronRight className="ml-0.5 h-3 w-3" />
                </Button>
              </a>
            </div>
          </div>
        </header>

        {/* ── Hero 區塊 ── */}
        <section className="relative overflow-hidden">
          {/* 背景裝飾 */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-500/20 blur-3xl dark:from-blue-600/10 dark:to-indigo-700/10" />
          </div>

          <div className="mx-auto max-w-4xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-16 text-center">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium">
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              專為台灣選舉打造
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              數位選戰的
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                致勝利器
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
              從選民管理到選情分析，一站式整合所有選戰資源。
              <br className="hidden sm:block" />
              讓數據驅動決策，讓每一步都精準有效。
            </p>

            {/* 主要 CTA */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 px-8 text-base"
                onClick={() => handleDemoLogin('user')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Play className="mr-2 h-5 w-5" />
                )}
                立即體驗
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 text-base"
                onClick={() => {
                  document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                選擇體驗角色
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {/* 錯誤訊息 */}
            {error && (
              <div className="mx-auto mt-6 max-w-md flex items-start gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* ── 功能亮點 ── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold sm:text-3xl">核心功能</h2>
            <p className="mt-3 text-muted-foreground">
              涵蓋選戰管理的每個環節
            </p>
          </div>
          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} className="group relative overflow-hidden border bg-card transition-shadow hover:shadow-md">
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <f.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── 三角色入口 ── */}
        <section id="roles" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold sm:text-3xl">選擇體驗角色</h2>
            <p className="mt-3 text-muted-foreground">
              從不同視角了解系統功能
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {roleEntries.map((entry) => (
              <Card
                key={entry.role}
                className={`group cursor-pointer border-2 ${entry.borderColor} ${entry.bgLight} transition-all hover:shadow-lg hover:scale-[1.02]`}
                onClick={() => !isLoading && handleDemoLogin(entry.role)}
              >
                <CardContent className="p-6 sm:p-8 text-center">
                  <div className={`mx-auto mb-4 h-14 w-14 rounded-xl ${entry.iconBg} flex items-center justify-center`}>
                    <entry.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{entry.title}</h3>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{entry.desc}</p>
                  <Button
                    className={`w-full bg-gradient-to-r ${entry.gradient} ${entry.hoverGradient} text-white shadow`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    進入體驗
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── 數據信任區 ── */}
        <section className="border-t bg-muted/40">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="text-center mb-10">
              <h2 className="text-xl font-bold sm:text-2xl">豐富的展示資料</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                內建完整模擬資料，無需註冊即可體驗全部功能
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 sm:gap-6">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-extrabold sm:text-3xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 正式使用引導 ── */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl mb-4">
              準備好開始您的選戰了嗎？
            </h2>
            <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
              範例版僅供功能展示，正式版提供完整選戰管理功能，立即註冊開始使用。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={getProductionUrl()} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="bg-white text-blue-700 hover:bg-blue-50 shadow-lg px-8 text-base font-semibold"
                >
                  前往正式版註冊
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </a>
              <a href={getProductionUrl('/pricing')} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10 px-8 text-base"
                >
                  查看方案與定價
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* ── 頁腳 ── */}
        <footer className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} 選情管理系統 — 展示模式</p>
            <p className="text-xs">示範資料會在重新整理頁面後重置</p>
          </div>
        </footer>
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

// Loading fallback component
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
