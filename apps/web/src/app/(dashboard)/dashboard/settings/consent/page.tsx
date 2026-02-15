'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Shield, CheckCircle, XCircle, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useCampaignStore } from '@/stores/campaign';
import { authApi } from '@/lib/api';
import {
  consentSections,
  portraitConsentSections,
  CONSENT_VERSION,
  CONSENT_EFFECTIVE_DATE,
  SYSTEM_TECH_PROVIDER,
} from '@/components/consent/consent-content';

export default function ConsentSettingsPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { currentCampaign } = useCampaignStore();
  const [revoking, setRevoking] = useState(false);

  const campaignName = currentCampaign?.name || '（未設定競選活動）';
  const userName = user?.name || '使用者';
  const userEmail = user?.email || user?.lineUserId || '';

  const hasConsent = !!user?.consentAcceptedAt;
  const hasPortraitConsent = !!user?.portraitConsentAcceptedAt;

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      const result = await authApi.revokeConsent();
      if (user) {
        setUser({
          ...user,
          consentAcceptedAt: result.consentAcceptedAt,
          consentVersion: result.consentVersion,
          portraitConsentAcceptedAt: result.portraitConsentAcceptedAt,
        });
      }
    } catch (error) {
      console.error('撤回同意失敗:', error);
    } finally {
      setRevoking(false);
    }
  };

  const renderSection = (
    section: { title: string; content: string[]; warning?: string },
    index: number,
  ) => (
    <div key={index} className="mb-6">
      <h3 className="text-sm font-bold mb-2">{section.title}</h3>
      {section.content.map((line, i) => {
        let displayLine = line
          .replace('候選人／競選辦公室名稱：（系統自動帶入）', `候選人／競選辦公室名稱：${campaignName}`)
          .replace('（系統自動帶入使用者）', userName);
        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">
            {displayLine || '\u00A0'}
          </p>
        );
      })}
      {section.warning && (
        <div className="flex items-start gap-2 mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-xs text-yellow-700 dark:text-yellow-300">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>⚠ {section.warning}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          個資保護與法規
        </h1>
        <p className="text-muted-foreground mt-1">
          檢視個人資料保護聲明及同意紀錄
        </p>
      </div>

      {/* 同意狀態卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">同意狀態</CardTitle>
          <CardDescription>您的個資法同意紀錄</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasConsent ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">個人資料蒐集、處理及利用</span>
              </div>
              <Badge variant={hasConsent ? 'default' : 'destructive'}>
                {hasConsent ? '已同意' : '未同意'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasPortraitConsent ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium">肖像權暨聲音授權</span>
              </div>
              <Badge variant={hasPortraitConsent ? 'default' : 'secondary'}>
                {hasPortraitConsent ? '已同意' : '未同意'}
              </Badge>
            </div>

            {hasConsent && (
              <div className="border-t pt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    同意時間：{new Date(user!.consentAcceptedAt!).toLocaleString('zh-TW')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>同意版本：{user?.consentVersion}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>使用者：{userName}（{userEmail}）</span>
                </div>
              </div>
            )}

            {hasConsent && (
              <div className="border-t pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={revoking}>
                      {revoking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          撤回中...
                        </>
                      ) : (
                        '撤回同意'
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>確認撤回同意？</AlertDialogTitle>
                      <AlertDialogDescription>
                        撤回同意後，系統將限制部分功能使用，您需要重新同意才能繼續正常使用系統。此操作無法還原。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRevoke}>
                        確認撤回
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 完整條款 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            個人資料保護聲明暨使用同意書
          </CardTitle>
          <CardDescription>
            版本 {CONSENT_VERSION}・生效日期：{CONSENT_EFFECTIVE_DATE}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-1">
              {consentSections.map((section, i) => renderSection(section, i))}

              <hr className="my-6 border-border" />

              {portraitConsentSections.map((section, i) =>
                renderSection(section, i + 100),
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
