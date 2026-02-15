'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/api';
import { Loader2, AlertCircle, ShieldCheck, Copy, Check } from 'lucide-react';

export default function Setup2FAPage() {
  const router = useRouter();
  const { tempToken, pendingUser, pending2faRedirect, setAuth, clearTempAuth } = useAuthStore();

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 無 tempToken → 回到登入頁
  useEffect(() => {
    if (!tempToken) {
      router.replace('/login');
      return;
    }
    loadQrCode();
  }, []);

  const loadQrCode = async () => {
    if (!tempToken) return;
    try {
      const result = await authApi.setup2fa(tempToken);
      setQrCodeDataUrl(result.qrCodeDataUrl);
      setSecret(result.secret);
      setIsLoading(false);
      // 自動聚焦驗證碼輸入框
      setTimeout(() => inputRef.current?.focus(), 300);
    } catch (err: any) {
      setError(err?.message || '無法產生 QR Code');
      setIsLoading(false);
    }
  };

  const handleCopySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (!tempToken || code.length !== 6) return;
    setIsVerifying(true);
    setError(null);
    try {
      const result = await authApi.verifySetup2fa(tempToken, code);
      setAuth(result.user, result.accessToken);
      router.push(pending2faRedirect || '/dashboard');
    } catch (err: any) {
      setError(err?.message || '驗證失敗');
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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">設定雙因素驗證</CardTitle>
          <CardDescription>
            使用 Google Authenticator 或其他驗證器 App 掃描 QR Code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* QR Code */}
              {qrCodeDataUrl && (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-lg border bg-white p-3">
                    <img
                      src={qrCodeDataUrl}
                      alt="2FA QR Code"
                      width={200}
                      height={200}
                    />
                  </div>
                  <p className="text-center text-xs text-gray-500">
                    用 Google Authenticator 掃描上方 QR Code
                  </p>
                </div>
              )}

              {/* 手動輸入密鑰 */}
              {secret && (
                <div className="rounded-md border bg-gray-50 p-3">
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    無法掃描？手動輸入此密鑰：
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 break-all rounded bg-white px-2 py-1 font-mono text-sm">
                      {secret}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopySecret}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* 驗證碼輸入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  輸入 6 位數驗證碼
                </label>
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
                  驗證並啟用
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  className="w-full text-gray-500"
                >
                  取消
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
