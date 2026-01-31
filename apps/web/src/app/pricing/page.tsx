'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Zap, Shield, Users, BarChart3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { subscriptionsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  id: string;
  name: string;
  code: string;
  price: number;
  interval: string;
  voterLimit: number | null;
  teamLimit: number | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

const featureIcons: Record<string, any> = {
  '全功能試用': Zap,
  '無限選民': Users,
  '優先客服': Shield,
  '資料匯出': BarChart3,
};

export default function PricingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansData, subscriptionData] = await Promise.all([
        subscriptionsApi.getPlans(),
        subscriptionsApi.checkSubscription().catch(() => null),
      ]);
      setPlans(plansData);
      setCurrentSubscription(subscriptionData);
    } catch (error) {
      console.error('載入方案失敗:', error);
      toast({
        title: '載入失敗',
        description: '無法載入訂閱方案，請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    try {
      await subscriptionsApi.startTrial();
      toast({
        title: '試用已開始！',
        description: '您的 14 天免費試用已啟動，享受完整功能吧！',
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: '無法開始試用',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handleSubscribe = (plan: Plan) => {
    if (plan.code === 'FREE_TRIAL') {
      handleStartTrial();
    } else {
      router.push(`/checkout?planId=${plan.id}`);
    }
  };

  const formatPrice = (price: number, interval: string) => {
    if (price === 0) return '免費';
    const formattedPrice = price.toLocaleString('zh-TW');
    const intervalText = interval === 'YEAR' ? '/年' : '/月';
    return `NT$ ${formattedPrice}${intervalText}`;
  };

  const getButtonText = (plan: Plan) => {
    if (currentSubscription?.hasSubscription) {
      if (currentSubscription.plan?.code === plan.code) {
        return '目前方案';
      }
      if (plan.code === 'FREE_TRIAL') {
        return '已使用過試用';
      }
      return '升級方案';
    }
    if (plan.code === 'FREE_TRIAL') {
      return '開始免費試用';
    }
    return '立即訂閱';
  };

  const isButtonDisabled = (plan: Plan) => {
    if (currentSubscription?.hasSubscription) {
      if (currentSubscription.plan?.code === plan.code) {
        return true;
      }
      if (plan.code === 'FREE_TRIAL') {
        return true;
      }
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 標題區 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            選擇適合您的方案
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            無論是小型選舉或大規模競選，我們都有合適的方案助您掌握選情
          </p>
        </div>

        {/* 方案卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const isPopular = plan.code === 'MONTHLY';
            const isCurrent = currentSubscription?.plan?.code === plan.code;

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  isPopular
                    ? 'border-primary shadow-lg scale-105 z-10'
                    : 'border-gray-200'
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white text-sm font-medium px-4 py-1 rounded-full">
                      最受歡迎
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-green-500 text-white text-sm font-medium px-4 py-1 rounded-full">
                      目前方案
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {plan.code === 'FREE_TRIAL' && '體驗完整功能'}
                    {plan.code === 'MONTHLY' && '適合中小型選舉'}
                    {plan.code === 'YEARLY' && '長期使用最划算'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice(plan.price, plan.interval).split('/')[0]}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-500">
                        /{plan.interval === 'YEAR' ? '年' : '月'}
                      </span>
                    )}
                    {plan.code === 'YEARLY' && (
                      <p className="text-sm text-green-600 mt-1">
                        相當於每月 NT$ {Math.round(plan.price / 12).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-gray-700">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>
                        {plan.voterLimit
                          ? `最多 ${plan.voterLimit.toLocaleString()} 位選民`
                          : '無限選民數量'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-gray-700">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>
                        {plan.teamLimit
                          ? `最多 ${plan.teamLimit} 位團隊成員`
                          : '無限團隊成員'}
                      </span>
                    </li>
                    {(plan.features as string[]).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-gray-700">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    size="lg"
                    disabled={isButtonDisabled(plan) || isStartingTrial}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {isStartingTrial && plan.code === 'FREE_TRIAL' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {getButtonText(plan)}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ 區塊 */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">常見問題</h2>
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">試用期結束後會自動扣款嗎？</h3>
              <p className="text-muted-foreground">
                不會。試用期結束後，您需要手動選擇付費方案才會開始計費。我們不會在未經您同意的情況下扣款。
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">可以隨時取消訂閱嗎？</h3>
              <p className="text-muted-foreground">
                是的，您可以隨時取消訂閱。取消後，您仍可使用服務直到目前計費週期結束。
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">支援哪些付款方式？</h3>
              <p className="text-muted-foreground">
                我們支援信用卡、ATM 轉帳、超商付款（透過綠界 ECPay）以及國際信用卡（透過 Stripe）。
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">可以開發票嗎？</h3>
              <p className="text-muted-foreground">
                可以。付款完成後，我們會自動開立電子發票並寄送至您的電子郵件信箱。
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            還有其他問題嗎？
          </p>
          <Button variant="link" className="text-primary">
            聯繫我們
          </Button>
        </div>
      </div>
    </div>
  );
}
