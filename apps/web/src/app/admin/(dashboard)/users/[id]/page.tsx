'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Activity,
  UserX,
  UserCheck,
  Shield,
  ShieldOff,
  Megaphone,
} from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { adminUsersApi, adminAuthApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const userId = params.id as string;

  const currentUser = useAuthStore((s) => s.user);
  const [user, setUser] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // 目前登入者是否為超級管理員
  const isMeSuperAdmin = !!currentUser?.isSuperAdmin;

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [userData, activityData] = await Promise.all([
        adminUsersApi.getUser(userId),
        adminUsersApi.getUserActivity(userId, { limit: 50 }),
      ]);
      setUser(userData);
      setActivity(activityData.data || []);
    } catch (error) {
      console.error('載入使用者失敗:', error);
      toast({ title: '載入失敗', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!user) return;

    try {
      if (user.isSuspended) {
        await adminUsersApi.activateUser(userId);
        toast({ title: '已啟用帳號' });
      } else {
        await adminUsersApi.suspendUser(userId, '管理員手動停用');
        toast({ title: '已停用帳號' });
      }
      loadData();
    } catch (error: any) {
      toast({ title: '操作失敗', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleAdmin = async () => {
    if (!user) return;
    setIsToggling(true);
    try {
      if (user.isAdmin) {
        await adminAuthApi.removeAdmin(userId);
        toast({ title: '已移除管理員權限', description: `${user.name} 不再是管理員` });
      } else {
        await adminAuthApi.assignAdmin(userId);
        toast({ title: '已指派為管理員', description: `${user.name} 已成為管理員` });
      }
      loadData();
    } catch (error: any) {
      toast({
        title: '操作失敗',
        description: error?.message || '權限變更時發生錯誤',
        variant: 'destructive',
      });
    } finally {
      setIsToggling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
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

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">使用者不存在</p>
      </div>
    );
  }

  const currentSubscription = user.subscriptions?.find(
    (s: any) => s.status === 'TRIAL' || s.status === 'ACTIVE'
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton href="/admin/users" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">使用者詳情</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={user.isSuspended ? 'default' : 'destructive'}
            onClick={handleToggleSuspend}
          >
            {user.isSuspended ? (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                啟用帳號
              </>
            ) : (
              <>
                <UserX className="h-4 w-4 mr-2" />
                停用帳號
              </>
            )}
          </Button>
        </div>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-20 w-20 rounded-full"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-10 w-10 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold">{user.name}</h2>
                {user.isSuspended ? (
                  <Badge variant="destructive">已停用</Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    正常
                  </Badge>
                )}
                {user.isSuperAdmin && (
                  <Badge className="bg-purple-600 text-white">超級管理員</Badge>
                )}
                {user.isAdmin && !user.isSuperAdmin && (
                  <Badge className="bg-blue-600 text-white">管理員</Badge>
                )}
                {user.promoter?.isActive && (
                  <Badge className="bg-orange-500 text-white">
                    <Megaphone className="h-3 w-3 mr-1" />
                    推廣者
                  </Badge>
                )}
              </div>
              <div className="mt-2 space-y-1 text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{user.email || '未設定'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{user.phone || '未設定'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>註冊於 {formatDate(user.createdAt)}</span>
                </div>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold">{user._count?.contacts || 0}</p>
                <p className="text-sm text-gray-500">接觸記錄</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold">{user._count?.createdVoters || 0}</p>
                <p className="text-sm text-gray-500">建立選民</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 權限管理 - 僅超級管理員可見 */}
      {isMeSuperAdmin && !user.isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              權限管理
            </CardTitle>
            <CardDescription>
              管理此使用者的系統角色與權限
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 管理員權限 */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    user.isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">管理員權限</p>
                    <p className="text-sm text-gray-500">
                      {user.isAdmin
                        ? '此使用者可存取管理後台（使用者管理、訂閱管理、數據分析等）'
                        : '授予管理員權限後，此使用者可登入管理後台'}
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant={user.isAdmin ? 'destructive' : 'default'}
                      size="sm"
                      disabled={isToggling}
                    >
                      {isToggling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : user.isAdmin ? (
                        <>
                          <ShieldOff className="h-4 w-4 mr-2" />
                          移除管理員
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          指派為管理員
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {user.isAdmin ? '確認移除管理員權限？' : '確認指派為管理員？'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {user.isAdmin
                          ? `移除後，${user.name} 將無法存取管理後台，僅保留一般使用者功能。此操作可隨時撤銷。`
                          : `指派後，${user.name} 將可存取管理後台，包括使用者管理、訂閱管理、付款管理與數據分析。此操作可隨時撤銷。`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={handleToggleAdmin}>
                        {user.isAdmin ? '確認移除' : '確認指派'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* 推廣者狀態（唯讀顯示） */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    user.promoter?.isActive ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">推廣者身份</p>
                    <p className="text-sm text-gray-500">
                      {user.promoter?.isActive
                        ? `推廣碼：${user.promoter.referralCode || '---'}・狀態：活躍中`
                        : user.promoter
                        ? `狀態：${user.promoter.status === 'PENDING' ? '待審核' : user.promoter.status === 'SUSPENDED' ? '已停用' : user.promoter.status}`
                        : '尚未申請推廣者身份'}
                    </p>
                  </div>
                </div>
                {user.promoter ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/promoters/${user.promoter.id}`)}
                  >
                    查看詳情
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-gray-400">未申請</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="subscription">
        <TabsList>
          <TabsTrigger value="subscription">訂閱資訊</TabsTrigger>
          <TabsTrigger value="campaigns">選舉活動</TabsTrigger>
          <TabsTrigger value="activity">活動記錄</TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          {currentSubscription ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  目前訂閱
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">方案</p>
                    <p className="font-medium">{currentSubscription.plan.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">狀態</p>
                    <Badge>
                      {currentSubscription.status === 'TRIAL' ? '試用中' : '訂閱中'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">開始日期</p>
                    <p className="font-medium">
                      {formatDate(currentSubscription.currentPeriodStart)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">到期日期</p>
                    <p className="font-medium">
                      {formatDate(currentSubscription.currentPeriodEnd)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                此使用者目前沒有有效訂閱
              </CardContent>
            </Card>
          )}

          {/* Subscription History */}
          {user.subscriptions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>訂閱歷史</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user.subscriptions.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{sub.plan.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(sub.currentPeriodStart)} -{' '}
                          {formatDate(sub.currentPeriodEnd)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          sub.status === 'ACTIVE'
                            ? 'default'
                            : sub.status === 'TRIAL'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {sub.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>參與的選舉活動</CardTitle>
              <CardDescription>
                擁有 {user.campaigns?.length || 0} 個活動，參與{' '}
                {user.teamMembers?.length || 0} 個團隊
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.campaigns?.length > 0 ? (
                <div className="space-y-4">
                  {user.campaigns.map((campaign: any) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-gray-500">
                          {campaign.city} · {campaign._count?.voters || 0} 選民 ·{' '}
                          {campaign._count?.teamMembers || 0} 團隊成員
                        </p>
                      </div>
                      <Badge variant={campaign.isActive ? 'default' : 'secondary'}>
                        {campaign.isActive ? '進行中' : '已結束'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">尚無選舉活動</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                活動記錄
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length > 0 ? (
                <div className="space-y-3">
                  {activity.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{log.action}</span>
                          <span className="text-gray-500"> · {log.entity}</span>
                        </p>
                        {log.details && (
                          <p className="text-xs text-gray-400 truncate">
                            {JSON.stringify(log.details)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">尚無活動記錄</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
