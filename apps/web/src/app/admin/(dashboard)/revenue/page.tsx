'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { adminPaymentsApi } from '@/lib/api';

interface RevenueMonth {
  month: string;
  revenue: number;
  count: number;
}

interface ConversionFunnel {
  totalTrials: number;
  trialToActive: number;
  conversionRate: number;
  totalActive: number;
  totalChurned: number;
  churnRate: number;
}

interface MRRData {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
}

export default function RevenueDashboardPage() {
  const [revenueChart, setRevenueChart] = useState<RevenueMonth[]>([]);
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null);
  const [mrrData, setMrrData] = useState<MRRData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [chart, funnelData, mrr, paymentStats] = await Promise.all([
        adminPaymentsApi.getRevenueChart(12),
        adminPaymentsApi.getConversionFunnel(),
        adminPaymentsApi.getMRR(),
        adminPaymentsApi.getStats(),
      ]);
      setRevenueChart(chart);
      setFunnel(funnelData);
      setMrrData(mrr);
      setStats(paymentStats);
    } catch (error) {
      console.error('載入營收資料失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `NT$ ${amount.toLocaleString()}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxRevenue = Math.max(...revenueChart.map(r => r.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">營收報表</h1>
          <p className="text-muted-foreground">MRR、轉換率、流失率與收入趨勢</p>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          重新整理
        </Button>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mrrData ? formatCurrency(mrrData.mrr) : '-'}</div>
            <p className="text-xs text-muted-foreground">
              ARR: {mrrData ? formatCurrency(mrrData.arr) : '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活躍訂閱</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mrrData?.activeSubscriptions ?? 0}</div>
            <p className="text-xs text-muted-foreground">目前付費用戶數</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">轉換率</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {funnel?.conversionRate ?? 0}%
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              試用→付費 ({funnel?.trialToActive ?? 0}/{funnel?.totalTrials ?? 0})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">流失率</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {funnel?.churnRate ?? 0}%
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              流失 {funnel?.totalChurned ?? 0} 位用戶
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 營收趨勢 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            月營收趨勢
          </CardTitle>
          <CardDescription>過去 12 個月營收資料</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {revenueChart.map((item) => (
              <div key={item.month} className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-20">{item.month}</span>
                <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-32 text-right">
                  {formatCurrency(item.revenue)}
                </span>
                <Badge variant="outline" className="w-16 justify-center">
                  {item.count} 筆
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 總營收與支付統計 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>總營收</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-4">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <div className="space-y-2">
                {stats.byStatus?.map((s: any) => (
                  <div key={s.status} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{s.status}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium">{formatCurrency(s.amount)}</span>
                      <span className="text-xs text-muted-foreground ml-2">({s.count} 筆)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>支付方式分佈</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.byProvider?.map((p: any) => (
                  <div key={p.provider} className="flex items-center justify-between">
                    <Badge variant="outline">{p.provider}</Badge>
                    <div className="text-right">
                      <span className="text-sm font-medium">{formatCurrency(p.amount)}</span>
                      <span className="text-xs text-muted-foreground ml-2">({p.count} 筆)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
