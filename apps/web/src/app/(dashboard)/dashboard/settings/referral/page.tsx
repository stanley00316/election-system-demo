'use client';

import { useState, useEffect } from 'react';
import {
  Gift,
  Copy,
  Share2,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Award,
  ArrowLeft,
} from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { referralsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalRewardMonths: number;
}

interface Referral {
  id: string;
  referredUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
    joinedAt: string;
  };
  status: string;
  rewardMonths: number;
  rewardGrantedAt: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: '等待付款', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  EXPIRED: { label: '已過期', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

export default function ReferralPage() {
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [codeResult, statsResult, referralsResult] = await Promise.all([
        referralsApi.getMyCode(),
        referralsApi.getStats(),
        referralsApi.getMyReferrals(),
      ]);
      setReferralCode(codeResult.code);
      setShareUrl(codeResult.shareUrl);
      setStats(statsResult);
      setReferrals(referralsResult);
    } catch (error) {
      console.error('載入推薦資料失敗:', error);
      toast({
        title: '載入失敗',
        description: '無法載入推薦資料，請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'code' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: '已複製',
        description: type === 'code' ? '推薦碼已複製到剪貼簿' : '分享連結已複製到剪貼簿',
      });
    } catch (error) {
      toast({
        title: '複製失敗',
        description: '請手動複製推薦碼',
        variant: 'destructive',
      });
    }
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '選情系統推薦',
          text: `使用我的推薦碼 ${referralCode} 註冊選情系統，我們都能獲得一個月免費使用！`,
          url: shareUrl,
        });
      } catch (error) {
        // 使用者取消分享，不需要顯示錯誤
      }
    } else {
      copyToClipboard(shareUrl, 'url');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/dashboard/settings" />
        <div>
          <h1 className="text-2xl font-bold">推薦好友</h1>
          <p className="text-gray-500">分享推薦碼給好友，每成功推薦一人，您可獲得一個月免費使用</p>
        </div>
      </div>

      {/* 推薦碼區塊 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            我的推薦碼
          </CardTitle>
          <CardDescription>
            分享此推薦碼給朋友，當他們完成首次付款時，您將獲得一個月免費訂閱
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 推薦碼顯示 */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                value={referralCode}
                readOnly
                className="text-center text-2xl font-mono font-bold tracking-wider bg-gray-50"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(referralCode, 'code')}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* 分享連結 */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                value={shareUrl}
                readOnly
                className="text-sm bg-gray-50"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(shareUrl, 'url')}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={shareReferral}>
              <Share2 className="h-4 w-4 mr-2" />
              分享
            </Button>
          </div>

          {/* 推薦獎勵說明 */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="font-medium text-primary mb-2">推薦獎勵規則</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 每成功推薦一位好友，您將獲得 1 個月免費訂閱</li>
              <li>• 好友需使用您的推薦碼註冊並完成首次付款</li>
              <li>• 獎勵將自動加到您的訂閱期限中</li>
              <li>• 推薦無上限，推薦越多，獲得越多</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 統計數據 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">總推薦人數</p>
                  <p className="text-2xl font-bold">{stats.totalReferrals}</p>
                </div>
                <Users className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">已完成</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completedReferrals}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">等待中</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingReferrals}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">累計獎勵</p>
                  <p className="text-2xl font-bold text-primary">{stats.totalRewardMonths} 個月</p>
                </div>
                <Award className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 推薦名單 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            我推薦的人
          </CardTitle>
          <CardDescription>查看您推薦的好友及獎勵狀態</CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length > 0 ? (
            <div className="space-y-4">
              {referrals.map((referral) => {
                const StatusIcon = statusConfig[referral.status]?.icon || Clock;
                return (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={referral.referredUser.avatarUrl || undefined} />
                        <AvatarFallback>
                          {referral.referredUser.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{referral.referredUser.name}</p>
                        <p className="text-sm text-gray-500">
                          加入於 {formatDate(referral.referredUser.joinedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusConfig[referral.status]?.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[referral.status]?.label || referral.status}
                      </Badge>
                      {referral.status === 'COMPLETED' && (
                        <span className="text-sm text-green-600 font-medium">
                          +{referral.rewardMonths} 個月
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">尚未推薦任何人</h3>
              <p className="text-gray-500 mb-4">
                分享您的推薦碼給朋友，開始累積免費使用時間
              </p>
              <Button onClick={shareReferral}>
                <Share2 className="h-4 w-4 mr-2" />
                立即分享
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
