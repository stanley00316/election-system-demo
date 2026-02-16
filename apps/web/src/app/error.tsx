'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 記錄錯誤到監控服務（如 Sentry）
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">發生未預期的錯誤</h1>
            <p className="text-muted-foreground text-sm">
              系統遇到問題，請稍後再試。如果問題持續發生，請聯繫客服。
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground font-mono">
                錯誤代碼：{error.digest}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} variant="default">
              <RotateCcw className="h-4 w-4 mr-2" />
              重新嘗試
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/')}
            >
              <Home className="h-4 w-4 mr-2" />
              回首頁
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
