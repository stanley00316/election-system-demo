import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  consentSections,
  portraitConsentSections,
  CONSENT_VERSION,
  CONSENT_EFFECTIVE_DATE,
  SYSTEM_TECH_PROVIDER,
} from '@/components/consent/consent-content';

export const metadata = {
  title: '隱私政策 | 選情系統',
  description: '選情系統個人資料保護聲明暨隱私政策',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* 頂部導航 */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回登入
            </Button>
          </Link>
          <div className="flex-1" />
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
            服務條款
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* 標題區 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">隱私政策</h1>
          <p className="text-sm text-muted-foreground">
            個人資料保護聲明暨使用同意書
          </p>
          <p className="text-muted-foreground">
            版本編號：{CONSENT_VERSION}　｜　生效日期：{CONSENT_EFFECTIVE_DATE}
          </p>
        </div>

        {/* 個人資料保護聲明十二條 */}
        {consentSections.map((section, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {section.content.map((line, i) => {
                // 替換動態欄位
                const displayLine = line
                  .replace('候選人／競選辦公室名稱：（系統自動帶入）', '候選人／競選辦公室名稱：（依實際使用者所屬競選辦公室）')
                return <p key={i}>{displayLine || '\u00A0'}</p>;
              })}
              {section.warning && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-amber-800 dark:text-amber-200">{section.warning}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* 肖像權暨聲音授權同意條款 */}
        {portraitConsentSections.map((section, index) => (
          <Card key={`portrait-${index}`} className="border-blue-200 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {section.content.map((line, i) => (
                <p key={i}>{line || '\u00A0'}</p>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* 底部導航 */}
        <div className="flex items-center justify-between pt-4 pb-8 text-sm text-muted-foreground">
          <p>© 2026 選情系統. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground underline">
              服務條款
            </Link>
            <Link href="/login" className="hover:text-foreground underline">
              返回登入
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
