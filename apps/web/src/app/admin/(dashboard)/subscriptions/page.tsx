'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Clock,
  XCircle,
  Pencil,
  Download,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { adminSubscriptionsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const statusLabels: Record<string, string> = {
  TRIAL: '試用中',
  ACTIVE: '訂閱中',
  PAST_DUE: '逾期',
  CANCELLED: '已取消',
  EXPIRED: '已過期',
};

const statusColors: Record<string, string> = {
  TRIAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  PAST_DUE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
};

export default function AdminSubscriptionsPage() {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  // Dialogs
  const [extendDialog, setExtendDialog] = useState<{ open: boolean; sub: any; days: number }>({
    open: false,
    sub: null,
    days: 7,
  });
  const [changePlanDialog, setChangePlanDialog] = useState<{ open: boolean; sub: any; planId: string }>({
    open: false,
    sub: null,
    planId: '',
  });

  useEffect(() => {
    loadData();
  }, [pagination.page, statusFilter, planFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (statusFilter !== 'all') params.status = statusFilter;
      if (planFilter !== 'all') params.planCode = planFilter;

      const [subsData, statsData, plansData] = await Promise.all([
        adminSubscriptionsApi.getSubscriptions(params),
        adminSubscriptionsApi.getStats(),
        adminSubscriptionsApi.getPlans(),
      ]);

      setSubscriptions(subsData.data);
      setPagination((prev) => ({ ...prev, ...subsData.pagination }));
      setStats(statsData);
      setPlans(plansData);
    } catch (error) {
      console.error('載入訂閱失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!extendDialog.sub) return;

    try {
      await adminSubscriptionsApi.extendTrial(extendDialog.sub.id, extendDialog.days);
      toast({ title: '已延長試用期', description: `延長 ${extendDialog.days} 天` });
      setExtendDialog({ open: false, sub: null, days: 7 });
      loadData();
    } catch (error: any) {
      toast({ title: '操作失敗', description: error.message, variant: 'destructive' });
    }
  };

  const handleChangePlan = async () => {
    if (!changePlanDialog.sub || !changePlanDialog.planId) return;

    try {
      await adminSubscriptionsApi.updatePlan(changePlanDialog.sub.id, changePlanDialog.planId);
      toast({ title: '已變更方案' });
      setChangePlanDialog({ open: false, sub: null, planId: '' });
      loadData();
    } catch (error: any) {
      toast({ title: '操作失敗', description: error.message, variant: 'destructive' });
    }
  };

  const handleCancel = async (sub: any) => {
    try {
      await adminSubscriptionsApi.cancelSubscription(sub.id, '管理員取消');
      toast({ title: '已取消訂閱' });
      loadData();
    } catch (error: any) {
      toast({ title: '操作失敗', description: error.message, variant: 'destructive' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">訂閱管理</h1>
          <p className="text-muted-foreground">管理使用者訂閱與方案</p>
        </div>
        <Button variant="outline" onClick={() => {
          const isDemoMode = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
          if (isDemoMode) { return; }
          const params = new URLSearchParams();
          if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
          window.open(`/api/v1/admin/subscriptions/export?${params.toString()}`, '_blank');
        }}>
          <Download className="h-4 w-4 mr-2" />
          匯出報表
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">試用中</p>
              <p className="text-2xl font-bold text-blue-600">{stats.byStatus?.trial || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">訂閱中</p>
              <p className="text-2xl font-bold text-green-600">{stats.byStatus?.active || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">已取消</p>
              <p className="text-2xl font-bold text-gray-600">{stats.byStatus?.cancelled || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">已過期</p>
              <p className="text-2xl font-bold text-red-600">{stats.byStatus?.expired || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">即將到期</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.expiringIn7Days || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="訂閱狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="TRIAL">試用中</SelectItem>
                <SelectItem value="ACTIVE">訂閱中</SelectItem>
                <SelectItem value="PAST_DUE">逾期</SelectItem>
                <SelectItem value="CANCELLED">已取消</SelectItem>
                <SelectItem value="EXPIRED">已過期</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="方案" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部方案</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.code} value={plan.code}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">使用者</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">方案</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">狀態</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">到期日</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">剩餘天數</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{sub.user.name}</p>
                          <p className="text-sm text-gray-500">{sub.user.email || '-'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{sub.plan.name}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[sub.status]}>
                          {statusLabels[sub.status] || sub.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {formatDate(sub.currentPeriodEnd)}
                      </td>
                      <td className="py-3 px-4">
                        {['TRIAL', 'ACTIVE'].includes(sub.status) ? (
                          <span
                            className={`font-medium ${
                              getDaysRemaining(sub.currentPeriodEnd) <= 7
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {getDaysRemaining(sub.currentPeriodEnd)} 天
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/users/${sub.user.id}`}>
                                查看使用者
                              </Link>
                            </DropdownMenuItem>
                            {sub.status === 'TRIAL' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setExtendDialog({ open: true, sub, days: 7 })
                                }
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                延長試用
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                setChangePlanDialog({
                                  open: true,
                                  sub,
                                  planId: sub.plan.id,
                                })
                              }
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              變更方案
                            </DropdownMenuItem>
                            {['TRIAL', 'ACTIVE'].includes(sub.status) && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleCancel(sub)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                取消訂閱
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {subscriptions.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  沒有符合條件的訂閱
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                共 {pagination.total} 筆
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
        </CardContent>
      </Card>

      {/* Extend Trial Dialog */}
      <Dialog
        open={extendDialog.open}
        onOpenChange={(open) => setExtendDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>延長試用期</DialogTitle>
            <DialogDescription>
              為 {extendDialog.sub?.user.name} 延長試用期天數
            </DialogDescription>
          </DialogHeader>
          <Select
            value={String(extendDialog.days)}
            onValueChange={(v) =>
              setExtendDialog((prev) => ({ ...prev, days: Number(v) }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 天</SelectItem>
              <SelectItem value="7">7 天</SelectItem>
              <SelectItem value="14">14 天</SelectItem>
              <SelectItem value="30">30 天</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendDialog({ open: false, sub: null, days: 7 })}
            >
              取消
            </Button>
            <Button onClick={handleExtendTrial}>確定延長</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog
        open={changePlanDialog.open}
        onOpenChange={(open) => setChangePlanDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>變更方案</DialogTitle>
            <DialogDescription>
              為 {changePlanDialog.sub?.user.name} 變更訂閱方案
            </DialogDescription>
          </DialogHeader>
          <Select
            value={changePlanDialog.planId}
            onValueChange={(v) =>
              setChangePlanDialog((prev) => ({ ...prev, planId: v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇方案" />
            </SelectTrigger>
            <SelectContent>
              {plans
                .filter((p) => p.code !== 'FREE_TRIAL')
                .map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - NT$ {plan.price.toLocaleString()}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setChangePlanDialog({ open: false, sub: null, planId: '' })
              }
            >
              取消
            </Button>
            <Button onClick={handleChangePlan} disabled={!changePlanDialog.planId}>
              確定變更
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
