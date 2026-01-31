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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminUsersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const userId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">使用者詳情</h1>
        </div>
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
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{user.name}</h2>
                {user.isSuspended ? (
                  <Badge variant="destructive">已停用</Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    正常
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
