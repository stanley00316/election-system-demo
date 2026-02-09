'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Shield, 
  Smartphone, 
  Monitor, 
  Globe,
  Clock,
  LogOut,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
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
  
  // 登出其他裝置
  const [isLoggingOut, setIsLoggingOut] = useState<string | null>(null);

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
        <BackButton href="/dashboard/settings" />
        <div>
          <h1 className="text-2xl font-bold">安全設定</h1>
          <p className="text-muted-foreground">管理帳號安全與登入裝置</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
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
