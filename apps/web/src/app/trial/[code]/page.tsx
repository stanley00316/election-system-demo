'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { promotersPublicApi, isDemoMode } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Gift,
  ArrowRight,
} from 'lucide-react';

export default function TrialActivationPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { isAuthenticated, user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [trialInfo, setTrialInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (code) {
      loadTrialInfo();
    }
  }, [code]);

  const loadTrialInfo = async () => {
    try {
      const data = await promotersPublicApi.getTrialInfo(code);
      setTrialInfo(data);
    } catch (err: any) {
      setError('此試用邀請碼不存在或已失效');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimTrial = async () => {
    if (!isAuthenticated) {
      // 儲存試用碼到 sessionStorage，登入後回來
      sessionStorage.setItem('pendingTrialCode', code);
      router.push('/login');
      return;
    }

    setIsClaiming(true);
    setError(null);
    try {
      await promotersPublicApi.claimTrial(code);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || '啟用試用失敗，請稍後再試');
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">試用已啟用！</h2>
            <p className="text-muted-foreground mb-2">
              您已獲得 {trialInfo?.trialDays} 天的免費試用。
            </p>
            <p className="text-sm text-muted-foreground/70 mb-6">
              所有功能已開放，請盡情體驗選情系統的完整功能。
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard">
                開始使用 <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !trialInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">邀請碼無效</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button asChild>
              <Link href="/">返回首頁</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background dark:from-green-950/20 dark:to-background flex items-center justify-center px-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 pb-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Gift className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              免費試用邀請
            </h1>
            <p className="text-muted-foreground">
              來自 <span className="font-medium">{trialInfo?.promoterName}</span> 的邀請
            </p>
          </div>

          {/* Trial Info */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>試用天數</span>
              </div>
              <span className="font-bold text-lg">{trialInfo?.trialDays} 天</span>
            </div>
            {trialInfo?.plan && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">方案</span>
                <Badge variant="secondary">{trialInfo.plan.name}</Badge>
              </div>
            )}
            <div className="flex items-center justify-between">
                <span className="text-muted-foreground">狀態</span>
              <Badge variant={trialInfo?.isAvailable ? 'default' : 'destructive'}>
                {trialInfo?.isAvailable ? '可使用' : '已失效'}
              </Badge>
            </div>
          </div>

          {/* Features List */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">試用包含</h3>
            <ul className="space-y-2">
              {['全功能開放使用', '選民資料管理', '數據分析報表', '團隊協作功能', '行事曆與行程管理'].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          {/* Action */}
          {trialInfo?.isAvailable ? (
            <Button
              className="w-full"
              size="lg"
              onClick={handleClaimTrial}
              disabled={isClaiming}
            >
              {isClaiming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  啟用中...
                </>
              ) : isAuthenticated ? (
                <>
                  立即啟用試用 <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  登入後啟用試用 <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button className="w-full" size="lg" disabled>
              此邀請碼已失效
            </Button>
          )}

          <p className="text-xs text-muted-foreground/70 text-center mt-4">
            無需信用卡，試用期結束後可選擇訂閱。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
