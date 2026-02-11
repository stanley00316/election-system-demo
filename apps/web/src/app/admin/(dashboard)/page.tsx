'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Loader2,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminAnalyticsApi } from '@/lib/api';

interface OverviewData {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  userGrowth: number;
  conversionRate: number;
  churnRate: number;
  arpu: number;
  newUsersThisMonth: number;
}

interface RecentActivity {
  newUsers: any[];
  newSubscriptions: any[];
  recentPayments: any[];
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewData, activityData] = await Promise.all([
        adminAnalyticsApi.getOverview(),
        adminAnalyticsApi.getRecentActivity(5),
      ]);
      setOverview(overviewData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('載入數據失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `NT$ ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">總覽儀表板</h1>
        <p className="text-muted-foreground">系統營運數據一覽</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 總使用者數 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">總使用者數</p>
                <p className="text-3xl font-bold mt-1">
                  {(overview?.totalUsers ?? 0).toLocaleString()}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  {overview?.userGrowth && overview.userGrowth > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={overview?.userGrowth && overview.userGrowth > 0 ? 'text-green-600' : 'text-red-600'}>
                    {overview?.userGrowth?.toFixed(1) || 0}%
                  </span>
                  <span className="text-gray-400 ml-1">較上月</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 活躍訂閱數 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">活躍訂閱數</p>
                <p className="text-3xl font-bold mt-1">
                  {(overview?.activeSubscriptions ?? 0).toLocaleString()}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  <span className="text-muted-foreground">
                    轉換率 {overview?.conversionRate?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 本月營收 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">本月營收</p>
                <p className="text-3xl font-bold mt-1">
                  {formatCurrency(overview?.monthlyRevenue || 0)}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  {overview?.revenueGrowth && overview.revenueGrowth > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={overview?.revenueGrowth && overview.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}>
                    {overview?.revenueGrowth?.toFixed(1) || 0}%
                  </span>
                  <span className="text-gray-400 ml-1">較上月</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ARPU */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">平均客單價</p>
                <p className="text-3xl font-bold mt-1">
                  {formatCurrency(overview?.arpu || 0)}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  <span className="text-muted-foreground">
                    流失率 {overview?.churnRate?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最近註冊 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">最近註冊</CardTitle>
              <CardDescription>新使用者</CardDescription>
            </div>
            <UserPlus className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity?.newUsers?.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {user.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email || '-'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              ))}
              {(!recentActivity?.newUsers || recentActivity.newUsers.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">暫無資料</p>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link href="/admin/users">
                查看全部 <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* 最近訂閱 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">最近訂閱</CardTitle>
              <CardDescription>新訂閱活動</CardDescription>
            </div>
            <CreditCard className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity?.newSubscriptions?.slice(0, 5).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{sub.user.name}</p>
                    <p className="text-xs text-muted-foreground">{sub.plan.name}</p>
                  </div>
                  <Badge
                    variant={sub.status === 'ACTIVE' ? 'default' : 'secondary'}
                  >
                    {sub.status === 'TRIAL' ? '試用' : sub.status === 'ACTIVE' ? '訂閱中' : sub.status}
                  </Badge>
                </div>
              ))}
              {(!recentActivity?.newSubscriptions || recentActivity.newSubscriptions.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">暫無資料</p>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link href="/admin/subscriptions">
                查看全部 <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* 最近付款 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">最近付款</CardTitle>
              <CardDescription>成功的交易</CardDescription>
            </div>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity?.recentPayments?.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {payment.subscription.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.paidAt)}
                    </p>
                  </div>
                  <span className="font-medium text-green-600">
                    +{formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
              {(!recentActivity?.recentPayments || recentActivity.recentPayments.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">暫無資料</p>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link href="/admin/payments">
                查看全部 <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/admin/users">
                <Users className="h-4 w-4 mr-2" />
                管理使用者
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/subscriptions">
                <CreditCard className="h-4 w-4 mr-2" />
                管理訂閱
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/payments">
                <DollarSign className="h-4 w-4 mr-2" />
                查看付款
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                詳細分析
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
