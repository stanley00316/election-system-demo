'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth';
import { useCampaignStore } from '@/stores/campaign';
import { campaignsApi, authApi } from '@/lib/api';
import { Loader2, AlertCircle, Users, Calendar, MapPin, Shield, Edit2, Eye, CheckCircle } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '管理員',
  EDITOR: '編輯者',
  VIEWER: '檢視者',
};

const ROLE_ICONS: Record<string, any> = {
  ADMIN: Shield,
  EDITOR: Edit2,
  VIEWER: Eye,
};

const ELECTION_TYPE_LABELS: Record<string, string> = {
  VILLAGE_CHIEF: '村里長',
  TOWNSHIP_REP: '鄉鎮市民代表',
  CITY_COUNCILOR: '縣市議員',
  LEGISLATOR: '立法委員',
  MAYOR: '縣市長',
  PRESIDENT: '總統',
};

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  
  const { isAuthenticated, user, setAuth } = useAuthStore();
  const { setCampaigns, setCurrentCampaign } = useCampaignStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [joined, setJoined] = useState(false);

  // LINE 登入設定
  const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
  const isDevelopment = process.env.NODE_ENV === 'development';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isLineConfigured = channelId && channelId !== 'your-line-channel-id' && channelId.length > 5;

  // 載入邀請資訊
  useEffect(() => {
    const loadInviteInfo = async () => {
      try {
        const info = await campaignsApi.getInviteInfo(code);
        setInviteInfo(info);
      } catch (err: any) {
        setError(err.message || '無法載入邀請資訊');
      } finally {
        setIsLoading(false);
      }
    };

    if (code) {
      loadInviteInfo();
    }
  }, [code]);

  // 加入團隊
  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);
    try {
      const result = await campaignsApi.joinByInviteCode(code);
      setJoined(true);
      
      // 更新使用者資料，獲取最新的 campaigns
      const userData = await authApi.getMe();
      if (userData.campaigns) {
        setCampaigns(userData.campaigns);
        // 自動切換到剛加入的 campaign
        const joinedCampaign = userData.campaigns.find(
          (c: any) => c.id === result.member.campaign.id
        );
        if (joinedCampaign) {
          setCurrentCampaign(joinedCampaign);
        }
      }
      
      // 2 秒後導向 dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || '加入失敗');
    } finally {
      setIsJoining(false);
    }
  };

  // LINE 登入
  const handleLineLogin = () => {
    if (!isLineConfigured) {
      setError('LINE 登入尚未設定');
      return;
    }
    // 保存邀請碼到 sessionStorage，登入後可以繼續加入
    sessionStorage.setItem('pendingInviteCode', code);
    
    const state = Math.random().toString(36).substring(7);
    const callbackUrl = `${window.location.origin}/login`;
    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}&scope=profile%20openid`;
    window.location.href = lineAuthUrl;
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
      // 登入後自動加入
      setTimeout(() => handleJoin(), 500);
    } catch (err: any) {
      setError(err?.message || '開發登入失敗');
      setIsLoading(false);
    }
  };

  // 已登入且有待處理的邀請碼
  useEffect(() => {
    if (isAuthenticated) {
      const pendingCode = sessionStorage.getItem('pendingInviteCode');
      if (pendingCode === code) {
        sessionStorage.removeItem('pendingInviteCode');
        // 自動加入
        handleJoin();
      }
    }
  }, [isAuthenticated, code]);

  // Loading 狀態
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>載入中...</span>
        </div>
      </div>
    );
  }

  // 錯誤狀態（邀請無效）
  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">邀請連結無效</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button onClick={() => router.push('/login')}>
                返回登入頁面
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 已成功加入
  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">成功加入團隊！</h2>
                <p className="text-muted-foreground">
                  您已加入「{inviteInfo?.campaign?.name}」，即將導向系統...
                </p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const RoleIcon = inviteInfo ? ROLE_ICONS[inviteInfo.role] : Eye;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
            <Users className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">您被邀請加入團隊</CardTitle>
          <CardDescription>
            {inviteInfo?.inviter?.name} 邀請您加入選舉活動團隊
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* 選舉活動資訊 */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <h3 className="font-semibold text-lg">{inviteInfo?.campaign?.name}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {ELECTION_TYPE_LABELS[inviteInfo?.campaign?.electionType] || inviteInfo?.campaign?.electionType}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {inviteInfo?.campaign?.city}
                {inviteInfo?.campaign?.district && ` ${inviteInfo.campaign.district}`}
              </Badge>
            </div>
          </div>

          {/* 邀請者資訊 */}
          <div className="flex items-center gap-3">
            {inviteInfo?.inviter?.avatarUrl ? (
              <img
                src={inviteInfo.inviter.avatarUrl}
                alt={inviteInfo.inviter.name}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <span className="font-medium">
                  {inviteInfo?.inviter?.name?.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium">{inviteInfo?.inviter?.name}</p>
              <p className="text-sm text-muted-foreground">邀請者</p>
            </div>
          </div>

          {/* 角色資訊 */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <RoleIcon className="h-5 w-5 text-primary" />
              <span>您將獲得的角色</span>
            </div>
            <Badge>{ROLE_LABELS[inviteInfo?.role] || inviteInfo?.role}</Badge>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="flex items-start gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 已登入：顯示加入按鈕 */}
          {isAuthenticated ? (
            <div className="space-y-3">
              <div className="text-center text-sm text-muted-foreground mb-2">
                以 <strong>{user?.name}</strong> 身份加入
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleJoin}
                disabled={isJoining}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    加入中...
                  </>
                ) : (
                  '加入團隊'
                )}
              </Button>
            </div>
          ) : (
            /* 未登入：顯示登入按鈕 */
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                請先登入以加入團隊
              </p>
              
              <Button
                className="w-full bg-[#06C755] hover:bg-[#05b04c] text-white"
                size="lg"
                onClick={handleLineLogin}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.12 3.42 7.58 8.07 8.35.31.07.74.21.85.48.1.24.06.62.03.87l-.14.82c-.04.24-.19.95.83.52s5.52-3.26 7.53-5.58C21.16 13.48 22 11.99 22 10.5 22 5.82 17.52 2 12 2z"/>
                </svg>
                使用 LINE 登入並加入
              </Button>

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
                  >
                    開發環境快速登入並加入
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
