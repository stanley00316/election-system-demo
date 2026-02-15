import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Scale } from 'lucide-react';
import {
  consentSections,
  portraitConsentSections,
  CONSENT_VERSION,
  CONSENT_EFFECTIVE_DATE,
  SYSTEM_TECH_PROVIDER,
} from '@/components/consent/consent-content';

export const metadata = {
  title: '服務條款 | 選情系統',
  description: '選情系統服務條款與使用規範',
};

export default function TermsPage() {
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
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
            隱私政策
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* 標題區 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">服務條款</h1>
          <p className="text-muted-foreground">
            版本編號：{CONSENT_VERSION}　｜　生效日期：{CONSENT_EFFECTIVE_DATE}
          </p>
        </div>

        {/* 總則說明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              使用須知
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              歡迎使用選情系統（以下簡稱「本系統」）。本系統由{SYSTEM_TECH_PROVIDER}提供技術支援，
              專為候選人及其競選團隊設計，提供選民關係管理、接觸紀錄、選情分析等功能。
            </p>
            <p>
              使用本系統前，請詳閱以下條款。一經註冊或使用本系統，即表示您已閱讀、瞭解並同意遵守本服務條款。
              如您不同意本條款之任何內容，請勿使用本系統。
            </p>
          </CardContent>
        </Card>

        {/* 服務內容 */}
        <Card>
          <CardHeader>
            <CardTitle>一、服務內容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>本系統提供以下功能服務：</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>選民資料庫建立與管理</li>
              <li>接觸紀錄追蹤與管理</li>
              <li>地圖熱力圖視覺化分析</li>
              <li>選情分析與統計圖表</li>
              <li>行程規劃與活動管理</li>
              <li>團隊協作與權限管理</li>
              <li>推廣系統與推薦追蹤</li>
              <li>社群平台發佈功能</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              本系統保留隨時新增、修改或終止部分服務功能之權利，將於系統內或官方管道公告。
            </p>
          </CardContent>
        </Card>

        {/* 帳號與使用規範 */}
        <Card>
          <CardHeader>
            <CardTitle>二、帳號與使用規範</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>1. 使用者須透過 LINE 帳號登入。您應確保帳號資訊正確，並對帳號內所有活動負責。</p>
            <p>2. 使用者不得將帳號借予他人使用或進行未經授權之存取。</p>
            <p>3. 使用者於使用本系統時，應遵守中華民國相關法令，包含但不限於《個人資料保護法》、《選舉罷免法》等。</p>
            <p>4. 不得利用本系統進行任何違法、詐欺、騷擾或侵害他人權益之行為。</p>
            <p>5. 不得未經授權複製、散布、修改或逆向工程本系統之任何部分。</p>
          </CardContent>
        </Card>

        {/* 使用者責任（引用 consent-content 第十一條） */}
        <Card>
          <CardHeader>
            <CardTitle>三、使用者責任</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            {consentSections[10].content.map((line, i) => (
              <p key={i}>{line || '\u00A0'}</p>
            ))}
          </CardContent>
        </Card>

        {/* 資料安全（引用 consent-content 第八條） */}
        <Card>
          <CardHeader>
            <CardTitle>四、資料安全措施</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            {consentSections[7].content.map((line, i) => (
              <p key={i}>{line || '\u00A0'}</p>
            ))}
          </CardContent>
        </Card>

        {/* 智慧財產權 */}
        <Card>
          <CardHeader>
            <CardTitle>五、智慧財產權</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              本系統之所有內容，包含但不限於程式碼、介面設計、圖形、文字、標誌等，
              均受中華民國著作權法、商標法及其他智慧財產權法律之保護。
            </p>
            <p>
              使用者於使用本系統所產生之資料內容，其權利歸屬依雙方約定或法律規定辦理。
            </p>
          </CardContent>
        </Card>

        {/* 免責聲明 */}
        <Card>
          <CardHeader>
            <CardTitle>六、免責聲明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>1. 本系統以現況提供服務，不保證服務永不中斷或完全無錯誤。</p>
            <p>2. 因不可抗力（如天災、戰爭、政府行為等）導致服務中斷，本系統不負賠償責任。</p>
            <p>3. 使用者因違反本條款或法令所造成之損害，應自行負責。</p>
            <p>4. 本系統提供之選情分析僅供參考，不構成任何保證或承諾。</p>
          </CardContent>
        </Card>

        {/* 條款修訂 */}
        <Card>
          <CardHeader>
            <CardTitle>七、條款修訂</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              本系統保留隨時修訂本服務條款之權利。修訂後之條款將公告於系統內，
              使用者於修訂後繼續使用本系統，即視為同意修訂後之條款。
            </p>
          </CardContent>
        </Card>

        {/* 準據法與管轄 */}
        <Card>
          <CardHeader>
            <CardTitle>八、準據法與管轄法院</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              本條款之解釋與適用，以及因本條款所生之爭議，均以中華民國法律為準據法，
              並以臺灣臺北地方法院為第一審管轄法院。
            </p>
          </CardContent>
        </Card>

        {/* 聯絡資訊 */}
        <Card>
          <CardHeader>
            <CardTitle>九、聯絡方式</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>如對本服務條款有任何疑問，請透過以下方式聯繫：</p>
            <p>・Email：support@election-system.com</p>
            <p>・官方 LINE：@487leezq</p>
          </CardContent>
        </Card>

        {/* 底部導航 */}
        <div className="flex items-center justify-between pt-4 pb-8 text-sm text-muted-foreground">
          <p>© 2026 選情系統. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground underline">
              隱私政策
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
