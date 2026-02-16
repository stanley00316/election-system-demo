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

// 完整定價表（與 pricing 頁面同步）
const FALLBACK_PRICING: Record<string, { regionLevel: number; prices: Record<string, number> }> = {
  '新北市': { regionLevel: 1, prices: { VILLAGE_CHIEF: 231200, REPRESENTATIVE: 257100, COUNCILOR: 343600, MAYOR: 1451000, LEGISLATOR: 1008000 } },
  '台北市': { regionLevel: 1, prices: { VILLAGE_CHIEF: 139100, REPRESENTATIVE: 154700, COUNCILOR: 206800, MAYOR: 873600, LEGISLATOR: 607000 } },
  '桃園市': { regionLevel: 1, prices: { VILLAGE_CHIEF: 134300, REPRESENTATIVE: 149400, COUNCILOR: 199600, MAYOR: 843200, LEGISLATOR: 585900 } },
  '台中市': { regionLevel: 1, prices: { VILLAGE_CHIEF: 163900, REPRESENTATIVE: 182300, COUNCILOR: 243600, MAYOR: 1029600, LEGISLATOR: 715000 } },
  '台南市': { regionLevel: 1, prices: { VILLAGE_CHIEF: 106100, REPRESENTATIVE: 118100, COUNCILOR: 157600, MAYOR: 665700, LEGISLATOR: 462500 } },
  '高雄市': { regionLevel: 1, prices: { VILLAGE_CHIEF: 155700, REPRESENTATIVE: 173200, COUNCILOR: 231200, MAYOR: 976500, LEGISLATOR: 678900 } },
  '彰化縣': { regionLevel: 2, prices: { VILLAGE_CHIEF: 69100, REPRESENTATIVE: 76800, COUNCILOR: 102800, MAYOR: 434000, LEGISLATOR: 301500 } },
  '屏東縣': { regionLevel: 2, prices: { VILLAGE_CHIEF: 44600, REPRESENTATIVE: 49600, COUNCILOR: 66400, MAYOR: 280400, LEGISLATOR: 195000 } },
  '新竹縣': { regionLevel: 2, prices: { VILLAGE_CHIEF: 34100, REPRESENTATIVE: 38000, COUNCILOR: 50800, MAYOR: 214500, LEGISLATOR: 149200 } },
  '新竹市': { regionLevel: 2, prices: { VILLAGE_CHIEF: 26000, REPRESENTATIVE: 29000, COUNCILOR: 38700, MAYOR: 163400, LEGISLATOR: 113700 } },
  '南投縣': { regionLevel: 3, prices: { VILLAGE_CHIEF: 26800, REPRESENTATIVE: 29800, COUNCILOR: 39800, MAYOR: 168000, LEGISLATOR: 116800 } },
  '苗栗縣': { regionLevel: 3, prices: { VILLAGE_CHIEF: 30300, REPRESENTATIVE: 33700, COUNCILOR: 45000, MAYOR: 190000, LEGISLATOR: 132000 } },
  '雲林縣': { regionLevel: 3, prices: { VILLAGE_CHIEF: 37200, REPRESENTATIVE: 41400, COUNCILOR: 55300, MAYOR: 233500, LEGISLATOR: 162300 } },
  '宜蘭縣': { regionLevel: 3, prices: { VILLAGE_CHIEF: 25700, REPRESENTATIVE: 28600, COUNCILOR: 38200, MAYOR: 161200, LEGISLATOR: 112000 } },
  '嘉義縣': { regionLevel: 4, prices: { VILLAGE_CHIEF: 27000, REPRESENTATIVE: 30000, COUNCILOR: 40200, MAYOR: 169700, LEGISLATOR: 118000 } },
  '基隆市': { regionLevel: 4, prices: { VILLAGE_CHIEF: 20500, REPRESENTATIVE: 22800, COUNCILOR: 30600, MAYOR: 129200, LEGISLATOR: 89800 } },
  '花蓮縣': { regionLevel: 4, prices: { VILLAGE_CHIEF: 17800, REPRESENTATIVE: 19800, COUNCILOR: 26600, MAYOR: 112300, LEGISLATOR: 78100 } },
  '嘉義市': { regionLevel: 4, prices: { VILLAGE_CHIEF: 14900, REPRESENTATIVE: 16600, COUNCILOR: 22200, MAYOR: 93700, LEGISLATOR: 65200 } },
  '台東縣': { regionLevel: 4, prices: { VILLAGE_CHIEF: 11900, REPRESENTATIVE: 13200, COUNCILOR: 17700, MAYOR: 74700, LEGISLATOR: 51900 } },
  '金門縣': { regionLevel: 5, prices: { VILLAGE_CHIEF: 8000, REPRESENTATIVE: 8900, COUNCILOR: 11900, MAYOR: 50200, LEGISLATOR: 34900 } },
  '澎湖縣': { regionLevel: 5, prices: { VILLAGE_CHIEF: 6100, REPRESENTATIVE: 6800, COUNCILOR: 9100, MAYOR: 38400, LEGISLATOR: 26700 } },
  '連江縣': { regionLevel: 5, prices: { VILLAGE_CHIEF: 800, REPRESENTATIVE: 900, COUNCILOR: 1200, MAYOR: 5100, LEGISLATOR: 3500 } },
};

