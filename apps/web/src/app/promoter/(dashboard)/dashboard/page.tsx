'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { promoterSelfApi } from '@/lib/api';
import {
  Users,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Gift,
  BarChart3,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function PromoterDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentReferrals, setRecentReferrals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, referralsData] = await Promise.all([
        promoterSelfApi.getStats(),
        promoterSelfApi.getReferrals({ page: 1, limit: 5 }),
      ]);
      setStats(statsData);
      setRecentReferrals(referralsData.data);
    } catch (err) {
      console.error('Failed to load promoter stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      CLICKED: '已點擊',
      REGISTERED: '已註冊',
      SUBSCRIBED: '已訂閱',
      RENEWED: '已續約',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      CLICKED: 'bg-gray-100 text-gray-700',
      REGISTERED: 'bg-blue-100 text-blue-700',
      SUBSCRIBED: 'bg-green-100 text-green-700',
      RENEWED: 'bg-purple-100 text-purple-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
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
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">總推薦數</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalReferrals ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">成功轉換</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats?.successCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">轉換率</span>
            </div>
            <p className="text-2xl font-bold">{stats?.conversionRate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">累積獎勵</span>
            </div>
            <p className="text-2xl font-bold">${Number(stats?.totalReward ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MousePointerClick className="h-4 w-4" />
              <span className="text-xs">總點擊數</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalClicks ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Gift className="h-4 w-4" />
              <span className="text-xs">試用轉換</span>
            </div>
            <p className="text-2xl font-bold">{stats?.trialConverted ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      {stats?.trend && stats.trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">近 30 天推薦趨勢</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => v.slice(5)}
                    fontSize={12}
                  />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip
                    labelFormatter={(v) => `日期：${v}`}
                    formatter={(value: number, name: string) => [
                      value,
                      name === 'total' ? '總推薦' : '成功轉換',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    name="total"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="success"
                    stroke="#22c55e"
                    name="success"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Referrals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近推薦紀錄</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReferrals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              尚無推薦紀錄
            </p>
          ) : (
            <div className="space-y-3">
              {recentReferrals.map((ref: any) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium">
                      {ref.referredUser?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {ref.referredUser?.name || '匿名使用者'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ref.createdAt).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ref.status)}`}
                  >
                    {getStatusLabel(ref.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
