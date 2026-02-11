'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, TestTube, CheckCircle, Clock, TrendingUp,
  AlertTriangle, XCircle, Search, MoreHorizontal,
} from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { adminPromotersApi } from '@/lib/api';
import { getTrialInviteStatusLabel, getTrialInviteMethodLabel, getShareChannelLabel } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';

export default function TrialManagementPage() {
  return (
    <SuperAdminGuard>
      <TrialManagementContent />
    </SuperAdminGuard>
  );
}

function TrialManagementContent() {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [trials, setTrials] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '', page: 1 });
  const [extendDialog, setExtendDialog] = useState<{ open: boolean; trialId: string; days: number }>({
    open: false, trialId: '', days: 7,
  });

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadTrials(); }, [filters]);

  const loadStats = async () => {
    try {
      const data = await adminPromotersApi.getTrialStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load trial stats:', error);
    }
  };

  const loadTrials = async () => {
    setIsLoading(true);
    try {
      const params: any = { page: filters.page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const result = await adminPromotersApi.getAllTrialInvites(params);
      setTrials(result.data);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Failed to load trials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (trialId: string) => {
    try {
      await adminPromotersApi.cancelTrialInvite(trialId);
      toast({ title: '已取消試用邀請' });
      loadTrials();
      loadStats();
    } catch (error) {
      toast({ title: '操作失敗', variant: 'destructive' });
    }
  };

  const handleExtend = async () => {
    try {
      await adminPromotersApi.extendTrialInvite(extendDialog.trialId, extendDialog.days);
      toast({ title: `已延長 ${extendDialog.days} 天` });
      setExtendDialog({ open: false, trialId: '', days: 7 });
      loadTrials();
      loadStats();
    } catch (error) {
      toast({ title: '操作失敗', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
      ACTIVATED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
      ACTIVE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
      EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      CONVERTED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton href="/admin/promoters" />
        <div>
          <h1 className="text-2xl font-bold">試用管理</h1>
          <p className="text-muted-foreground">管理所有推廣者發放的試用邀請</p>
        </div>
      </div>

      {/* 統計卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { icon: TestTube, label: '總發放數', value: stats.total, color: '' },
            { icon: CheckCircle, label: '已啟用', value: stats.activated, color: 'text-blue-600' },
            { icon: Clock, label: '試用中', value: stats.active, color: 'text-purple-600' },
            { icon: TrendingUp, label: '已轉付費', value: stats.converted, color: 'text-green-600' },
            { icon: XCircle, label: '已過期', value: stats.expired, color: 'text-red-600' },
            { icon: AlertTriangle, label: '即將到期', value: stats.expiringSoon, color: 'text-orange-600' },
            { icon: TrendingUp, label: '轉換率', value: `${stats.conversionRate}%`, color: 'text-emerald-600' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </div>
                <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 試用列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">全部試用紀錄</CardTitle>
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
                value={filters.status || 'all'}
                onValueChange={(v) => setFilters((f) => ({ ...f, status: v === 'all' ? '' : v, page: 1 }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="PENDING">待啟用</SelectItem>
                  <SelectItem value="ACTIVE">試用中</SelectItem>
                  <SelectItem value="CONVERTED">已轉付費</SelectItem>
                  <SelectItem value="EXPIRED">已過期</SelectItem>
                  <SelectItem value="CANCELLED">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>邀請碼</TableHead>
                <TableHead>試用者</TableHead>
                <TableHead>推廣者</TableHead>
                <TableHead>方式</TableHead>
                <TableHead>天數</TableHead>
                <TableHead>啟用時間</TableHead>
                <TableHead>到期時間</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">載入中...</TableCell>
                </TableRow>
              ) : trials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">尚無試用紀錄</TableCell>
                </TableRow>
              ) : trials.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-sm">{t.code}</TableCell>
                  <TableCell>{t.activatedUser?.name || t.inviteeName || '(未啟用)'}</TableCell>
                  <TableCell>
                    <Link href={`/admin/promoters/${t.promoter.id}`} className="text-primary hover:underline">
                      {t.promoter.name}
                    </Link>
                  </TableCell>
                  <TableCell>{getTrialInviteMethodLabel(t.inviteMethod)}</TableCell>
                  <TableCell>{t.trialDays} 天</TableCell>
                  <TableCell className="text-sm">{t.activatedAt ? format(new Date(t.activatedAt), 'MM/dd') : '---'}</TableCell>
                  <TableCell className="text-sm">
                    {t.expiresAt ? (
                      <span className={new Date(t.expiresAt) < new Date(Date.now() + 3 * 86400000) && ['ACTIVATED', 'ACTIVE'].includes(t.status) ? 'text-orange-600 font-medium' : ''}>
                        {format(new Date(t.expiresAt), 'MM/dd')}
                      </span>
                    ) : '---'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(t.status)}>
                      {getTrialInviteStatusLabel(t.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {['ACTIVATED', 'ACTIVE', 'PENDING', 'SENT'].includes(t.status) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {['ACTIVATED', 'ACTIVE'].includes(t.status) && (
                            <DropdownMenuItem onClick={() => setExtendDialog({ open: true, trialId: t.id, days: 7 })}>
                              延長試用
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleCancel(t.id)} className="text-red-600">
                            取消試用
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                共 {pagination.total} 筆，第 {pagination.page} / {pagination.totalPages} 頁
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagination.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
                  上一頁
                </Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
                  下一頁
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 延長試用對話框 */}
      <Dialog open={extendDialog.open} onOpenChange={(open) => setExtendDialog((d) => ({ ...d, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>延長試用期限</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">延長天數</label>
            <Select
              value={String(extendDialog.days)}
              onValueChange={(v) => setExtendDialog((d) => ({ ...d, days: parseInt(v, 10) }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 天</SelectItem>
                <SelectItem value="7">7 天</SelectItem>
                <SelectItem value="14">14 天</SelectItem>
                <SelectItem value="30">30 天</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialog({ open: false, trialId: '', days: 7 })}>
              取消
            </Button>
            <Button onClick={handleExtend}>確認延長</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
