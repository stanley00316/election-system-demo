'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Shield,
  Megaphone,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  LogIn,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth';
import { roleInvitesApi, isDemoMode } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Demo mode 相關資料
const demoUser = {
  id: 'demo-user-id',
  lineUserId: 'demo-line-user-id',
  name: '示範使用者',
  email: 'demo@example.com',
  avatarUrl: null,
  isAdmin: true,
  isSuperAdmin: true,
  isActive: true,
  isSuspended: false,
  promoter: {
    id: 'demo-promoter-id',
    status: 'APPROVED',
    isActive: true,
    referralCode: 'DEMO2024',
  },
};

interface TokenPayload {
  type: string;
  role: 'ADMIN' | 'PROMOTER';
  createdBy: string;
  notes?: string;
  exp: number;
  iat: number;
}

function decodeTokenPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

const roleConfig = {
  ADMIN: {
    label: '管理員',
    description: '您將獲得管理後台的存取權限，可以管理使用者、訂閱、付款等系統功能。',
    icon: Shield,
    bgClass: 'from-blue-600 to-blue-800',
    badgeClass: 'bg-blue-600',
    iconBg: 'bg-blue-100 text-blue-700',
  },
  PROMOTER: {
    label: '推廣者',
    description: '您將成為系統推廣者，可以使用推廣連結、管理試用邀請、查看推薦成效。',
    icon: Megaphone,
    bgClass: 'from-orange-500 to-orange-700',
    badgeClass: 'bg-orange-500',
    iconBg: 'bg-orange-100 text-orange-700',
  },
};

export default function JoinRolePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, setAuth } = useAuthStore();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'valid' | 'expired' | 'invalid' | 'claiming' | 'claimed'>('loading');
  const [claimResult, setClaimResult] = useState<{ message: string; role: string } | null>(null);

  // 解析 token payload（前端只讀，不驗簽）
  const payload = useMemo(() => decodeTokenPayload(token), [token]);

  useEffect(() => {
    if (!payload) {
      setStatus('invalid');
      return;
    }
    if (payload.type !== 'role-invite') {
      setStatus('invalid');
      return;
    }
    // 檢查是否過期
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      setStatus('expired');
      return;
    }
    setStatus('valid');
  }, [payload]);

  // 若已登入，直接嘗試 claim
  useEffect(() => {
    if (isAuthenticated && status === 'valid') {
      handleClaim();
    }
  }, [isAuthenticated, status]);

  const handleClaim = async () => {
    setStatus('claiming');
    try {
      const result = await roleInvitesApi.claimInvite(token);
      setClaimResult(result);
      setStatus('claimed');
      toast({ title: result.message });
    } catch (error: any) {
      toast({
        title: '領取失敗',
        description: error?.message || '邀請碼無效或已過期',
        variant: 'destructive',
      });
      setStatus('expired');
    }
  };

  const handleLineLogin = () => {
    // 將 token 存入 sessionStorage，登入後自動 claim
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingRoleInvite', token);
    }

    const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    const callbackUrl = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL ||
      `${typeof window !== 'undefined' ? window.location.origin : ''}/login`;

    const isLineConfigured = channelId &&
      channelId !== 'your-line-channel-id' &&
      channelId.length > 5;

    if (!isLineConfigured) {
      toast({
        title: 'LINE 登入尚未設定',
        description: '請聯絡系統管理員',
        variant: 'destructive',
      });
      return;
    }

    const state = Math.random().toString(36).substring(7);
    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}&scope=profile%20openid`;
    window.location.href = lineAuthUrl;
  };

  const handleDemoLogin = async () => {
    // Demo 模式：模擬登入後直接 claim
    const demoToken = 'demo-token-' + Date.now();
    setAuth(demoUser, demoToken);
    // claim 會由上方的 useEffect 自動觸發
  };

  const handleGoToDashboard = () => {
    if (!claimResult) return;
    if (claimResult.role === 'ADMIN') {
      router.push('/admin');
    } else {
      router.push('/promoter/dashboard');
    }
  };

  const config = payload?.role ? roleConfig[payload.role] : null;

  // 載入中
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 無效 token
  if (status === 'invalid' || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-red-100">
                <AlertTriangle className="h-12 w-12 text-red-600" />
              </div>
              <h1 className="text-xl font-bold">無效的邀請連結</h1>
              <p className="text-muted-foreground">
                此邀請連結無效或格式不正確，請確認連結是否完整。
              </p>
              <Button variant="outline" onClick={() => router.push('/login')}>
                前往登入頁面
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 已過期
  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-yellow-100">
                <Clock className="h-12 w-12 text-yellow-600" />
              </div>
              <h1 className="text-xl font-bold">邀請已過期</h1>
              <p className="text-muted-foreground">
                此邀請連結已過期或無法使用，請聯絡管理員重新產生。
              </p>
              <Button variant="outline" onClick={() => router.push('/login')}>
                前往登入頁面
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 領取中
  if (status === 'claiming') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h1 className="text-xl font-bold">正在設定您的角色...</h1>
              <p className="text-muted-foreground">請稍候</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 已領取成功
  if (status === 'claimed' && claimResult) {
    const Icon = config.icon;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="p-4 rounded-full bg-green-100">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{claimResult.message}</h1>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Badge className={`${config.badgeClass} text-white`}>
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">
                您現在可以使用{config.label}功能了
              </p>
              <Button className="w-full" onClick={handleGoToDashboard}>
                前往{config.label}介面
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 有效邀請 - 顯示登入按鈕
  const Icon = config.icon;
  const expiresAt = payload?.exp
    ? new Date(payload.exp * 1000).toLocaleString('zh-TW', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${config.bgClass} p-4`}>
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* 角色圖示 */}
            <div className={`p-5 rounded-2xl ${config.iconBg}`}>
              <Icon className="h-12 w-12" />
            </div>

            {/* 標題 */}
            <div>
              <Badge className={`${config.badgeClass} text-white mb-3`}>
                {config.label}邀請
              </Badge>
              <h1 className="text-2xl font-bold">
                您被邀請成為{config.label}
              </h1>
            </div>

            {/* 說明 */}
            <p className="text-muted-foreground leading-relaxed">
              {config.description}
            </p>

            {/* 到期時間 */}
            {expiresAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>邀請有效至 {expiresAt}</span>
              </div>
            )}

            {/* 登入按鈕 */}
            <div className="w-full space-y-3">
              <Button
                className="w-full h-12 text-base bg-[#06C755] hover:bg-[#05b04c]"
                onClick={handleLineLogin}
              >
                <LogIn className="h-5 w-5 mr-2" />
                使用 LINE 登入並加入
              </Button>

              {isDemoMode && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDemoLogin}
                >
                  示範模式快速體驗
                </Button>
              )}
            </div>

            {/* 備註 */}
            {payload?.notes && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-2 w-full">
                備註：{payload.notes}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
