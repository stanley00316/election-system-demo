'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  Award,
  Gift,
  Plus,
  Search,
  Filter,
  TestTube,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminPromotersApi } from '@/lib/api';
import {
  getPromoterTypeLabel,
  getPromoterStatusLabel,
  getRewardTypeLabel,
} from '@/lib/utils';
import { format } from 'date-fns';

export default function AdminPromotersPage() {
  return (
    <SuperAdminGuard>
      <AdminPromotersContent />
    </SuperAdminGuard>
  );
}

function AdminPromotersContent() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [trialStats, setTrialStats] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    search: '',
    page: 1,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadPromoters();
  }, [filters]);

  const loadData = async () => {
    try {
      const [statsData, trialData, funnelData, leaderboardData] = await Promise.all([
        adminPromotersApi.getOverviewStats(),
        adminPromotersApi.getTrialStats(),
        adminPromotersApi.getFunnelStats(),
        adminPromotersApi.getLeaderboard(5),
      ]);
      setStats(statsData);
      setTrialStats(trialData);
      setFunnel(funnelData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadPromoters = async () => {
    setIsLoading(true);
    try {
      const params: any = { page: filters.page, limit: 15 };
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const result = await adminPromotersApi.getPromoters(params);
      setPromoters(result.data);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Failed to load promoters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'SUSPENDED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      case 'APPROVED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">推廣管理</h1>
          <p className="text-muted-foreground">管理推廣者、追蹤推廣成效與試用發放</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/promoters/pending">
            <Button variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              待審核
              {stats?.pendingPromoters > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{stats.pendingPromoters}</Badge>
              )}
            </Button>
          </Link>
          <Link href="/admin/promoters/trials">
            <Button variant="outline">
              <TestTube className="h-4 w-4 mr-2" />
              試用管理
            </Button>
          </Link>
          <Button onClick={() => router.push('/admin/promoters/new')}>
            <Plus className="h-4 w-4 mr-2" />
            新增推廣者
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Users className="h-4 w-4" />
                總推廣者
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalPromoters}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <UserCheck className="h-4 w-4" />
                活躍中
              </div>
              <p className="text-2xl font-bold mt-1 text-green-600">{stats.activePromoters}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <TrendingUp className="h-4 w-4" />
                本月成功
              </div>
              <p className="text-2xl font-bold mt-1 text-blue-600">{stats.monthSuccess}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Award className="h-4 w-4" />
                總轉換率
              </div>
              <p className="text-2xl font-bold mt-1">{stats.conversionRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <TestTube className="h-4 w-4" />
                試用轉付費
              </div>
              <p className="text-2xl font-bold mt-1 text-purple-600">
                {trialStats?.converted || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Gift className="h-4 w-4" />
                累計獎勵
              </div>
              <p className="text-2xl font-bold mt-1">NT$ {Number(stats.totalReward).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 轉換漏斗 */}
      {funnel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">轉換漏斗</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 overflow-x-auto pb-2">
              {[
                { label: '連結點擊', value: funnel.clicked, color: 'bg-blue-500' },
                { label: '註冊', value: funnel.registered, color: 'bg-indigo-500' },
                { label: '試用', value: funnel.trial, color: 'bg-purple-500' },
                { label: '訂閱', value: funnel.subscribed, color: 'bg-green-500' },
                { label: '續訂', value: funnel.renewed, color: 'bg-emerald-500' },
              ].map((step, idx, arr) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div className="text-center min-w-[100px]">
                    <div className={`${step.color} text-white rounded-lg py-3 px-4`}>
                      <p className="text-xl font-bold">{step.value.toLocaleString()}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{step.label}</p>
                    {idx > 0 && arr[idx - 1].value > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {((step.value / arr[idx - 1].value) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  {idx < arr.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 排行榜 */}
      {leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">推廣者排行榜</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {idx + 1}
                    </span>
                    <div>
                      <Link href={`/admin/promoters/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {getPromoterTypeLabel(p.type)} · {p.referralCode}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{p.successCount + p.trialConverted} 次成功</p>
                    <p className="text-sm text-muted-foreground">
                      NT$ {Number(p.totalReward).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 推廣者列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">推廣者列表</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋..."
                  className="pl-9 w-48"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                />
              </div>
              <Select
                value={filters.type || 'all'}
                onValueChange={(v) => setFilters((f) => ({ ...f, type: v === 'all' ? '' : v, page: 1 }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部類型</SelectItem>
                  <SelectItem value="INTERNAL">訂閱者</SelectItem>
                  <SelectItem value="EXTERNAL">外部推廣者</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.status || 'all'}
                onValueChange={(v) => setFilters((f) => ({ ...f, status: v === 'all' ? '' : v, page: 1 }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="ACTIVE">活躍中</SelectItem>
                  <SelectItem value="PENDING">待審核</SelectItem>
                  <SelectItem value="SUSPENDED">已停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>類型</TableHead>
                <TableHead>推廣碼</TableHead>
                <TableHead className="text-right">成功數</TableHead>
                <TableHead className="text-right">試用發放</TableHead>
                <TableHead className="text-right">試用轉換</TableHead>
                <TableHead>獎勵方案</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>建立時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    載入中...
                  </TableCell>
                </TableRow>
              ) : promoters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    尚無推廣者
                  </TableCell>
                </TableRow>
              ) : (
                promoters.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/promoters/${p.id}`)}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getPromoterTypeLabel(p.type)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{p.referralCode}</TableCell>
                    <TableCell className="text-right">{p.successCount}</TableCell>
                    <TableCell className="text-right">{p._count?.trialInvites || 0}</TableCell>
                    <TableCell className="text-right">{p.trialConvertedCount}</TableCell>
                    <TableCell>
                      {p.rewardConfig ? getRewardTypeLabel(p.rewardConfig.rewardType) : '---'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(p.status)}>
                        {getPromoterStatusLabel(p.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(p.createdAt), 'yyyy/MM/dd')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 分頁 */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                共 {pagination.total} 筆，第 {pagination.page} / {pagination.totalPages} 頁
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                >
                  上一頁
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                >
                  下一頁
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
