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
  UserX,
  UserCheck,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { adminUsersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');

  // Dialog state
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; user: any; reason: string }>({
    open: false,
    user: null,
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, [pagination.page, statusFilter, subscriptionFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (search) params.search = search;
      if (statusFilter === 'suspended') params.isSuspended = true;
      if (statusFilter === 'active') params.isSuspended = false;
      if (subscriptionFilter === 'with') params.hasSubscription = true;
      if (subscriptionFilter === 'without') params.hasSubscription = false;
      if (['TRIAL', 'ACTIVE', 'EXPIRED'].includes(subscriptionFilter)) {
        params.subscriptionStatus = subscriptionFilter;
      }

      const [usersData, statsData] = await Promise.all([
        adminUsersApi.getUsers(params),
        adminUsersApi.getStats(),
      ]);

      setUsers(usersData.data);
      setPagination((prev) => ({ ...prev, ...usersData.pagination }));
      setStats(statsData);
    } catch (error) {
      console.error('載入使用者失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadData();
  };

  const handleSuspend = async () => {
    if (!suspendDialog.user || !suspendDialog.reason) return;

    try {
      await adminUsersApi.suspendUser(suspendDialog.user.id, suspendDialog.reason);
      toast({ title: '已停用帳號', description: `${suspendDialog.user.name} 的帳號已被停用` });
      setSuspendDialog({ open: false, user: null, reason: '' });
      loadData();
    } catch (error: any) {
      toast({ title: '操作失敗', description: error.message, variant: 'destructive' });
    }
  };

  const handleActivate = async (user: any) => {
    try {
      await adminUsersApi.activateUser(user.id);
      toast({ title: '已啟用帳號', description: `${user.name} 的帳號已恢復正常` });
      loadData();
    } catch (error: any) {
      toast({ title: '操作失敗', description: error.message, variant: 'destructive' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">使用者管理</h1>
          <p className="text-gray-500">管理系統使用者帳號</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">總使用者</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">活躍使用者</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">試用中</p>
              <p className="text-2xl font-bold text-blue-600">{stats.trialUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">付費用戶</p>
              <p className="text-2xl font-bold text-purple-600">{stats.paidUsers}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜尋姓名、Email、電話..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="帳號狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="active">正常</SelectItem>
                <SelectItem value="suspended">已停用</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="訂閱狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="with">有訂閱</SelectItem>
                <SelectItem value="without">無訂閱</SelectItem>
                <SelectItem value="TRIAL">試用中</SelectItem>
                <SelectItem value="ACTIVE">訂閱中</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Filter className="h-4 w-4 mr-2" />
              篩選
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
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
                    <th className="text-left py-3 px-4 font-medium text-gray-500">聯絡資訊</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">訂閱</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">狀態</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">註冊日期</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="font-medium">{user.name?.charAt(0)}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-gray-500">
                              {user._count?.campaigns || 0} 選舉活動
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">{user.email || '-'}</p>
                        <p className="text-xs text-gray-500">{user.phone || '-'}</p>
                      </td>
                      <td className="py-3 px-4">
                        {user.currentSubscription ? (
                          <Badge
                            variant={
                              user.currentSubscription.status === 'ACTIVE'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {user.currentSubscription.plan.name}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">無訂閱</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {user.isSuspended ? (
                          <Badge variant="destructive">已停用</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            正常
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(user.createdAt)}
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
                              <Link href={`/admin/users/${user.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                查看詳情
                              </Link>
                            </DropdownMenuItem>
                            {user.isSuspended ? (
                              <DropdownMenuItem onClick={() => handleActivate(user)}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                啟用帳號
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  setSuspendDialog({ open: true, user, reason: '' })
                                }
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                停用帳號
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  沒有符合條件的使用者
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
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
        </CardContent>
      </Card>

      {/* Suspend Dialog */}
      <AlertDialog
        open={suspendDialog.open}
        onOpenChange={(open) =>
          setSuspendDialog((prev) => ({ ...prev, open, reason: open ? prev.reason : '' }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>停用帳號</AlertDialogTitle>
            <AlertDialogDescription>
              確定要停用 {suspendDialog.user?.name} 的帳號嗎？請填寫停用原因：
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="停用原因..."
            value={suspendDialog.reason}
            onChange={(e) =>
              setSuspendDialog((prev) => ({ ...prev, reason: e.target.value }))
            }
          />
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              disabled={!suspendDialog.reason}
              className="bg-red-600 hover:bg-red-700"
            >
              確定停用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
