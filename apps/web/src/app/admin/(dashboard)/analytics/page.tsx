'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, TrendingUp, Users, DollarSign, PieChart, Megaphone, ArrowDownRight, Gift, Trophy, Activity, MapPin, BarChart2, Gem, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminAnalyticsApi, adminPromotersApi } from '@/lib/api';
import { getShareChannelLabel } from '@/lib/utils';
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
  const [promoterOverview, setPromoterOverview] = useState<any>(null);
  const [promoterFunnel, setPromoterFunnel] = useState<any>(null);
  const [promoterChannels, setPromoterChannels] = useState<any[]>([]);
  const [promoterLeaderboard, setPromoterLeaderboard] = useState<any[]>([]);
  const [promoterTrialStats, setPromoterTrialStats] = useState<any>(null);
  // 用戶洞察資料
  const [retentionData, setRetentionData] = useState<any[]>([]);
  const [activeUserStats, setActiveUserStats] = useState<any>(null);
  const [lifecycleData, setLifecycleData] = useState<any>(null);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [behaviorData, setBehaviorData] = useState<any>(null);
  const [valueData, setValueData] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
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

      // 載入推廣者分析數據（不阻塞主要載入）
      try {
        const [overview, funnel, channels, leaderboard, trialStats] = await Promise.all([
          adminPromotersApi.getOverviewStats(),
          adminPromotersApi.getFunnelStats(),
          adminPromotersApi.getChannelStats(),
          adminPromotersApi.getLeaderboard(10),
          adminPromotersApi.getTrialStats(),
        ]);
        setPromoterOverview(overview);
        setPromoterFunnel(funnel);
        setPromoterChannels(channels);
        setPromoterLeaderboard(leaderboard);
        setPromoterTrialStats(trialStats);
      } catch (err) {
        console.error('載入推廣分析數據失敗:', err);
      }
    } catch (error) {
      console.error('載入分析數據失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInsightsData = async () => {
    if (insightsLoading || retentionData.length > 0) return;
    setInsightsLoading(true);
    try {
      const [retention, activeUsers, lifecycle, geo, behavior, value] = await Promise.all([
        adminAnalyticsApi.getRetentionAnalysis(6),
        adminAnalyticsApi.getActiveUserStats(30),
        adminAnalyticsApi.getSubscriptionLifecycle(),
        adminAnalyticsApi.getGeographicDistribution(),
        adminAnalyticsApi.getUserBehaviorAnalysis(),
        adminAnalyticsApi.getUserValueAnalysis(),
      ]);
      setRetentionData(retention);
      setActiveUserStats(activeUsers);
      setLifecycleData(lifecycle);
      setGeoData(geo);
      setBehaviorData(behavior);
      setValueData(value);
    } catch (err) {
      console.error('載入用戶洞察數據失敗:', err);
    } finally {
      setInsightsLoading(false);
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
          <TabsTrigger value="promoters">
            <Megaphone className="h-4 w-4 mr-2" />
            推廣分析
          </TabsTrigger>
          <TabsTrigger value="insights" onClick={loadInsightsData}>
            <Activity className="h-4 w-4 mr-2" />
            用戶洞察
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

        {/* Promoter Analytics Tab */}
        <TabsContent value="promoters" className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Megaphone className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">總推廣者</p>
                    <p className="text-2xl font-bold">{promoterOverview?.totalPromoters ?? 0}</p>
                    <p className="text-xs text-muted-foreground">
                      活躍 {promoterOverview?.activePromoters ?? 0} 位
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">成功轉換</p>
                    <p className="text-2xl font-bold">{promoterOverview?.successReferrals ?? 0}</p>
                    <p className="text-xs text-muted-foreground">
                      本月 {promoterOverview?.monthSuccess ?? 0} 筆
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
                    <p className="text-sm text-muted-foreground">轉換率</p>
                    <p className="text-2xl font-bold">{promoterOverview?.conversionRate ?? 0}%</p>
                    <p className="text-xs text-muted-foreground">
                      總連結點擊 {promoterOverview?.totalClicks ?? 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Gift className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">試用轉換</p>
                    <p className="text-2xl font-bold">{promoterTrialStats?.converted ?? 0}</p>
                    <p className="text-xs text-muted-foreground">
                      轉換率 {promoterTrialStats?.conversionRate ?? 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Funnel Chart */}
          <Card>
            <CardHeader>
              <CardTitle>轉換漏斗</CardTitle>
              <CardDescription>推廣者帶來的使用者轉換流程</CardDescription>
            </CardHeader>
            <CardContent>
              {promoterFunnel ? (
                <div className="space-y-3">
                  {[
                    { label: '連結點擊', value: promoterFunnel.clicked, color: 'bg-blue-500' },
                    { label: '完成註冊', value: promoterFunnel.registered, color: 'bg-cyan-500' },
                    { label: '啟用試用', value: promoterFunnel.trial, color: 'bg-green-500' },
                    { label: '付費訂閱', value: promoterFunnel.subscribed, color: 'bg-orange-500' },
                    { label: '續訂', value: promoterFunnel.renewed, color: 'bg-red-500' },
                  ].map((step, index) => {
                    const maxValue = promoterFunnel.clicked || 1;
                    const widthPercent = Math.max((step.value / maxValue) * 100, 2);
                    return (
                      <div key={step.label} className="flex items-center gap-4">
                        <span className="w-20 text-sm text-muted-foreground text-right">{step.label}</span>
                        <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                          <div
                            className={`h-full ${step.color} rounded-md flex items-center justify-end pr-2 transition-all duration-500`}
                            style={{ width: `${widthPercent}%` }}
                          >
                            <span className="text-white text-xs font-bold">{step.value}</span>
                          </div>
                        </div>
                        {index > 0 && promoterFunnel.clicked > 0 && (
                          <span className="w-16 text-xs text-muted-foreground text-right">
                            {((step.value / maxValue) * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">尚無數據</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Channel Stats */}
            <Card>
              <CardHeader>
                <CardTitle>管道分佈</CardTitle>
                <CardDescription>各分享管道的推薦效果</CardDescription>
              </CardHeader>
              <CardContent>
                {promoterChannels.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={promoterChannels.map((c: any) => ({
                          ...c,
                          channelName: getShareChannelLabel(c.channel),
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid {...chartGridStyle} />
                        <XAxis type="number" tick={chartAxisStyle.tick} stroke={chartAxisStyle.stroke} />
                        <YAxis
                          type="category"
                          dataKey="channelName"
                          width={80}
                          tick={chartAxisStyle.tick}
                          stroke={chartAxisStyle.stroke}
                        />
                        <Tooltip {...chartTooltipStyle} />
                        <Legend {...chartLegendStyle} />
                        <Bar dataKey="clicks" fill="#3b82f6" name="點擊" />
                        <Bar dataKey="registered" fill="#22c55e" name="註冊" />
                        <Bar dataKey="subscribed" fill="#f59e0b" name="訂閱" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">尚無管道數據</p>
                )}
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle>推廣者排行榜</CardTitle>
                <CardDescription>依成功轉換數排序</CardDescription>
              </CardHeader>
              <CardContent>
                {promoterLeaderboard.length > 0 ? (
                  <div className="space-y-3">
                    {promoterLeaderboard.slice(0, 10).map((p: any, index: number) => (
                      <div key={p.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-600' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index < 3 ? <Trophy className="h-4 w-4" /> : index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.referralCode}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{p.successCount + p.trialConverted}</p>
                          <p className="text-xs text-muted-foreground">
                            轉換 {p.successCount} / 試用 {p.trialConverted}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">尚無排行數據</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Trial Stats */}
          <Card>
            <CardHeader>
              <CardTitle>試用發放統計</CardTitle>
              <CardDescription>推廣者發放試用的轉換情況</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[
                  { label: '總發放', value: promoterTrialStats?.total ?? 0, color: 'text-gray-900' },
                  { label: '已啟用', value: promoterTrialStats?.activated ?? 0, color: 'text-blue-600' },
                  { label: '使用中', value: promoterTrialStats?.active ?? 0, color: 'text-green-600' },
                  { label: '已轉換', value: promoterTrialStats?.converted ?? 0, color: 'text-orange-600' },
                  { label: '已過期', value: promoterTrialStats?.expired ?? 0, color: 'text-gray-400' },
                  { label: '即將到期', value: promoterTrialStats?.expiringSoon ?? 0, color: 'text-red-600' },
                  { label: '本月發放', value: promoterTrialStats?.monthIssued ?? 0, color: 'text-purple-600' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-3 bg-muted rounded-lg">
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          {insightsLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* 區塊 1 - DAU/MAU 趨勢圖 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    DAU / MAU 趨勢
                  </CardTitle>
                  <CardDescription>每日活躍用戶與每月活躍用戶</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {activeUserStats?.dau?.length > 0
                          ? activeUserStats.dau[activeUserStats.dau.length - 1]?.count ?? 0
                          : 0}
                      </p>
                      <p className="text-sm text-muted-foreground">今日 DAU</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {activeUserStats?.mau?.length > 0
                          ? activeUserStats.mau[activeUserStats.mau.length - 1]?.count ?? 0
                          : 0}
                      </p>
                      <p className="text-sm text-muted-foreground">本月 MAU</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {activeUserStats?.dauMauRatio ?? 0}%
                      </p>
                      <p className="text-sm text-muted-foreground">DAU/MAU 比率</p>
                    </div>
                  </div>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={activeUserStats?.dau || []}>
                        <CartesianGrid {...chartGridStyle} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => v.split('-').slice(1).join('/')}
                          tick={chartAxisStyle.tick}
                          stroke={chartAxisStyle.stroke}
                        />
                        <YAxis
                          tick={chartAxisStyle.tick}
                          stroke={chartAxisStyle.stroke}
                        />
                        <Tooltip
                          formatter={(value: any) => [value, 'DAU']}
                          labelFormatter={(label) => `日期: ${label}`}
                          {...chartTooltipStyle}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="DAU"
                          dot={false}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* 區塊 2 - 留存率同期群分析 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    留存率同期群分析
                  </CardTitle>
                  <CardDescription>每月同期群的月留存率（M0~M6）</CardDescription>
                </CardHeader>
                <CardContent>
                  {retentionData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium">同期群</th>
                            <th className="text-center py-2 px-3 font-medium">用戶數</th>
                            {Array.from({ length: 7 }, (_, i) => (
                              <th key={i} className="text-center py-2 px-3 font-medium">M{i}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {retentionData.map((row) => (
                            <tr key={row.cohort} className="border-b">
                              <td className="py-2 px-3 font-medium">{row.cohort}</td>
                              <td className="text-center py-2 px-3">{row.totalUsers}</td>
                              {Array.from({ length: 7 }, (_, i) => {
                                const value = row[`month${i}`];
                                if (value === undefined) return <td key={i} className="py-2 px-3" />;
                                const intensity = Math.min(value / 100, 1);
                                const bgColor = `rgba(34, 197, 94, ${intensity * 0.6 + 0.05})`;
                                return (
                                  <td
                                    key={i}
                                    className="text-center py-2 px-3 font-medium"
                                    style={{ backgroundColor: bgColor }}
                                  >
                                    {value}%
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">尚無留存率數據</p>
                  )}
                </CardContent>
              </Card>

              {/* 區塊 3 - 訂閱生命週期 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    訂閱生命週期
                  </CardTitle>
                  <CardDescription>試用轉付費、訂閱持續時間與取消原因</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">
                        {lifecycleData?.trialConversionRate ?? 0}%
                      </p>
                      <p className="text-sm text-muted-foreground">試用轉付費率</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {lifecycleData?.avgTrialDays ?? 0} 天
                      </p>
                      <p className="text-sm text-muted-foreground">平均試用轉換天數</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {lifecycleData?.avgDurationMonths ?? 0} 月
                      </p>
                      <p className="text-sm text-muted-foreground">平均訂閱持續月數</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 漏斗 */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">狀態遷移漏斗</h4>
                      {lifecycleData?.funnel?.length > 0 ? (
                        <div className="space-y-3">
                          {lifecycleData.funnel.map((step: any, index: number) => {
                            const maxValue = lifecycleData.funnel[0]?.count || 1;
                            const widthPercent = Math.max((step.count / maxValue) * 100, 5);
                            const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-red-400'];
                            return (
                              <div key={step.stage} className="flex items-center gap-3">
                                <span className="w-12 text-sm text-muted-foreground text-right">{step.stage}</span>
                                <div className="flex-1 h-7 bg-muted rounded overflow-hidden">
                                  <div
                                    className={`h-full ${colors[index % colors.length]} rounded flex items-center justify-end pr-2`}
                                    style={{ width: `${widthPercent}%` }}
                                  >
                                    <span className="text-white text-xs font-bold">{step.count}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">尚無漏斗數據</p>
                      )}
                    </div>

                    {/* 取消原因 */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">取消原因分佈</h4>
                      {lifecycleData?.cancelReasons?.length > 0 ? (
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={lifecycleData.cancelReasons}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                                nameKey="reason"
                                label={({ reason, percent }) =>
                                  `${reason} (${(percent * 100).toFixed(0)}%)`
                                }
                              >
                                {lifecycleData.cancelReasons.map((_: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip {...chartTooltipStyle} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">尚無取消記錄</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 區塊 4 - 地理分佈 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-red-600" />
                    地理分佈
                  </CardTitle>
                  <CardDescription>各縣市用戶數與訂閱數</CardDescription>
                </CardHeader>
                <CardContent>
                  {geoData.length > 0 ? (
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart
                          data={geoData.slice(0, 15)}
                          layout="vertical"
                          margin={{ left: 20 }}
                        >
                          <CartesianGrid {...chartGridStyle} />
                          <XAxis type="number" tick={chartAxisStyle.tick} stroke={chartAxisStyle.stroke} />
                          <YAxis
                            type="category"
                            dataKey="city"
                            width={80}
                            tick={chartAxisStyle.tick}
                            stroke={chartAxisStyle.stroke}
                          />
                          <Tooltip
                            formatter={(value: any, name: string) => {
                              const labels: Record<string, string> = {
                                users: '用戶數',
                                subscriptions: '訂閱數',
                              };
                              return [value, labels[name] || name];
                            }}
                            {...chartTooltipStyle}
                          />
                          <Legend
                            {...chartLegendStyle}
                            formatter={(value: string) => {
                              const labels: Record<string, string> = {
                                users: '用戶數',
                                subscriptions: '訂閱數',
                              };
                              return labels[value] || value;
                            }}
                          />
                          <Bar dataKey="users" fill="#3b82f6" name="users" />
                          <Bar dataKey="subscriptions" fill="#22c55e" name="subscriptions" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">尚無地理數據</p>
                  )}
                </CardContent>
              </Card>

              {/* 區塊 5 - 功能使用分析 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart2 className="h-5 w-5 text-indigo-600" />
                      功能使用頻率
                    </CardTitle>
                    <CardDescription>過去 30 天各功能模組使用次數</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {behaviorData?.featureUsage?.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={behaviorData.featureUsage.slice(0, 10)}>
                            <CartesianGrid {...chartGridStyle} />
                            <XAxis
                              dataKey="feature"
                              tick={chartAxisStyle.tick}
                              stroke={chartAxisStyle.stroke}
                              angle={-30}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis tick={chartAxisStyle.tick} stroke={chartAxisStyle.stroke} />
                            <Tooltip
                              formatter={(value: any) => [value, '使用次數']}
                              {...chartTooltipStyle}
                            />
                            <Bar dataKey="count" fill="#6366f1" name="使用次數" />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">尚無功能使用數據</p>
                    )}
                    {behaviorData?.avgDaysToFirstCampaign !== undefined && (
                      <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          平均 <span className="font-bold text-indigo-600">{behaviorData.avgDaysToFirstCampaign} 天</span> 建立第一個選戰
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-teal-600" />
                      活躍時段分佈
                    </CardTitle>
                    <CardDescription>24 小時活躍度分佈</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {behaviorData?.hourlyData?.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={behaviorData.hourlyData}>
                            <CartesianGrid {...chartGridStyle} />
                            <XAxis
                              dataKey="hour"
                              tickFormatter={(v) => `${v}:00`}
                              tick={chartAxisStyle.tick}
                              stroke={chartAxisStyle.stroke}
                            />
                            <YAxis tick={chartAxisStyle.tick} stroke={chartAxisStyle.stroke} />
                            <Tooltip
                              formatter={(value: any) => [value, '操作次數']}
                              labelFormatter={(label) => `${label}:00 - ${label}:59`}
                              {...chartTooltipStyle}
                            />
                            <Bar dataKey="count" fill="#14b8a6" name="操作次數" />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">尚無時段數據</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 區塊 6 - 用戶價值分析 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gem className="h-5 w-5 text-amber-600" />
                    用戶價值分析
                  </CardTitle>
                  <CardDescription>LTV 分佈、價值分層與 ARPU 趨勢</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <p className="text-2xl font-bold text-amber-600">
                        {formatCurrency(valueData?.avgLtv ?? 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">平均 LTV</p>
                    </div>
                    <div className="text-center p-4 bg-emerald-50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-600">
                        {valueData?.totalPaidUsers ?? 0} 位
                      </p>
                      <p className="text-sm text-muted-foreground">付費用戶總數</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* LTV 分佈 */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">LTV 分佈</h4>
                      {valueData?.ltvDistribution?.length > 0 ? (
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={valueData.ltvDistribution}>
                              <CartesianGrid {...chartGridStyle} />
                              <XAxis
                                dataKey="range"
                                tick={{ ...chartAxisStyle.tick, fontSize: 10 }}
                                stroke={chartAxisStyle.stroke}
                                angle={-30}
                                textAnchor="end"
                                height={50}
                              />
                              <YAxis tick={chartAxisStyle.tick} stroke={chartAxisStyle.stroke} />
                              <Tooltip
                                formatter={(value: any) => [value, '用戶數']}
                                {...chartTooltipStyle}
                              />
                              <Bar dataKey="count" fill="#f59e0b" name="用戶數" />
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">尚無數據</p>
                      )}
                    </div>

                    {/* 價值分層 */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">價值分層</h4>
                      {valueData?.valueTiers?.length > 0 ? (
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={valueData.valueTiers}
                                cx="50%"
                                cy="50%"
                                outerRadius={70}
                                fill="#8884d8"
                                dataKey="count"
                                nameKey="tier"
                                label={({ tier, percent }) =>
                                  `${tier} (${(percent * 100).toFixed(0)}%)`
                                }
                              >
                                <Cell fill="#ef4444" />
                                <Cell fill="#f59e0b" />
                                <Cell fill="#6b7280" />
                              </Pie>
                              <Tooltip {...chartTooltipStyle} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">尚無數據</p>
                      )}
                    </div>

                    {/* ARPU 趨勢 */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">ARPU 月趨勢</h4>
                      {valueData?.arpuTrend?.length > 0 ? (
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsLineChart data={valueData.arpuTrend}>
                              <CartesianGrid {...chartGridStyle} />
                              <XAxis
                                dataKey="month"
                                tickFormatter={(v) => v.split('-')[1] + '月'}
                                tick={{ ...chartAxisStyle.tick, fontSize: 10 }}
                                stroke={chartAxisStyle.stroke}
                              />
                              <YAxis
                                tickFormatter={(v) => `$${v}`}
                                tick={chartAxisStyle.tick}
                                stroke={chartAxisStyle.stroke}
                              />
                              <Tooltip
                                formatter={(value: any) => [formatCurrency(value), 'ARPU']}
                                labelFormatter={(label) => label}
                                {...chartTooltipStyle}
                              />
                              <Line
                                type="monotone"
                                dataKey="arpu"
                                stroke="#10b981"
                                strokeWidth={2}
                                name="ARPU"
                                dot={{ r: 3 }}
                              />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">尚無數據</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
