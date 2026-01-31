'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { googleApi } from '@/lib/api';
import {
  Calendar,
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export function GoogleCalendarConnect() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);

  // 查詢連結狀態
  const { data: status, isLoading } = useQuery({
    queryKey: ['google-status'],
    queryFn: () => googleApi.getStatus(),
  });

  // 處理 URL 中的回調參數
  useEffect(() => {
    const googleResult = searchParams.get('google');
    const message = searchParams.get('message');

    if (googleResult === 'success') {
      toast({
        title: '連結成功',
        description: '已成功連結 Google 帳號',
      });
      queryClient.invalidateQueries({ queryKey: ['google-status'] });
      // 清除 URL 參數
      window.history.replaceState({}, '', '/dashboard/settings');
    } else if (googleResult === 'error') {
      toast({
        title: '連結失敗',
        description: message === 'auth_failed' ? 'Google 授權失敗，請重試' : '發生錯誤',
        variant: 'destructive',
      });
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, [searchParams, toast, queryClient]);

  // 連結 Google
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { authUrl } = await googleApi.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      toast({
        title: '錯誤',
        description: '無法取得授權連結',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  };

  // 斷開連結 mutation
  const disconnectMutation = useMutation({
    mutationFn: () => googleApi.disconnect(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-status'] });
      toast({
        title: '已斷開連結',
        description: 'Google 帳號已斷開連結',
      });
    },
    onError: () => {
      toast({
        title: '錯誤',
        description: '無法斷開連結',
        variant: 'destructive',
      });
    },
  });

  // 同步所有行程 mutation
  const syncAllMutation = useMutation({
    mutationFn: () => googleApi.syncAll(),
    onSuccess: (data) => {
      toast({
        title: '同步完成',
        description: `已同步 ${data.synced} 個行程${data.failed > 0 ? `，${data.failed} 個失敗` : ''}`,
      });
    },
    onError: () => {
      toast({
        title: '同步失敗',
        description: '無法同步行程到 Google Calendar',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google 行事曆
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google 行事曆
        </CardTitle>
        <CardDescription>
          將行程同步到 Google 行事曆，方便在手機上查看和接收提醒
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 連結狀態 */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
              status?.connected ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              {status?.connected ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {status?.connected ? '已連結' : '未連結'}
              </p>
              {status?.connected && status.calendarId && (
                <p className="text-sm text-muted-foreground">
                  行事曆 ID: {status.calendarId}
                </p>
              )}
            </div>
          </div>
          <Badge variant={status?.connected ? 'default' : 'secondary'}>
            {status?.connected ? '已啟用' : '未啟用'}
          </Badge>
        </div>

        {/* 操作按鈕 */}
        <div className="flex flex-wrap gap-2">
          {status?.connected ? (
            <>
              <Button
                variant="outline"
                onClick={() => syncAllMutation.mutate()}
                disabled={syncAllMutation.isPending}
              >
                {syncAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                同步所有行程
              </Button>
              <Button
                variant="outline"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="text-destructive hover:text-destructive"
              >
                {disconnectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4 mr-2" />
                )}
                斷開連結
              </Button>
            </>
          ) : (
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LinkIcon className="h-4 w-4 mr-2" />
              )}
              連結 Google 帳號
            </Button>
          )}
        </div>

        {/* 說明 */}
        <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
          <p>連結後，您可以：</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>將行程同步到 Google 行事曆</li>
            <li>在行程中包含選民姓名、電話、地址等資訊</li>
            <li>在手機上接收行程提醒</li>
          </ul>
        </div>

        {/* Google Calendar 連結 */}
        {status?.connected && (
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            開啟 Google 行事曆
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
