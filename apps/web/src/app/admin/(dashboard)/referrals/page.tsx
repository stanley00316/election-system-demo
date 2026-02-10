'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Award,
  TrendingUp,
  Gift,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { adminReferralsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Stats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  expiredReferrals: number;
  totalRewardMonths: number;
  conversionRate: number;
  thisMonthReferrals: number;
  thisMonthCompleted: number;
}

interface Referral {
  id: string;
  referralCode: string;
  status: string;
  rewardMonths: number;
  rewardGrantedAt: string | null;
  createdAt: string;
  referrer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
  };
  referred: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    createdAt: string;
  };
}

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  completedReferrals: number;
  totalRewardMonths: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: '等待付款', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  EXPIRED: { label: '已過期', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

export default function AdminReferralsPage() {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpiringOld, setIsExpiringOld] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, [pagination.page, statusFilter, startDate, endDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [referralsData, statsData, leaderboardData] = await Promise.all([
        adminReferralsApi.getReferrals(params),
        adminReferralsApi.getStats(),
        adminReferralsApi.getLeaderboard(5),
      ]);

      setReferrals(referralsData.data);
      setPagination((prev) => ({ ...prev, ...referralsData.pagination }));
      setStats(statsData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('載入推薦資料失敗:', error);
      toast({
        title: '載入失敗',
        description: '無法載入推薦資料',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpireOld = async () => {
    setIsExpiringOld(true);
    try {
      const result = await adminReferralsApi.expireOld();
      toast({
        title: '處理完成',
        description: result.message,
      });
      loadData();
    } catch (error: any) {
      toast({
        title: '處理失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsExpiringOld(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">推薦管理</h1>
          <p className="text-gray-500">追蹤所有推薦紀錄與獎勵發放</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            const isDemoMode = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
            if (isDemoMode) { return; }
            const params = new URLSearchParams();
            if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
            window.open(`/api/v1/admin/referrals/export?${params.toString()}`, '_blank');
          }}>
            <Download className="h-4 w-4 mr-2" />
            匯出報表
          </Button>
          <Button
            variant="outline"
            onClick={handleExpireOld}
            disabled={isExpiringOld}
          >
            {isExpiringOld ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            過期舊推薦
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">總推薦數</p>
                  <p className="text-2xl font-bold">{stats.totalReferrals}</p>
                </div>
                <Users className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">已完成</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completedReferrals}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">轉換率</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.conversionRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">發放獎勵</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalRewardMonths} 個月</p>
                </div>
                <Award className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Secondary Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gray-50">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">等待中</p>
              <p className="text-xl font-semibold text-yellow-600">{stats.pendingReferrals}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-50">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">已過期</p>
              <p className="text-xl font-semibold text-gray-600">{stats.expiredReferrals}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-50">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">本月推薦</p>
              <p className="text-xl font-semibold">{stats.thisMonthReferrals}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-50">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">本月完成</p>
              <p className="text-xl font-semibold text-green-600">{stats.thisMonthCompleted}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              推薦排行榜
            </CardTitle>
            <CardDescription>推薦成功次數最多的使用者</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold ${
                          entry.rank === 1
                            ? 'bg-yellow-400 text-yellow-900'
                            : entry.rank === 2
                            ? 'bg-gray-300 text-gray-700'
                            : entry.rank === 3
                            ? 'bg-orange-300 text-orange-800'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {entry.rank}
                      </span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={entry.user.avatarUrl || undefined} />
                        <AvatarFallback>{entry.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{entry.user.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{entry.completedReferrals} 人</p>
                      <p className="text-xs text-gray-500">+{entry.totalRewardMonths} 個月</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">尚無資料</p>
            )}
          </CardContent>
        </Card>

        {/* Referrals Table */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>推薦紀錄</CardTitle>
                <CardDescription>所有推薦關係與獎勵狀態</CardDescription>
              </div>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="PENDING">等待付款</SelectItem>
                  <SelectItem value="COMPLETED">已完成</SelectItem>
                  <SelectItem value="EXPIRED">已過期</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
                placeholder="開始日期"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
                placeholder="結束日期"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : referrals.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>推薦人</TableHead>
                      <TableHead>被推薦人</TableHead>
                      <TableHead>推薦碼</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>獎勵</TableHead>
                      <TableHead>建立時間</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((referral) => {
                      const StatusIcon = statusConfig[referral.status]?.icon || Clock;
                      return (
                        <TableRow key={referral.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={referral.referrer.avatarUrl || undefined} />
                                <AvatarFallback>
                                  {referral.referrer.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{referral.referrer.name}</p>
                                <p className="text-xs text-gray-500">
                                  {referral.referrer.email || referral.referrer.phone || '-'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={referral.referred.avatarUrl || undefined} />
                                <AvatarFallback>
                                  {referral.referred.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{referral.referred.name}</p>
                                <p className="text-xs text-gray-500">
                                  {referral.referred.email || referral.referred.phone || '-'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {referral.referralCode}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig[referral.status]?.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[referral.status]?.label || referral.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {referral.status === 'COMPLETED' ? (
                              <span className="text-green-600 font-medium">
                                +{referral.rewardMonths} 個月
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {formatDateTime(referral.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                      共 {pagination.total} 筆，第 {pagination.page} / {pagination.totalPages} 頁
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                        disabled={pagination.page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                        disabled={pagination.page >= pagination.totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Gift className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">尚無推薦紀錄</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
