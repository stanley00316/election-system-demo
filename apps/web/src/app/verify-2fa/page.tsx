'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/api';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function Verify2FAPage() {
  const router = useRouter();
  const { tempToken, pendingUser, pending2faRedirect, setAuth, clearTempAuth } = useAuthStore();

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 無 tempToken → 回到登入頁
  useEffect(() => {
    if (!tempToken) {
      router.replace('/login');
      return;
    }
    inputRef.current?.focus();
  }, []);

  const handleVerify = async () => {
    if (!tempToken || code.length !== 6) return;
    setIsVerifying(true);
    setError(null);
    try {
      const result = await authApi.verify2fa(tempToken, code);
      setAuth(result.user, result.accessToken);
      router.push(pending2faRedirect || '/dashboard');
    } catch (err: any) {
      setError(err?.message || '驗證碼不正確');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerify();
    }
  };

  const handleCancel = () => {
    clearTempAuth();
    router.replace('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">雙因素驗證</CardTitle>
          <CardDescription>
            {pendingUser?.name ? `${pendingUser.name}，` : ''}請輸入驗證器 App 上的 6 位數驗證碼
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 驗證碼輸入 */}
          <div className="space-y-2">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={handleKeyDown}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* 按鈕 */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleVerify}
              disabled={code.length !== 6 || isVerifying}
              className="w-full"
            >
              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              驗證
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="w-full text-gray-500"
            >
              返回登入
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
