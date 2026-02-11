'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Receipt,
  ArrowLeft,
} from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { subscriptionsApi, paymentsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  plan: {
    id: string;
    name: string;
    code: string;
    price: number;
    interval: string;
    voterLimit: number | null;
    teamLimit: number | null;
  };
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paidAt: string | null;
  createdAt: string;
  subscription: {
    plan: {
      name: string;
    };
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  TRIAL: { label: '試用中', color: 'bg-blue-100 text-blue-800', icon: Clock },
  ACTIVE: { label: '訂閱中', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200', icon: CheckCircle },
  PAST_DUE: { label: '逾期未付', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200', icon: AlertTriangle },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: XCircle },
  EXPIRED: { label: '已過期', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', icon: XCircle },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待付款', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' },
  PROCESSING: { label: '處理中', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' },
  FAILED: { label: '失敗', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' },
  REFUNDED: { label: '已退款', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
};

export default function BillingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subResult, paymentHistory] = await Promise.all([
        subscriptionsApi.getCurrentSubscription(),
        paymentsApi.getHistory(),
      ]);
      setSubscription(subResult.subscription);
      setPayments(paymentHistory);
    } catch (error) {
      console.error('載入資料失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      await subscriptionsApi.cancelSubscription();
      toast({
        title: '訂閱已取消',
        description: '您仍可使用服務直到目前計費週期結束',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: '取消失敗',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <BackButton href="/dashboard/settings" />
          <div>
            <h1 className="text-2xl font-bold">帳單與訂閱</h1>
            <p className="text-muted-foreground">管理您的訂閱方案與付款記錄</p>
          </div>
        </div>
        <Button onClick={() => router.push('/pricing')}>
          變更方案
        </Button>
      </div>

      {/* 目前訂閱狀態 */}
      {subscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  目前方案：{subscription.plan.name}
                  <Badge className={statusConfig[subscription.status]?.color}>
                    {statusConfig[subscription.status]?.label || subscription.status}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  {subscription.plan.price > 0
                    ? `NT$ ${subscription.plan.price.toLocaleString()} / ${subscription.plan.interval === 'YEAR' ? '年' : '月'}`
                    : '免費試用'}
                </CardDescription>
              </div>
              {subscription.status === 'TRIAL' && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">試用剩餘</p>
                  <p className="text-2xl font-bold text-primary">
                    {getDaysRemaining(subscription.trialEndsAt!)} 天
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">計費週期開始</p>
                  <p className="font-medium">{formatDate(subscription.currentPeriodStart)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {subscription.status === 'TRIAL' ? '試用到期日' : '下次扣款日'}
                  </p>
                  <p className="font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">方案限制</p>
                  <p className="font-medium">
                    {subscription.plan.voterLimit
                      ? `${subscription.plan.voterLimit} 選民`
                      : '無限制'}
                  </p>
                </div>
              </div>
            </div>

            {/* 試用期警告 */}
            {subscription.status === 'TRIAL' && getDaysRemaining(subscription.trialEndsAt!) <= 3 && (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-800">試用期即將結束</p>
                  <p className="text-sm text-yellow-700">
                    請在試用期結束前升級為付費方案，以繼續使用所有功能
                  </p>
                </div>
                <Button onClick={() => router.push('/pricing')}>
                  立即升級
                </Button>
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              {subscription.status !== 'CANCELLED' && subscription.status !== 'EXPIRED' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 hover:text-red-700">
                      取消訂閱
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>確定要取消訂閱嗎？</AlertDialogTitle>
                      <AlertDialogDescription>
                        取消後，您仍可使用服務直到目前計費週期結束（{formatDate(subscription.currentPeriodEnd)}）。
                        之後將無法使用付費功能。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>保留訂閱</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelSubscription}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isCancelling}
                      >
                        {isCancelling ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        確定取消
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">尚無訂閱</h3>
            <p className="text-muted-foreground mb-6">
              選擇合適的方案，開始使用選情系統的完整功能
            </p>
            <Button onClick={() => router.push('/pricing')}>
              查看方案
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 付款記錄 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            付款記錄
          </CardTitle>
          <CardDescription>查看所有付款交易記錄</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">日期</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">方案</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">金額</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">支付方式</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="py-3 px-4">
                        {formatDate(payment.paidAt || payment.createdAt)}
                      </td>
                      <td className="py-3 px-4">{payment.subscription.plan.name}</td>
                      <td className="py-3 px-4">
                        {payment.currency} {payment.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">{payment.provider}</td>
                      <td className="py-3 px-4">
                        <Badge className={paymentStatusConfig[payment.status]?.color}>
                          {paymentStatusConfig[payment.status]?.label || payment.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              尚無付款記錄
            </div>
          )}
        </CardContent>
      </Card>

      {/* 聯繫支援 */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">需要協助？</h3>
              <p className="text-sm text-muted-foreground">
                如有帳單或訂閱相關問題，請聯繫我們的客服團隊
              </p>
            </div>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              聯繫客服
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
