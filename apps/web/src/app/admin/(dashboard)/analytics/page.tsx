'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, TrendingUp, Users, DollarSign, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminAnalyticsApi } from '@/lib/api';
import {
  chartTooltipStyle,
  chartAxisStyle,
  chartGridStyle,
  chartLegendStyle,
  DEFAULT_CHART_PALETTE,
} from '@/lib/chart-styles';

// 動態載入圖表以避免 SSR 問題
const RechartsLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  { ssr: false }
);
const RechartsBarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  { ssr: false }
);
const RechartsPieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart),
  { ssr: false }
);
const Line = dynamic(
  () => import('recharts').then((mod) => mod.Line),
  { ssr: false }
);
const Bar = dynamic(
  () => import('recharts').then((mod) => mod.Bar),
  { ssr: false }
);
const Pie = dynamic(
  () => import('recharts').then((mod) => mod.Pie),
  { ssr: false }
);
const Cell = dynamic(
  () => import('recharts').then((mod) => mod.Cell),
  { ssr: false }
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip),
  { ssr: false }
);
const Legend = dynamic(
  () => import('recharts').then((mod) => mod.Legend),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

const COLORS = DEFAULT_CHART_PALETTE;

export default function AdminAnalyticsPage() {
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [subscriptionDist, setSubscriptionDist] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [growth, revenue, distribution] = await Promise.all([
        adminAnalyticsApi.getUserGrowth(30),
        adminAnalyticsApi.getRevenueReport(12),
        adminAnalyticsApi.getSubscriptionDistribution(),
      ]);
      setUserGrowth(growth);
      setRevenueData(revenue);
      setSubscriptionDist(distribution);
    } catch (error) {
      console.error('載入分析數據失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `NT$ ${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">數據分析</h1>
        <p className="text-muted-foreground">系統營運數據詳細分析</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            用戶成長
          </TabsTrigger>
          <TabsTrigger value="revenue">
            <DollarSign className="h-4 w-4 mr-2" />
            營收報表
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <PieChart className="h-4 w-4 mr-2" />
            訂閱分佈
          </TabsTrigger>
        </TabsList>

        {/* User Growth Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>用戶成長趨勢</CardTitle>
              <CardDescription>過去 30 天的用戶成長</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={userGrowth}>
                    <CartesianGrid {...chartGridStyle} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => v.split('-').slice(1).join('/')}
                      tick={chartAxisStyle.tick}
                      stroke={chartAxisStyle.stroke}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={chartAxisStyle.tick}
                      stroke={chartAxisStyle.stroke}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={chartAxisStyle.tick}
                      stroke={chartAxisStyle.stroke}
                    />
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        value,
                        name === 'newUsers' ? '新增用戶' : '累計用戶',
                      ]}
                      labelFormatter={(label) => `日期: ${label}`}
                      {...chartTooltipStyle}
                    />
                    <Legend {...chartLegendStyle} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="newUsers"
                      stroke="#3b82f6"
                      name="新增用戶"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="totalUsers"
                      stroke="#22c55e"
                      name="累計用戶"
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">30 天新增用戶</p>
                    <p className="text-2xl font-bold">
                      {userGrowth.reduce((sum, d) => sum + d.newUsers, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">總用戶數</p>
                    <p className="text-2xl font-bold">
                      {userGrowth.length > 0
                        ? userGrowth[userGrowth.length - 1].totalUsers
                        : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">日均新增</p>
                    <p className="text-2xl font-bold">
                      {(
                        userGrowth.reduce((sum, d) => sum + d.newUsers, 0) / 30
                      ).toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>月營收趨勢</CardTitle>
              <CardDescription>過去 12 個月的營收</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={revenueData}>
                    <CartesianGrid {...chartGridStyle} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(v) => v.split('-')[1] + '月'}
                      tick={chartAxisStyle.tick}
                      stroke={chartAxisStyle.stroke}
                    />
                    <YAxis
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      tick={chartAxisStyle.tick}
                      stroke={chartAxisStyle.stroke}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(value), '營收']}
                      labelFormatter={(label) => `${label}`}
                      {...chartTooltipStyle}
                    />
                    <Bar dataKey="revenue" fill="#22c55e" name="營收" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">總營收</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    revenueData.reduce((sum, d) => sum + d.revenue, 0)
                  )}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">總交易數</p>
                <p className="text-2xl font-bold">
                  {revenueData.reduce((sum, d) => sum + d.count, 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">月均營收</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    revenueData.reduce((sum, d) => sum + d.revenue, 0) / 12
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Status */}
            <Card>
              <CardHeader>
                <CardTitle>訂閱狀態分佈</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={subscriptionDist?.byStatus || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="status"
                      >
                        {(subscriptionDist?.byStatus || []).map(
                          (_: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip {...chartTooltipStyle} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* By Plan */}
            <Card>
              <CardHeader>
                <CardTitle>方案分佈</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={subscriptionDist?.byPlan || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ planName, percent }) =>
                          `${planName} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="planName"
                      >
                        {(subscriptionDist?.byPlan || []).map(
                          (_: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip {...chartTooltipStyle} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Stats Table */}
          <Card>
            <CardHeader>
              <CardTitle>訂閱詳細數據</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {subscriptionDist?.byStatus?.map((s: any) => (
                  <div
                    key={s.status}
                    className="text-center p-4 bg-muted rounded-lg"
                  >
                    <p className="text-2xl font-bold">{s.count}</p>
                    <p className="text-sm text-muted-foreground">{s.status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
