'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Download,
  RotateCcw,
  DollarSign,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { adminPaymentsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const statusLabels: Record<string, string> = {
  PENDING: '待付款',
  PROCESSING: '處理中',
  COMPLETED: '已完成',
  FAILED: '失敗',
  REFUNDED: '已退款',
  CANCELLED: '已取消',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function AdminPaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');

  // Refund dialog
  const [refundDialog, setRefundDialog] = useState<{ open: boolean; payment: any }>({
    open: false,
    payment: null,
  });

  useEffect(() => {
    loadData();
  }, [pagination.page, statusFilter, providerFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (statusFilter !== 'all') params.status = statusFilter;
      if (providerFilter !== 'all') params.provider = providerFilter;

      const [paymentsData, statsData] = await Promise.all([
        adminPaymentsApi.getPayments(params),
        adminPaymentsApi.getStats(),
      ]);

      setPayments(paymentsData.data);
      setPagination((prev) => ({ ...prev, ...paymentsData.pagination }));
      setStats(statsData);
    } catch (error) {
      console.error('載入付款記錄失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundDialog.payment) return;

    try {
      await adminPaymentsApi.refundPayment(refundDialog.payment.id, '管理員退款');
      toast({ title: '退款成功' });
      setRefundDialog({ open: false, payment: null });
      loadData();
    } catch (error: any) {
      toast({ title: '退款失敗', description: error.message, variant: 'destructive' });
    }
  };

  const handleExport = () => {
    window.open(
      `/api/v1/admin/payments/export?status=${statusFilter}&provider=${providerFilter}`,
      '_blank'
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `NT$ ${amount.toLocaleString()}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">付款管理</h1>
          <p className="text-gray-500">查看與管理付款記錄</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          匯出報表
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">總營收</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalRevenue || 0)}
              </p>
            </CardContent>
          </Card>
          {stats.byStatus?.map((s: any) => (
            <Card key={s.status}>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">{statusLabels[s.status] || s.status}</p>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs text-gray-400">{formatCurrency(s.amount)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="付款狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="PENDING">待付款</SelectItem>
                <SelectItem value="PROCESSING">處理中</SelectItem>
                <SelectItem value="COMPLETED">已完成</SelectItem>
                <SelectItem value="FAILED">失敗</SelectItem>
                <SelectItem value="REFUNDED">已退款</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="支付方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="ECPAY">綠界 ECPay</SelectItem>
                <SelectItem value="NEWEBPAY">藍新金流</SelectItem>
                <SelectItem value="STRIPE">Stripe</SelectItem>
                <SelectItem value="MANUAL">人工處理</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">使用者</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">方案</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">金額</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">支付方式</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">狀態</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">付款時間</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{payment.subscription.user.name}</p>
                          <p className="text-sm text-gray-500">
                            {payment.subscription.user.email || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{payment.subscription.plan.name}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 px-4 text-sm">{payment.provider}</td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[payment.status]}>
                          {statusLabels[payment.status] || payment.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(payment.paidAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {payment.status === 'COMPLETED' && !payment.refundedAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRefundDialog({ open: true, payment })}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            退款
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {payments.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  沒有付款記錄
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">共 {pagination.total} 筆</p>
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

      {/* Refund Dialog */}
      <AlertDialog
        open={refundDialog.open}
        onOpenChange={(open) => setRefundDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認退款</AlertDialogTitle>
            <AlertDialogDescription>
              確定要退款 {formatCurrency(refundDialog.payment?.amount || 0)} 給{' '}
              {refundDialog.payment?.subscription.user.name} 嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefund} className="bg-red-600 hover:bg-red-700">
              確定退款
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
