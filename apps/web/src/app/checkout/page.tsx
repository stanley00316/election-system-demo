'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Building2, Store, Loader2, Shield, Check } from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { subscriptionsApi, paymentsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type PaymentProvider = 'ECPAY' | 'NEWEBPAY' | 'STRIPE';

interface Plan {
  id: string;
  name: string;
  code: string;
  price: number;
  interval: string;
  voterLimit: number | null;
  teamLimit: number | null;
  features: string[];
  city?: string | null;
  category?: string | null;
  regionLevel?: number | null;
  description?: string | null;
}

const categoryLabels: Record<string, string> = {
  VILLAGE_CHIEF: '里長',
  REPRESENTATIVE: '民代',
  COUNCILOR: '議員',
  MAYOR: '市長',
  LEGISLATOR: '立委',
};

const electionTypeLabels: Record<string, string> = {
  VILLAGE_CHIEF: '里長',
  TOWNSHIP_REP: '民代',
  CITY_COUNCILOR: '議員',
  MAYOR: '市長',
  LEGISLATOR: '立委',
};

const regionLevelLabels: Record<number, string> = {
  1: '一級戰區',
  2: '二級戰區',
  3: '三級戰區',
  4: '四級戰區',
  5: '五級戰區',
};

const paymentProviders = [
  {
    id: 'ECPAY' as PaymentProvider,
    name: '綠界 ECPay',
    description: '信用卡、ATM 轉帳、超商付款',
    icon: Store,
    methods: ['信用卡', 'ATM', '超商'],
  },
  {
    id: 'NEWEBPAY' as PaymentProvider,
    name: '藍新金流',
    description: '信用卡線上刷卡',
    icon: CreditCard,
    methods: ['信用卡'],
  },
  {
    id: 'STRIPE' as PaymentProvider,
    name: 'Stripe',
    description: '國際信用卡（Visa, Mastercard）',
    icon: Building2,
    methods: ['Visa', 'Mastercard', 'JCB'],
  },
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const planId = searchParams.get('planId');
  const sessionId = searchParams.get('session_id');
  const paymentId = searchParams.get('payment_id');
  const cityParam = searchParams.get('city');
  const electionTypeParam = searchParams.get('electionType');

  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('ECPAY');
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    // 處理 Stripe 回調
    if (sessionId && paymentId) {
      verifyStripePayment();
    } else if (planId) {
      loadPlan();
    } else {
      router.push('/pricing');
    }
  }, [planId, sessionId, paymentId]);

  const verifyStripePayment = async () => {
    try {
      const result = await paymentsApi.verifyStripe(sessionId!, paymentId!);
      if (result.success) {
        toast({
          title: '付款成功！',
          description: '您的訂閱已啟用',
        });
        router.push('/dashboard/settings/billing');
      } else {
        toast({
          title: '付款驗證失敗',
          description: '請聯繫客服協助',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '付款驗證失敗',
        description: '請聯繫客服協助',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  const loadPlan = async () => {
    try {
      const plans = await subscriptionsApi.getPlans();
      const selectedPlan = plans.find((p: Plan) => p.id === planId);
      
      if (!selectedPlan || selectedPlan.code === 'FREE_TRIAL') {
        router.push('/pricing');
        return;
      }

      setPlan(selectedPlan);

      // 檢查是否已有訂閱，如果沒有先建立試用訂閱
      const subStatus = await subscriptionsApi.checkSubscription();
      if (!subStatus.hasSubscription) {
        // 先建立訂閱（試用或直接訂閱）
        const newSub = await subscriptionsApi.startTrial().catch(() => null);
        setSubscription(newSub);
      } else {
        const currentSub = await subscriptionsApi.getCurrentSubscription();
        setSubscription(currentSub.subscription);
      }
    } catch (error) {
      console.error('載入方案失敗:', error);
      toast({
        title: '載入失敗',
        description: '無法載入方案資訊',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!subscription) {
      toast({
        title: '訂閱資訊錯誤',
        description: '請重新整理頁面',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await paymentsApi.createPayment({
        subscriptionId: subscription.id,
        provider: selectedProvider,
        returnUrl: `${window.location.origin}/checkout`,
        clientBackUrl: `${window.location.origin}/pricing`,
      });

      if (selectedProvider === 'STRIPE' && result.paymentUrl) {
        // Stripe 直接跳轉
        window.location.href = result.paymentUrl;
      } else if (result.formData && result.apiUrl) {
        // ECPay/NewebPay 需要表單提交
        submitPaymentForm(result.apiUrl, result.formData);
      } else {
        throw new Error('無法取得付款資訊');
      }
    } catch (error: any) {
      toast({
        title: '付款建立失敗',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const submitPaymentForm = (apiUrl: string, formData: Record<string, string>) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = apiUrl;

    Object.entries(formData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {sessionId ? '驗證付款中...' : '載入中...'}
          </p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 返回按鈕 */}
        <BackButton href="/pricing" label="返回方案選擇" className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 訂單摘要 */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card>
              <CardHeader>
                <CardTitle>訂單摘要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">方案</span>
                  <span className="font-medium">{plan.name}</span>
                </div>
                {(plan.city || cityParam) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">選區</span>
                    <span className="font-medium">{plan.city || cityParam}</span>
                  </div>
                )}
                {(plan.category || electionTypeParam) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">選舉類型</span>
                    <span className="font-medium">
                      {plan.category 
                        ? categoryLabels[plan.category] || plan.category
                        : electionTypeParam 
                          ? electionTypeLabels[electionTypeParam] || electionTypeParam
                          : ''
                      }
                    </span>
                  </div>
                )}
                {plan.regionLevel && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">戰區</span>
                    <span className="font-medium text-primary">
                      {regionLevelLabels[plan.regionLevel] || `${plan.regionLevel}級`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">計費週期</span>
                  <span className="font-medium">
                    {plan.interval === 'YEAR' ? '年繳' : '月繳'}
                  </span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-semibold">
                  <span>總計</span>
                  <span className="text-primary">
                    NT$ {plan.price.toLocaleString()}
                  </span>
                </div>

                {/* 功能列表 */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-3">包含功能：</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500" />
                      {plan.voterLimit ? `${plan.voterLimit} 位選民` : '無限選民'}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500" />
                      {plan.teamLimit ? `${plan.teamLimit} 位團隊成員` : '無限團隊成員'}
                    </li>
                    {(plan.features as string[]).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 付款方式 */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Card>
              <CardHeader>
                <CardTitle>選擇付款方式</CardTitle>
                <CardDescription>
                  選擇您偏好的付款方式完成訂閱
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedProvider}
                  onValueChange={(value) => setSelectedProvider(value as PaymentProvider)}
                  className="space-y-4"
                >
                  {paymentProviders.map((provider) => (
                    <div key={provider.id}>
                      <Label
                        htmlFor={provider.id}
                        className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedProvider === provider.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-border/80'
                        }`}
                      >
                        <RadioGroupItem value={provider.id} id={provider.id} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <provider.icon className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{provider.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {provider.description}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {provider.methods.map((method) => (
                              <span
                                key={method}
                                className="text-xs px-2 py-1 bg-muted rounded"
                              >
                                {method}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* 安全提示 */}
                <div className="flex items-center gap-2 mt-6 p-4 bg-muted/50 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-muted-foreground">
                    所有交易均採用 SSL 加密傳輸，確保您的付款資訊安全
                  </p>
                </div>

                {/* 付款按鈕 */}
                <Button
                  className="w-full mt-6"
                  size="lg"
                  onClick={handlePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      處理中...
                    </>
                  ) : (
                    `付款 NT$ ${plan.price.toLocaleString()}`
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  點擊付款即表示您同意我們的服務條款與隱私政策
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
