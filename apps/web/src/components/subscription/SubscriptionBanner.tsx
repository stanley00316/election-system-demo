'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Clock, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subscriptionsApi } from '@/lib/api';

interface SubscriptionStatus {
  hasSubscription: boolean;
  status: string | null;
  plan: any | null;
  expiresAt: string | null;
  isTrialing: boolean;
  trialEndsAt: string | null;
}

export function SubscriptionBanner() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const status = await subscriptionsApi.checkSubscription();
      setSubscription(status);
    } catch (error) {
      // 未登入或其他錯誤，不顯示 banner
      console.error('無法載入訂閱狀態:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  // 不顯示的條件
  if (isLoading || isDismissed || !subscription) {
    return null;
  }

  // 沒有訂閱 - 顯示開始試用提示
  if (!subscription.hasSubscription) {
    return (
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5" />
            <span className="font-medium">
              開始 14 天免費試用，體驗完整功能！
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/pricing')}
            >
              立即開始
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 試用中
  if (subscription.isTrialing && subscription.trialEndsAt) {
    const daysRemaining = getDaysRemaining(subscription.trialEndsAt);
    
    // 剩餘超過 7 天不顯示
    if (daysRemaining > 7) {
      return null;
    }

    const isUrgent = daysRemaining <= 3;
    const bgColor = isUrgent
      ? 'bg-gradient-to-r from-red-500 to-orange-500'
      : 'bg-gradient-to-r from-yellow-500 to-orange-400';

    return (
      <div className={`${bgColor} text-white px-4 py-3`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isUrgent ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Clock className="h-5 w-5" />
            )}
            <span className="font-medium">
              {isUrgent ? (
                <>試用期僅剩 {daysRemaining} 天！立即升級以繼續使用</>
              ) : (
                <>試用期剩餘 {daysRemaining} 天</>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/pricing')}
            >
              升級方案
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 逾期未付款
  if (subscription.status === 'PAST_DUE') {
    return (
      <div className="bg-red-500 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">
              您的訂閱已逾期，請儘快更新付款方式以避免服務中斷
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/dashboard/settings/billing')}
          >
            更新付款
          </Button>
        </div>
      </div>
    );
  }

  // 已取消但尚未到期
  if (subscription.status === 'CANCELLED' && subscription.expiresAt) {
    const daysRemaining = getDaysRemaining(subscription.expiresAt);
    if (daysRemaining > 0) {
      return (
        <div className="bg-gray-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5" />
              <span className="font-medium">
                您的訂閱已取消，服務將於 {daysRemaining} 天後到期
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/pricing')}
            >
              重新訂閱
            </Button>
          </div>
        </div>
      );
    }
  }

  return null;
}
