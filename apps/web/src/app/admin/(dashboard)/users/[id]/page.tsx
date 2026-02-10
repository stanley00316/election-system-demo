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
  Download,
  BarChart3,
  Users,
  Contact,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getStanceLabel, getContactOutcomeLabel, getContactTypeLabel } from '@/lib/utils';
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
  const [campaignStats, setCampaignStats] = useState<any>(null);
  const [payments, setPayments] = useState<any>(null);
  const [referrals, setReferrals] = useState<any>(null);
  const [voters, setVoters] = useState<any>(null);
  const [contacts, setContacts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [activeTab, setActiveTab] = useState('campaign-stats');

  const STANCE_COLORS: Record<string, string> = {
    STRONG_SUPPORT: '#15803d', SUPPORT: '#22c55e', LEAN_SUPPORT: '#86efac',
    NEUTRAL: '#9ca3af', UNDECIDED: '#d1d5db',
    LEAN_OPPOSE: '#fca5a5', OPPOSE: '#ef4444', STRONG_OPPOSE: '#991b1b',
  };

  // 目前登入者是否為超級管理員
  const isMeSuperAdmin = !!currentUser?.isSuperAdmin;

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [userData, activityData, statsData] = await Promise.all([
        adminUsersApi.getUser(userId),
        adminUsersApi.getUserActivity(userId, { limit: 50 }),
        adminUsersApi.getUserCampaignStats(userId),
      ]);
      setUser(userData);
      setActivity(activityData.data || []);
      setCampaignStats(statsData);
    } catch (error) {
      console.error('載入使用者失敗:', error);
      toast({ title: '載入失敗', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // 延遲載入分頁資料
  const loadTabData = async (tab: string) => {
    try {
      if (tab === 'payments' && !payments) {
        const data = await adminUsersApi.getUserPayments(userId, { page: 1, limit: 50 });
        setPayments(data);
      } else if (tab === 'referrals' && !referrals) {
        const data = await adminUsersApi.getUserReferrals(userId);
        setReferrals(data);
      } else if (tab === 'voters' && !voters) {
        const data = await adminUsersApi.getUserVoters(userId, { page: 1, limit: 50 });
        setVoters(data);
      } else if (tab === 'contacts' && !contacts) {
        const data = await adminUsersApi.getUserContacts(userId, { page: 1, limit: 50 });
        setContacts(data);
      }
    } catch (error) {
      console.error('載入分頁資料失敗:', error);
    }
  };

  const handleExport = () => {
    const isDemoMode = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
    if (isDemoMode) {
      toast({ title: '示範模式不支援匯出', description: '請連接後端後使用匯出功能' });
      return;
    }
    window.open(`/api/v1/admin/users/${userId}/export`, '_blank');
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
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            匯出完整資料
          </Button>
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

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); loadTabData(v); }}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="campaign-stats">選情概覽</TabsTrigger>
          <TabsTrigger value="subscription">訂閱資訊</TabsTrigger>
          <TabsTrigger value="campaigns">選舉活動</TabsTrigger>
          <TabsTrigger value="payments">付款歷史</TabsTrigger>
          <TabsTrigger value="referrals">推薦關係</TabsTrigger>
          <TabsTrigger value="voters">選民名單</TabsTrigger>
          <TabsTrigger value="contacts">接觸紀錄</TabsTrigger>
          <TabsTrigger value="activity">活動記錄</TabsTrigger>
        </TabsList>

        {/* 選情概覽 Tab */}
        <TabsContent value="campaign-stats" className="space-y-4">
          {campaignStats?.summary?.totalCampaigns > 0 ? (
            <>
              {/* 統計卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold">{campaignStats.summary.totalVoters}</p>
                  <p className="text-sm text-gray-500">選民總數</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-green-600">{campaignStats.summary.overallSupportRate}%</p>
                  <p className="text-sm text-gray-500">支持率</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-blue-600">{campaignStats.summary.overallContactRate}%</p>
                  <p className="text-sm text-gray-500">接觸率</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold">{campaignStats.summary.totalCampaigns}</p>
                  <p className="text-sm text-gray-500">活動數量</p>
                </CardContent></Card>
              </div>

              {/* 圖表區 */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* 支持度分佈 */}
                <Card>
                  <CardHeader><CardTitle className="text-base">支持度分佈</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={Object.entries(campaignStats.stanceDistribution || {}).filter(([, v]) => (v as number) > 0).map(([key, value]) => ({
                            name: getStanceLabel(key),
                            value: value as number,
                            fill: STANCE_COLORS[key] || '#9ca3af',
                          }))}
                          cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {Object.entries(campaignStats.stanceDistribution || {}).filter(([, v]) => (v as number) > 0).map(([key]) => (
                            <Cell key={key} fill={STANCE_COLORS[key] || '#9ca3af'} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 接觸結果分佈 */}
                <Card>
                  <CardHeader><CardTitle className="text-base">接觸結果分佈</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={Object.entries(campaignStats.contactOutcomeDistribution || {}).map(([key, value]) => ({
                        name: getContactOutcomeLabel(key),
                        數量: value,
                      }))} layout="vertical">
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="數量" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* 接觸類型統計 */}
              <Card>
                <CardHeader><CardTitle className="text-base">接觸類型統計</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={Object.entries(campaignStats.contactTypeDistribution || {}).map(([key, value]) => ({
                      name: getContactTypeLabel(key),
                      數量: value,
                    }))} layout="vertical">
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="數量" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 各活動選情摘要 */}
              <Card>
                <CardHeader><CardTitle className="text-base">各活動選情摘要</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">活動名稱</th>
                          <th className="text-left p-2">城市</th>
                          <th className="text-right p-2">選民數</th>
                          <th className="text-right p-2">接觸數</th>
                          <th className="text-right p-2">支持率</th>
                          <th className="text-right p-2">接觸率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaignStats.campaignBreakdown?.map((c: any) => (
                          <tr key={c.campaignId} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{c.campaignName}</td>
                            <td className="p-2 text-gray-500">{c.city}</td>
                            <td className="p-2 text-right">{c.voterCount}</td>
                            <td className="p-2 text-right">{c.contactCount}</td>
                            <td className="p-2 text-right">
                              <span className={`font-medium ${c.supportRate >= 40 ? 'text-green-600' : c.supportRate >= 25 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {c.supportRate}%
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              <span className="text-blue-600 font-medium">{c.contactRate}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="py-8 text-center text-gray-500">此使用者尚無選舉活動數據</CardContent></Card>
          )}
        </TabsContent>

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

          {user.subscriptions?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>訂閱歷史</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user.subscriptions.map((sub: any) => (
                    <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{sub.plan.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(sub.currentPeriodStart)} - {formatDate(sub.currentPeriodEnd)}
                        </p>
                      </div>
                      <Badge variant={sub.status === 'ACTIVE' ? 'default' : sub.status === 'TRIAL' ? 'secondary' : 'outline'}>
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
                擁有 {user.campaigns?.length || 0} 個活動
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.campaigns?.length > 0 ? (
                <div className="space-y-4">
                  {user.campaigns.map((campaign: any) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-gray-500">
                          {campaign.city}{campaign.district ? ` · ${campaign.district}` : ''} · {campaign._count?.voters || 0} 選民 · {campaign._count?.contacts || 0} 接觸 · {campaign._count?.teamMembers || 0} 團隊成員
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

        {/* 付款歷史 Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle>付款歷史</CardTitle></CardHeader>
            <CardContent>
              {payments?.data?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">方案</th>
                        <th className="text-right p-2">金額</th>
                        <th className="text-left p-2">狀態</th>
                        <th className="text-left p-2">支付方式</th>
                        <th className="text-left p-2">付款時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.data.map((p: any) => (
                        <tr key={p.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{p.subscription?.plan?.name || '-'}</td>
                          <td className="p-2 text-right font-medium">NT$ {p.amount?.toLocaleString()}</td>
                          <td className="p-2"><Badge variant="outline">{p.status}</Badge></td>
                          <td className="p-2 text-gray-500">{p.provider || '-'}</td>
                          <td className="p-2 text-gray-500">{p.paidAt ? formatDate(p.paidAt) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">{payments ? '尚無付款記錄' : '載入中...'}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 推薦關係 Tab */}
        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>作為推薦人</CardTitle></CardHeader>
            <CardContent>
              {referrals?.asReferrer?.length > 0 ? (
                <div className="space-y-3">
                  {referrals.asReferrer.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{r.referred?.name || '未知'}</p>
                        <p className="text-sm text-gray-500">{r.referred?.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.status === 'COMPLETED' ? 'default' : 'outline'}>{r.status}</Badge>
                        {r.rewardMonths > 0 && <span className="text-sm text-green-600">+{r.rewardMonths} 個月</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">{referrals ? '無推薦記錄' : '載入中...'}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>作為被推薦人</CardTitle></CardHeader>
            <CardContent>
              {referrals?.asReferred?.length > 0 ? (
                <div className="space-y-3">
                  {referrals.asReferred.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">推薦人：{r.referrer?.name || '未知'}</p>
                        <p className="text-sm text-gray-500">{r.referrer?.email} · 推薦碼：{r.referralCode}</p>
                      </div>
                      <Badge variant={r.status === 'COMPLETED' ? 'default' : 'outline'}>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">{referrals ? '未被推薦' : '載入中...'}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 選民名單 Tab */}
        <TabsContent value="voters">
          <Card>
            <CardHeader>
              <CardTitle>選民名單</CardTitle>
              <CardDescription>此使用者所有活動的選民（顯示前 50 筆）</CardDescription>
            </CardHeader>
            <CardContent>
              {voters?.data?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">姓名</th>
                        <th className="text-left p-2">電話</th>
                        <th className="text-left p-2">所屬活動</th>
                        <th className="text-left p-2">政治傾向</th>
                        <th className="text-right p-2">接觸次數</th>
                        <th className="text-left p-2">最後接觸</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voters.data.map((v: any) => (
                        <tr key={v.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{v.name}</td>
                          <td className="p-2 text-gray-500">{v.phone || '-'}</td>
                          <td className="p-2 text-gray-500">{v.campaignName}</td>
                          <td className="p-2">
                            <Badge variant="outline" style={{ borderColor: STANCE_COLORS[v.stance] || '#9ca3af', color: STANCE_COLORS[v.stance] || '#9ca3af' }}>
                              {getStanceLabel(v.stance)}
                            </Badge>
                          </td>
                          <td className="p-2 text-right">{v.contactCount || 0}</td>
                          <td className="p-2 text-gray-500">{v.lastContactAt ? new Date(v.lastContactAt).toLocaleDateString('zh-TW') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {voters.pagination?.total > 50 && (
                    <p className="text-center py-2 text-sm text-gray-400">共 {voters.pagination.total} 筆，僅顯示前 50 筆</p>
                  )}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">{voters ? '尚無選民資料' : '載入中...'}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 接觸紀錄 Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>接觸紀錄</CardTitle>
              <CardDescription>此使用者所有活動的接觸紀錄（顯示前 50 筆）</CardDescription>
            </CardHeader>
            <CardContent>
              {contacts?.data?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">選民</th>
                        <th className="text-left p-2">接觸類型</th>
                        <th className="text-left p-2">結果</th>
                        <th className="text-left p-2">活動</th>
                        <th className="text-left p-2">日期</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.data.map((c: any) => (
                        <tr key={c.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{c.voter?.name || '-'}</td>
                          <td className="p-2">{getContactTypeLabel(c.type)}</td>
                          <td className="p-2">
                            <Badge variant={c.outcome === 'POSITIVE' ? 'default' : c.outcome === 'NEGATIVE' ? 'destructive' : 'outline'}>
                              {getContactOutcomeLabel(c.outcome)}
                            </Badge>
                          </td>
                          <td className="p-2 text-gray-500">{c.campaignName}</td>
                          <td className="p-2 text-gray-500">{c.contactDate ? new Date(c.contactDate).toLocaleDateString('zh-TW') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {contacts.pagination?.total > 50 && (
                    <p className="text-center py-2 text-sm text-gray-400">共 {contacts.pagination.total} 筆，僅顯示前 50 筆</p>
                  )}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">{contacts ? '尚無接觸紀錄' : '載入中...'}</p>
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
                    <div key={log.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{log.action}</span>
                          <span className="text-gray-500"> · {log.entity}</span>
                        </p>
                        {log.details && (
                          <p className="text-xs text-gray-400 truncate">{JSON.stringify(log.details)}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(log.createdAt)}</span>
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
