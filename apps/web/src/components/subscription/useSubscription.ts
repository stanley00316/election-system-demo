'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscriptionsApi } from '@/lib/api';

interface SubscriptionStatus {
  hasSubscription: boolean;
  status: string | null;
  plan: {
    id: string;
    name: string;
    code: string;
    price: number;
    interval: string;
    voterLimit: number | null;
    teamLimit: number | null;
    features: string[];
  } | null;
  expiresAt: string | null;
  isTrialing: boolean;
  trialEndsAt: string | null;
}

interface UseSubscriptionReturn {
  subscription: SubscriptionStatus | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  // 便利方法
  hasActiveSubscription: boolean;
  isTrialing: boolean;
  daysRemaining: number | null;
  canUseFeature: (feature: string) => boolean;
  checkVoterLimit: (currentCount: number) => { canAdd: boolean; limit: number | null };
  checkTeamLimit: (currentCount: number) => { canAdd: boolean; limit: number | null };
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscription = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await subscriptionsApi.checkSubscription();
      setSubscription(status);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('無法載入訂閱狀態'));
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // 計算剩餘天數
  const getDaysRemaining = (): number | null => {
    if (!subscription) return null;
    
    const endDate = subscription.isTrialing 
      ? subscription.trialEndsAt 
      : subscription.expiresAt;
    
    if (!endDate) return null;
    
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  // 檢查是否可使用特定功能
  const canUseFeature = (feature: string): boolean => {
    if (!subscription?.hasSubscription) return false;
    if (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') return false;
    
    // 試用和活躍訂閱都可使用所有功能
    if (subscription.status === 'TRIAL' || subscription.status === 'ACTIVE') {
      return true;
    }
    
    return false;
  };

  // 檢查選民數量限制
  const checkVoterLimit = (currentCount: number): { canAdd: boolean; limit: number | null } => {
    if (!subscription?.hasSubscription || !subscription.plan) {
      return { canAdd: false, limit: 0 };
    }
    
    const limit = subscription.plan.voterLimit;
    if (limit === null) {
      return { canAdd: true, limit: null };
    }
    
    return { canAdd: currentCount < limit, limit };
  };

  // 檢查團隊成員限制
  const checkTeamLimit = (currentCount: number): { canAdd: boolean; limit: number | null } => {
    if (!subscription?.hasSubscription || !subscription.plan) {
      return { canAdd: false, limit: 0 };
    }
    
    const limit = subscription.plan.teamLimit;
    if (limit === null) {
      return { canAdd: true, limit: null };
    }
    
    return { canAdd: currentCount < limit, limit };
  };

  return {
    subscription,
    isLoading,
    error,
    refetch: fetchSubscription,
    hasActiveSubscription: subscription?.hasSubscription ?? false,
    isTrialing: subscription?.isTrialing ?? false,
    daysRemaining: getDaysRemaining(),
    canUseFeature,
    checkVoterLimit,
    checkTeamLimit,
  };
}
