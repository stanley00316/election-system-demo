'use client';

import { useState, useRef } from 'react';
import {
  QrCode,
  Shield,
  Megaphone,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { roleInvitesApi } from '@/lib/api';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import { QrCodeDisplay } from '@/components/common/QrCodeDisplay';

type RoleType = 'ADMIN' | 'PROMOTER';

interface GeneratedInvite {
  token: string;
  url: string;
  expiresAt: string;
  role: RoleType;
}

export default function AdminQrInvitePage() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<RoleType>('PROMOTER');
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [invite, setInvite] = useState<GeneratedInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await roleInvitesApi.generate({
        role: selectedRole,
        expiresInHours,
        notes: notes || undefined,
      });

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const inviteUrl = `${baseUrl}/join-role/${result.token}`;

      setInvite({
        token: result.token,
        url: inviteUrl,
        expiresAt: result.expiresAt,
        role: selectedRole,
      });

      toast({ title: '邀請碼已產生', description: '可以分享 QR Code 或連結給對方' });
    } catch (error: any) {
      toast({
        title: '產生失敗',
        description: error?.message || '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      toast({ title: '已複製連結' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: 選取 input 並複製
      if (urlInputRef.current) {
        urlInputRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleReset = () => {
    setInvite(null);
    setCopied(false);
    setNotes('');
  };

  const formatExpiresAt = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-TW', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const roleConfig = {
    ADMIN: {
      label: '管理員',
      description: '被邀請者登入後將自動取得管理員權限，可存取管理後台',
      icon: Shield,
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      badgeColor: 'bg-blue-600',
    },
    PROMOTER: {
      label: '推廣者',
      description: '被邀請者登入後將自動成為推廣者，可使用推廣功能',
      icon: Megaphone,
      color: 'bg-orange-100 text-orange-700 border-orange-300',
      badgeColor: 'bg-orange-500',
    },
  };

  return (
    <SuperAdminGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            QR 邀請碼
          </h1>
          <p className="text-muted-foreground mt-1">
            產生角色邀請 QR Code，對方掃描後登入即自動獲得指定角色
          </p>
        </div>

        {!invite ? (
          /* 產生邀請表單 */
          <div className="space-y-6">
            {/* 角色選擇 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">選擇角色</CardTitle>
                <CardDescription>選擇要邀請的角色類型</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(Object.keys(roleConfig) as RoleType[]).map((role) => {
                    const config = roleConfig[role];
                    const Icon = config.icon;
                    const isSelected = selectedRole === role;

                    return (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`
                          flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all
                          ${isSelected
                            ? `${config.color} border-current ring-2 ring-offset-2 ring-current/20`
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className={`
                          p-3 rounded-lg
                          ${isSelected ? 'bg-white/60' : 'bg-gray-100'}
                        `}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-base">{config.label}</p>
                          <p className="text-sm opacity-80 mt-1">{config.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 設定 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">邀請設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="expires">有效期限（小時）</Label>
                  <Input
                    id="expires"
                    type="number"
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(Math.max(1, Math.min(720, parseInt(e.target.value) || 24)))}
                    min={1}
                    max={720}
                    className="mt-1 max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    建議 24 小時，最長 30 天（720 小時）
                  </p>
                </div>
                <div>
                  <Label htmlFor="notes">備註（選填）</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="例如：邀請 XXX 加入管理團隊"
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 產生按鈕 */}
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  產生中...
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5 mr-2" />
                  產生 QR 邀請碼
                </>
              )}
            </Button>
          </div>
        ) : (
          /* 顯示邀請結果 */
          <div className="space-y-6">
            {/* QR Code 顯示 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-6">
                  {/* 角色標籤 */}
                  <Badge className={`${roleConfig[invite.role].badgeColor} text-white text-base px-4 py-1`}>
                    {(() => {
                      const Icon = roleConfig[invite.role].icon;
                      return <Icon className="h-4 w-4 mr-2 inline" />;
                    })()}
                    {roleConfig[invite.role].label}邀請碼
                  </Badge>

                  {/* QR Code */}
                  <div className="p-4 bg-white rounded-2xl shadow-lg">
                    <QrCodeDisplay value={invite.url} size={280} />
                  </div>

                  {/* 到期資訊 */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>有效期限至 {formatExpiresAt(invite.expiresAt)}</span>
                  </div>

                  {/* 邀請連結 */}
                  <div className="w-full max-w-lg space-y-2">
                    <Label>邀請連結</Label>
                    <div className="flex gap-2">
                      <Input
                        ref={urlInputRef}
                        value={invite.url}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyUrl}
                        className="flex-shrink-0"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* 使用說明 */}
                  <div className="bg-muted/50 rounded-lg p-4 w-full max-w-lg text-sm space-y-2">
                    <p className="font-medium">使用方式：</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>將此 QR Code 出示給對方掃描</li>
                      <li>對方開啟連結後，點擊「LINE 登入」</li>
                      <li>登入成功後即自動獲得{roleConfig[invite.role].label}權限</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 操作按鈕 */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                重新產生
              </Button>
              <Button variant="outline" onClick={handleCopyUrl}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    複製連結
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </SuperAdminGuard>
  );
}