const ELECTION_CODE_TO_CATEGORY: Record<string, string> = {
  VILLAGE_CHIEF: 'VILLAGE_CHIEF',
  TOWNSHIP_REP: 'REPRESENTATIVE',
  CITY_COUNCILOR: 'COUNCILOR',
  MAYOR: 'MAYOR',
  LEGISLATOR: 'LEGISLATOR',
};

const REGION_LEVEL_LABELS: Record<number, string> = {
  1: '一級戰區', 2: '二級戰區', 3: '三級戰區', 4: '四級戰區', 5: '五級戰區',
};

function buildFallbackPlan(city: string, electionType: string): Plan | null {
  const cityData = FALLBACK_PRICING[city];
  if (!cityData) return null;
  const category = ELECTION_CODE_TO_CATEGORY[electionType];
  if (!category) return null;
  const price = cityData.prices[category];
  if (price === undefined) return null;
  const label = electionTypeLabels[electionType] || categoryLabels[category] || electionType;
  return {
    id: `fallback-${city}-${category}`,
    name: `${city}${label}方案`,
    code: `${city}_${category}_YEARLY`,
    price,
    interval: 'YEAR',
    voterLimit: null,
    teamLimit: 10,
    features: [`${REGION_LEVEL_LABELS[cityData.regionLevel]}定價`, '無限選民數量', '10 位團隊成員', '完整選情分析', '行程管理功能', '資料匯出功能'],
    city,
    category,
    regionLevel: cityData.regionLevel,
    description: `${city}${label}選舉專用方案，${REGION_LEVEL_LABELS[cityData.regionLevel]}定價`,
  };
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
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/34827fd4-7bb3-440a-b507-2d31c4b34e1e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'checkout/page.tsx:loadPlan',message:'loadPlan called',data:{planId,cityParam,electionTypeParam,isFallback:planId?.startsWith('fallback-')},timestamp:Date.now(),hypothesisId:'H1,H2'})}).catch(()=>{});
    // #endregion

    // fallback plan ID 來自 pricing 頁面的靜態資料，直接本地建構
    if (planId?.startsWith('fallback-') && cityParam && electionTypeParam) {
      const fallback = buildFallbackPlan(cityParam, electionTypeParam);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/34827fd4-7bb3-440a-b507-2d31c4b34e1e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'checkout/page.tsx:loadPlan',message:'using fallback plan',data:{city:cityParam,electionType:electionTypeParam,planFound:!!fallback,price:fallback?.price},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      if (fallback) {
        setPlan(fallback);
        // fallback 模式下嘗試取得訂閱狀態，失敗也不影響顯示
        try {
          const subStatus = await subscriptionsApi.checkSubscription();
          if (subStatus.hasSubscription) {
            const currentSub = await subscriptionsApi.getCurrentSubscription();
            setSubscription(currentSub.subscription);
          }
        } catch {
          // API 不可用時忽略
        }
        setIsLoading(false);
        return;
      }
    }

    try {
      const plans = await subscriptionsApi.getPlans();
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/34827fd4-7bb3-440a-b507-2d31c4b34e1e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'checkout/page.tsx:loadPlan',message:'getPlans succeeded',data:{planCount:plans?.length,planIds:plans?.slice(0,3).map((p:any)=>p.id)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      const selectedPlan = plans.find((p: Plan) => p.id === planId);
      
      if (!selectedPlan || selectedPlan.code === 'FREE_TRIAL') {
        // 找不到方案但有 city/electionType，嘗試 fallback
        if (cityParam && electionTypeParam) {
          const fallback = buildFallbackPlan(cityParam, electionTypeParam);
          if (fallback) {
            setPlan(fallback);
            setIsLoading(false);
            return;
          }
        }
        router.push('/pricing');
        return;
      }

      setPlan(selectedPlan);

      const subStatus = await subscriptionsApi.checkSubscription();
      if (!subStatus.hasSubscription) {
        const newSub = await subscriptionsApi.startTrial().catch(() => null);
        setSubscription(newSub);
      } else {
        const currentSub = await subscriptionsApi.getCurrentSubscription();
        setSubscription(currentSub.subscription);
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/34827fd4-7bb3-440a-b507-2d31c4b34e1e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'checkout/page.tsx:loadPlan',message:'loadPlan FAILED, trying fallback',data:{errorMsg:error?.message,cityParam,electionTypeParam},timestamp:Date.now(),hypothesisId:'H1,H2,H3'})}).catch(()=>{});
      // #endregion
      // API 失敗時嘗試用 URL 參數建構 fallback
      if (cityParam && electionTypeParam) {
        const fallback = buildFallbackPlan(cityParam, electionTypeParam);
        if (fallback) {
          setPlan(fallback);
          setIsLoading(false);
          return;
        }
      }
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
                  <span className="text-muted-foreground">計費方式</span>
                  <span className="font-medium">一次性年繳</span>
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
