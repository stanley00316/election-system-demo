'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useCampaignStore } from '@/stores/campaign';
import { authApi } from '@/lib/api';
import {
  consentSections,
  portraitConsentSections,
  CONSENT_VERSION,
  CONSENT_EFFECTIVE_DATE,
  SYSTEM_TECH_PROVIDER,
} from './consent-content';

export function ConsentDialog() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const needsConsent =
    isAuthenticated &&
    !!user &&
    (!user.consentAcceptedAt || user.consentVersion !== CONSENT_VERSION);

  const { currentCampaign } = useCampaignStore();

  const [consentData, setConsentData] = useState(false);
  const [consentSensitive, setConsentSensitive] = useState(false);
  const [consentLog, setConsentLog] = useState(false);
  const [portraitConsent, setPortraitConsent] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const campaignName = currentCampaign?.name || '（未設定競選活動）';
  const userName = user?.name || '使用者';
  const userEmail = user?.email || user?.lineUserId || '';

  const allChecked =
    consentData && consentSensitive && consentLog && portraitConsent !== '';

  const handleSubmit = async () => {
    if (!allChecked) return;
    setSubmitting(true);
    try {
      const result = await authApi.acceptConsent(
        CONSENT_VERSION,
        portraitConsent === 'agree',
      );
      // 更新 store — needsConsent 將變為 false，元件自動卸載
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.setState({
          user: {
            ...currentUser,
            consentAcceptedAt: result.consentAcceptedAt,
            consentVersion: result.consentVersion,
            portraitConsentAcceptedAt: result.portraitConsentAcceptedAt,
          },
        });
      }
    } catch (error) {
      console.error('同意書提交失敗:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderSection = (
    section: { title: string; content: string[]; warning?: string },
    index: number,
  ) => (
    <div key={index} className="mb-6">
      <h3 className="text-sm font-bold mb-2">{section.title}</h3>
      {section.content.map((line, i) => {
        // 自動帶入動態值
        let displayLine = line
          .replace('候選人／競選辦公室名稱：（系統自動帶入）', `候選人／競選辦公室名稱：${campaignName}`)
          .replace('（系統自動帶入使用者）', userName);
        return (
          <p key={i} className="text-xs text-muted-foreground leading-relaxed">
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

  // 不需要同意時，完全不渲染 Dialog（避免 Radix Dialog controlled open 問題）
  if (!needsConsent) return null;

  return (
    <Dialog open modal>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <DialogTitle>個人資料保護聲明暨使用同意書</DialogTitle>
          </div>
          <DialogDescription>
            版本 {CONSENT_VERSION}・生效日期：{CONSENT_EFFECTIVE_DATE}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[50vh] pr-4">
          <div className="space-y-1">
            {/* 個資保護 12 條 */}
            {consentSections.map((section, i) => renderSection(section, i))}

            {/* 分隔線 */}
            <hr className="my-4 border-border" />

            {/* 肖像權條款 */}
            {portraitConsentSections.map((section, i) =>
              renderSection(section, i + 100),
            )}
          </div>
        </ScrollArea>

        {/* 同意區域 */}
        <div className="border-t pt-4 space-y-4">
          {/* 使用者資訊 */}
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>使用者姓名：{userName}</p>
            <p>登入帳號：{userEmail}</p>
            <p>同意時間：系統自動記錄</p>
          </div>

          {/* 三個核取方塊 */}
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent-data"
                checked={consentData}
                onCheckedChange={(checked) => setConsentData(checked === true)}
              />
              <Label
                htmlFor="consent-data"
                className="text-sm leading-snug cursor-pointer"
              >
                同意本系統蒐集、處理及利用相關個人資料
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent-sensitive"
                checked={consentSensitive}
                onCheckedChange={(checked) =>
                  setConsentSensitive(checked === true)
                }
              />
              <Label
                htmlFor="consent-sensitive"
                className="text-sm leading-snug cursor-pointer"
              >
                同意敏感性資料於合法政治活動範圍內使用
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent-log"
                checked={consentLog}
                onCheckedChange={(checked) => setConsentLog(checked === true)}
              />
              <Label
                htmlFor="consent-log"
                className="text-sm leading-snug cursor-pointer"
              >
                同意系統留存操作紀錄以確保資料安全
              </Label>
            </div>
          </div>

          {/* 肖像權同意 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">肖像權暨聲音授權</p>
            <RadioGroup
              value={portraitConsent}
              onValueChange={setPortraitConsent}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="agree" id="portrait-agree" />
                <Label htmlFor="portrait-agree" className="text-sm cursor-pointer">
                  同意
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="disagree" id="portrait-disagree" />
                <Label
                  htmlFor="portrait-disagree"
                  className="text-sm cursor-pointer"
                >
                  不同意
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!allChecked || submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                提交中...
              </>
            ) : (
              '我已閱讀並同意'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
