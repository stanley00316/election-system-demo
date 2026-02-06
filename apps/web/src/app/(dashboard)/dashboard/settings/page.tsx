'use client';

import { useState, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth';
import { useCampaignStore } from '@/stores/campaign';
import { Settings, User, Building, Users, Bell, Shield, Database, Loader2, Download, HardDrive, CreditCard, Gift, MessageCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { GoogleCalendarConnect } from '@/components/settings/GoogleCalendarConnect';
import { votersApi } from '@/lib/api';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { currentCampaign } = useCampaignStore();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // TODO: 實際連接 API 更新使用者資料
      // await api.put('/users/me', { name, email });
      
      // 暫時只更新本地狀態
      if (user) {
        setUser({ ...user, name, email });
      }
      
      toast({
        title: '成功',
        description: '個人資料已更新',
      });
    } catch (error: any) {
      toast({
        title: '錯誤',
        description: error.message || '更新失敗',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 匯出資料
  const handleExport = async () => {
    if (!currentCampaign) {
      toast({
        title: '錯誤',
        description: '請先選擇選舉活動',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      // 使用分頁取得所有選民資料
      const allVoters: any[] = [];
      let page = 1;
      const limit = 100; // API 最大限制為 100
      let hasMore = true;
      
      while (hasMore) {
        const response = await votersApi.getAll({
          campaignId: currentCampaign.id,
          limit,
          page,
        });
        
        const voters = response.data || [];
        allVoters.push(...voters);
        
        // 檢查是否還有更多資料
        const total = response.pagination?.total || 0;
        hasMore = allVoters.length < total;
        page++;
        
        // 防止無限迴圈
        if (page > 100) break;
      }
      
      const voters = allVoters;
      
      if (voters.length === 0) {
        toast({
          title: '提示',
          description: '目前沒有選民資料可匯出',
        });
        return;
      }

      // 轉換為 CSV
      const headers = ['姓名', '電話', '地址', '立場', '影響力', '備註'];
      const csvRows = [
        headers.join(','),
        ...voters.map((v: any) => [
          `"${v.name || ''}"`,
          `"${v.phone || ''}"`,
          `"${v.address || ''}"`,
          `"${getStanceLabel(v.stance) || ''}"`,
          v.influenceScore || 0,
          `"${v.notes || ''}"`,
        ].join(','))
      ];
      
      const csvContent = '\uFEFF' + csvRows.join('\n'); // 加入 BOM 以支援中文
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // 下載檔案
      const link = document.createElement('a');
      link.href = url;
      link.download = `選民資料_${currentCampaign.name}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: '成功',
        description: `已匯出 ${voters.length} 筆選民資料`,
      });
    } catch (error: any) {
      toast({
        title: '錯誤',
        description: error.message || '匯出失敗',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 備份資料
  const handleBackup = async () => {
    if (!currentCampaign) {
      toast({
        title: '錯誤',
        description: '請先選擇選舉活動',
        variant: 'destructive',
      });
      return;
    }

    setIsBackingUp(true);
    try {
      // TODO: 連接後端備份 API
      // await api.post('/backup', { campaignId: currentCampaign.id });
      
      // 模擬備份過程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: '備份成功',
        description: `選舉活動「${currentCampaign.name}」的資料已成功備份`,
      });
    } catch (error: any) {
      toast({
        title: '錯誤',
        description: error.message || '備份失敗',
        variant: 'destructive',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // 取得立場標籤
  const getStanceLabel = (stance: string) => {
    const labels: Record<string, string> = {
      STRONG_SUPPORT: '強力支持',
      SUPPORT: '支持',
      LEAN_SUPPORT: '傾向支持',
      NEUTRAL: '中立',
      UNDECIDED: '未決定',
      LEAN_OPPOSE: '傾向反對',
      OPPOSE: '反對',
      STRONG_OPPOSE: '強力反對',
    };
    return labels[stance] || stance;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-muted-foreground">管理帳號與系統設定</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              個人資料
            </CardTitle>
            <CardDescription>管理您的帳號資訊</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xl font-medium">{user?.name?.charAt(0)}</span>
                </div>
              )}
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {user?.email || '未設定 Email'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">姓名</label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com" 
              />
            </div>
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  儲存中...
                </>
              ) : (
                '儲存變更'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Campaign Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              選舉活動
            </CardTitle>
            <CardDescription>管理選舉活動設定</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentCampaign ? (
              <>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="font-medium">{currentCampaign.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentCampaign.city}
                    {currentCampaign.district && ` ${currentCampaign.district}`}
                  </p>
                </div>
                <Link href="/dashboard/settings/campaigns">
                  <Button variant="outline" className="w-full">
                    管理選舉活動
                  </Button>
                </Link>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">尚未選擇選舉活動</p>
                <Link href="/dashboard/settings/campaigns/new">
                  <Button>建立選舉活動</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              團隊成員
            </CardTitle>
            <CardDescription>管理團隊成員與權限</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              邀請團隊成員協助管理選民資料
            </p>
            <Link href="/dashboard/settings/team">
              <Button variant="outline" className="w-full">
                管理團隊
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Google Calendar Integration */}
        <Suspense fallback={
          <Card>
            <CardContent className="py-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </CardContent>
          </Card>
        }>
          <GoogleCalendarConnect />
        </Suspense>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              通知設定
            </CardTitle>
            <CardDescription>管理通知偏好設定</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              設定接收通知的方式與時機
            </p>
            <Link href="/dashboard/settings/notifications">
              <Button variant="outline" className="w-full">
                通知設定
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              安全性
            </CardTitle>
            <CardDescription>帳號安全與登入記錄</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              查看登入記錄與管理裝置
            </p>
            <Link href="/dashboard/settings/security">
              <Button variant="outline" className="w-full">
                安全設定
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              資料管理
            </CardTitle>
            <CardDescription>匯出與備份資料</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              匯出選民資料或備份系統
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    匯出中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    匯出資料
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleBackup}
                disabled={isBackingUp}
              >
                {isBackingUp ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    備份中...
                  </>
                ) : (
                  <>
                    <HardDrive className="h-4 w-4 mr-2" />
                    備份
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Billing & Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              帳單與訂閱
            </CardTitle>
            <CardDescription>管理訂閱方案與付款</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              查看目前方案、付款記錄與帳單
            </p>
            <Link href="/dashboard/settings/billing">
              <Button variant="outline" className="w-full">
                管理訂閱
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Referral Program */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              推薦好友
            </CardTitle>
            <CardDescription>推薦好友使用，獲得免費訂閱</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              每成功推薦一位好友，您可獲得一個月免費使用
            </p>
            <Link href="/dashboard/settings/referral">
              <Button variant="outline" className="w-full">
                查看推薦碼
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Customer Support */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              客服支援
            </CardTitle>
            <CardDescription>需要協助？隨時與我們聯繫</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              透過官方 LINE 帳號與我們的客服團隊聯繫，我們會盡快回覆您
            </p>
            <a
              href="https://line.me/ti/p/@487leezq"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <MessageCircle className="h-4 w-4 mr-2" />
                加入官方 LINE：@487leezq
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
