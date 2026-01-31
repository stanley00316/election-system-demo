'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Shield, 
  Key, 
  Smartphone, 
  Monitor, 
  Globe,
  Clock,
  LogOut,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

interface LoginSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

// 模擬登入記錄資料
const mockSessions: LoginSession[] = [
  {
    id: '1',
    device: 'MacBook Pro',
    browser: 'Chrome 120',
    ip: '123.45.67.89',
    location: '台北市, 台灣',
    lastActive: new Date().toISOString(),
    isCurrent: true,
  },
  {
    id: '2',
    device: 'iPhone 15',
    browser: 'Safari',
    ip: '123.45.67.90',
    location: '新北市, 台灣',
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isCurrent: false,
  },
  {
    id: '3',
    device: 'Windows PC',
    browser: 'Edge 120',
    ip: '98.76.54.32',
    location: '台中市, 台灣',
    lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isCurrent: false,
  },
];

export default function SecuritySettingsPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<LoginSession[]>(mockSessions);
  
  // 密碼變更
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // 登出其他裝置
  const [isLoggingOut, setIsLoggingOut] = useState<string | null>(null);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: '錯誤',
        description: '請填寫所有密碼欄位',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: '錯誤',
        description: '新密碼與確認密碼不符',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: '錯誤',
        description: '密碼長度至少需要 8 個字元',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      // TODO: 連接 API 變更密碼
      // await api.put('/users/me/password', { currentPassword, newPassword });
      
      // 模擬 API 延遲
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: '成功',
        description: '密碼已變更',
      });
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: '錯誤',
        description: error.message || '密碼變更失敗',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogoutSession = async (sessionId: string) => {
    setIsLoggingOut(sessionId);
    try {
      // TODO: 連接 API 登出指定裝置
      // await api.delete(`/sessions/${sessionId}`);
      
      // 模擬 API 延遲
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      toast({
        title: '成功',
        description: '已登出該裝置',
      });
    } catch (error: any) {
      toast({
        title: '錯誤',
        description: error.message || '登出失敗',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(null);
    }
  };

  const handleLogoutAllOthers = async () => {
    setIsLoggingOut('all');
    try {
      // TODO: 連接 API 登出所有其他裝置
      // await api.delete('/sessions/others');
      
      // 模擬 API 延遲
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSessions(prev => prev.filter(s => s.isCurrent));
      
      toast({
        title: '成功',
        description: '已登出所有其他裝置',
      });
    } catch (error: any) {
      toast({
        title: '錯誤',
        description: error.message || '登出失敗',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(null);
    }
  };

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('iphone') || device.toLowerCase().includes('android')) {
      return <Smartphone className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">安全設定</h1>
          <p className="text-muted-foreground">管理帳號安全與登入裝置</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* 變更密碼 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              變更密碼
            </CardTitle>
            <CardDescription>定期更新密碼以確保帳號安全</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">目前密碼</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="輸入目前密碼"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">新密碼</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="輸入新密碼（至少 8 個字元）"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">確認新密碼</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次輸入新密碼"
              />
            </div>
            
            <Button 
              onClick={handleChangePassword} 
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  變更中...
                </>
              ) : (
                '變更密碼'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 兩步驟驗證 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              兩步驟驗證
            </CardTitle>
            <CardDescription>為帳號添加額外的安全保護</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">尚未啟用</p>
                  <p className="text-sm text-muted-foreground">
                    啟用兩步驟驗證可大幅提升帳號安全性
                  </p>
                </div>
              </div>
              <Button variant="outline" disabled>
                即將推出
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 登入裝置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  登入裝置
                </CardTitle>
                <CardDescription>管理已登入此帳號的裝置</CardDescription>
              </div>
              {sessions.filter(s => !s.isCurrent).length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogoutAllOthers}
                  disabled={isLoggingOut === 'all'}
                >
                  {isLoggingOut === 'all' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  登出所有其他裝置
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-muted">
                      {getDeviceIcon(session.device)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{session.device}</p>
                        {session.isCurrent && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            目前裝置
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.browser} · {session.ip}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Globe className="h-3 w-3" />
                        {session.location}
                        <span className="mx-1">·</span>
                        <Clock className="h-3 w-3" />
                        {session.isCurrent 
                          ? '現在活動中' 
                          : `最後活動：${formatDate(session.lastActive, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                        }
                      </div>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLogoutSession(session.id)}
                      disabled={isLoggingOut === session.id}
                    >
                      {isLoggingOut === session.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
              
              {sessions.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  沒有其他登入裝置
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
