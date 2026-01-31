'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight,
  ChevronDown,
  Home,
  Users,
  MessageSquare,
  Calendar,
  Map,
  BarChart3,
  Settings,
  LogIn,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Mail,
  Phone,
  Clock,
  Star,
  Zap,
  Shield,
  Target,
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  steps: {
    title: string;
    description: string;
    tips?: string[];
  }[];
}

const guideSections: GuideSection[] = [
  {
    id: 'login',
    title: 'LINE 登入',
    icon: <LogIn className="h-6 w-6" />,
    description: '使用 LINE 帳號快速登入系統',
    steps: [
      {
        title: '點擊登入按鈕',
        description: '在首頁點擊「LINE 登入」按鈕，系統會導向 LINE 授權頁面。',
        tips: ['無需另外註冊帳號', '使用您平常使用的 LINE 帳號即可'],
      },
      {
        title: '授權登入',
        description: '在 LINE 授權頁面點擊「允許」，授權系統取得您的基本資料。',
        tips: ['系統只會取得您的顯示名稱和大頭照', '不會存取您的聊天記錄或好友列表'],
      },
      {
        title: '完成登入',
        description: '授權成功後，系統會自動導向儀表板，您可以開始使用所有功能。',
      },
    ],
  },
  {
    id: 'dashboard',
    title: '儀表板總覽',
    icon: <Home className="h-6 w-6" />,
    description: '一目了然的選情數據中心',
    steps: [
      {
        title: '查看關鍵數據',
        description: '儀表板上方顯示四個關鍵指標：選民總數、接觸次數、今日拜訪、支持率。',
        tips: ['點擊數字可查看詳細資料', '數據會即時更新'],
      },
      {
        title: '政治傾向分布',
        description: '圓餅圖顯示選民的政治傾向分布，從「強力支持」到「強力反對」共七個等級。',
        tips: ['綠色系代表支持', '紅色系代表反對', '黃色代表中立/未表態'],
      },
      {
        title: '接觸類型統計',
        description: '長條圖顯示各種接觸方式的次數統計，幫助您了解哪種方式最有效。',
      },
      {
        title: '最近接觸紀錄',
        description: '快速查看最新的選民接觸紀錄，掌握團隊動態。',
      },
    ],
  },
  {
    id: 'voters',
    title: '選民管理',
    icon: <Users className="h-6 w-6" />,
    description: '建立與管理完整的選民資料庫',
    steps: [
      {
        title: '新增選民',
        description: '點擊「新增選民」按鈕，填寫選民基本資料，包含姓名、電話、地址、政治傾向等。',
        tips: ['必填欄位：姓名', '建議填寫完整地址以便地圖顯示', '可設定標籤方便分類'],
      },
      {
        title: '搜尋與篩選',
        description: '使用搜尋框快速找到特定選民，或使用篩選器依傾向、標籤、區域篩選。',
        tips: ['支援姓名、電話、地址搜尋', '可同時套用多個篩選條件'],
      },
      {
        title: '查看選民詳情',
        description: '點擊選民列表中的項目，可查看完整資料、接觸歷史、關係網絡。',
      },
      {
        title: '編輯與更新',
        description: '在詳情頁面點擊「編輯」可更新選民資料，記得隨時更新政治傾向變化。',
      },
    ],
  },
  {
    id: 'contacts',
    title: '接觸紀錄',
    icon: <MessageSquare className="h-6 w-6" />,
    description: '記錄每次與選民的互動',
    steps: [
      {
        title: '新增接觸紀錄',
        description: '點擊「新增紀錄」，選擇接觸的選民、接觸類型（家訪、電話、市場等）、結果。',
        tips: ['接觸類型：家訪、電話、市場、廟宇、掃街、活動', '結果：正面、中性、負面、未接觸到'],
      },
      {
        title: '記錄重要內容',
        description: '在備註欄記錄選民關心的議題、承諾事項、需要跟進的事項。',
        tips: ['記錄越詳細，下次拜訪越有幫助', '可記錄選民家庭成員資訊'],
      },
      {
        title: '追蹤接觸歷史',
        description: '在選民詳情頁可查看所有接觸歷史，了解互動軌跡。',
      },
    ],
  },
  {
    id: 'schedules',
    title: '行程規劃',
    icon: <Calendar className="h-6 w-6" />,
    description: '安排與管理拜訪行程',
    steps: [
      {
        title: '建立新行程',
        description: '點擊「新增行程」，設定日期、時間、拜訪地點、預計拜訪的選民。',
        tips: ['可一次規劃多個拜訪點', '建議按地理位置順序安排'],
      },
      {
        title: '查看行程日曆',
        description: '日曆視圖顯示所有已排定的行程，方便掌握整體時程。',
      },
      {
        title: '行程導航',
        description: '點擊行程可查看詳情，並使用地圖導航功能規劃最佳路線。',
      },
      {
        title: 'Google 日曆同步',
        description: '可將行程同步至 Google 日曆，在手機上隨時查看。',
        tips: ['需在設定中連結 Google 帳號'],
      },
    ],
  },
  {
    id: 'map',
    title: '地圖檢視',
    icon: <Map className="h-6 w-6" />,
    description: '視覺化選民地理分布',
    steps: [
      {
        title: '查看選民分布',
        description: '地圖上以不同顏色標記顯示選民位置，顏色代表政治傾向。',
        tips: ['綠色：支持', '黃色：中立', '紅色：反對', '灰色：未知'],
      },
      {
        title: '區域篩選',
        description: '可依區域、里別篩選顯示，聚焦特定區域的選民分布。',
      },
      {
        title: '點擊查看詳情',
        description: '點擊地圖上的標記可查看該選民的基本資訊，點擊「查看詳情」進入完整頁面。',
      },
    ],
  },
  {
    id: 'analysis',
    title: '選情分析',
    icon: <BarChart3 className="h-6 w-6" />,
    description: '數據驅動的選情評估',
    steps: [
      {
        title: '勝選機率評估',
        description: '系統根據目前數據計算勝選機率，並顯示影響因素。',
        tips: ['機率僅供參考', '實際結果受多種因素影響'],
      },
      {
        title: '政治傾向分布',
        description: '詳細的傾向分布圖表，了解支持/中立/反對的比例。',
      },
      {
        title: '區域支持度',
        description: '各區域的支持率比較，找出需要加強經營的區域。',
      },
      {
        title: '趨勢分析',
        description: '過去 30 天的接觸趨勢與支持度變化，掌握選情動態。',
      },
    ],
  },
  {
    id: 'settings',
    title: '系統設定',
    icon: <Settings className="h-6 w-6" />,
    description: '個人化您的系統設定',
    steps: [
      {
        title: '選舉活動管理',
        description: '建立新的選舉活動或切換不同的選舉活動。',
        tips: ['一個帳號可管理多個選舉活動', '每個活動有獨立的選民資料庫'],
      },
      {
        title: '團隊管理',
        description: '邀請團隊成員加入，共同管理選民資料。',
        tips: ['可設定不同權限等級', '使用邀請連結快速加入'],
      },
      {
        title: '通知設定',
        description: '設定系統通知偏好，包含行程提醒、團隊動態等。',
      },
      {
        title: '主題切換',
        description: '支援亮白/暗黑主題，點擊側邊欄的主題按鈕切換。',
      },
    ],
  },
];

const faqs = [
  {
    question: '系統是否需要付費？',
    answer: '系統提供 14 天免費試用期，試用期間可使用所有功能。試用期結束後，可選擇升級付費方案繼續使用。',
  },
  {
    question: '我的資料安全嗎？',
    answer: '系統採用業界標準的加密技術保護您的資料，所有傳輸皆經過 SSL 加密。我們不會將您的資料分享給第三方。',
  },
  {
    question: '可以多人同時使用嗎？',
    answer: '可以！您可以邀請團隊成員加入，共同管理選民資料。每位成員都有獨立帳號，可追蹤各自的接觸紀錄。',
  },
  {
    question: '支援哪些裝置？',
    answer: '系統支援電腦、平板、手機等各種裝置，響應式設計讓您在任何裝置上都能流暢使用。',
  },
  {
    question: '如何取消訂閱？',
    answer: '在「設定」>「訂閱管理」中可隨時取消訂閱。取消後，您仍可使用服務直到目前計費週期結束。',
  },
  {
    question: '有使用上的問題怎麼辦？',
    answer: '您可以透過系統內的「聯繫我們」功能或 Email 聯繫客服團隊，我們會盡快回覆您。',
  },
];

export default function GuidePage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('login');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">選</span>
            </div>
            <span className="font-bold text-xl">選情系統</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button>開始使用</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge className="mb-4" variant="secondary">
            使用教學
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            選情系統使用指南
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            從登入到進階功能，完整的圖文教學幫助您快速上手選民關係管理平台
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-5 w-5" />
                立即登入使用
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#quick-start">
                <Zap className="mr-2 h-5 w-5" />
                5 分鐘快速上手
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Start Section */}
      <section id="quick-start" className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            <Zap className="inline-block mr-2 h-8 w-8 text-primary" />
            5 分鐘快速上手
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="relative overflow-hidden">
              <div className="absolute top-4 right-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="h-5 w-5 text-primary" />
                  LINE 登入
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  使用 LINE 帳號快速登入，無需額外註冊，30 秒完成。
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-4 right-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  建立選舉活動
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  設定選舉類型、選區範圍，系統會自動建立專屬的選民資料庫。
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-4 right-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  開始管理
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  新增選民、記錄接觸、規劃行程，開始您的選民經營之旅。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-4">功能詳細教學</h2>
          <p className="text-center text-muted-foreground mb-12">
            點擊展開各功能的詳細說明與操作步驟
          </p>

          <div className="space-y-4">
            {guideSections.map((section) => (
              <Card key={section.id} className="overflow-hidden">
                <button
                  className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === section.id ? null : section.id
                    )
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {section.icon}
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">{section.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  {expandedSection === section.id ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {expandedSection === section.id && (
                  <CardContent className="pt-0 pb-6">
                    <div className="border-t pt-6">
                      <div className="space-y-6">
                        {section.steps.map((step, index) => (
                          <div key={index} className="flex gap-4">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                                {index + 1}
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">{step.title}</h4>
                              <p className="text-muted-foreground mb-2">
                                {step.description}
                              </p>
                              {step.tips && (
                                <div className="bg-muted/50 rounded-lg p-3">
                                  <p className="text-sm font-medium mb-1 flex items-center gap-1">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    小提示
                                  </p>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {step.tips.map((tip, tipIndex) => (
                                      <li key={tipIndex} className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        {tip}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">系統特色</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">資料安全</h3>
                <p className="text-muted-foreground text-sm">
                  SSL 加密傳輸、定期備份，確保您的選民資料安全無虞。
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">即時同步</h3>
                <p className="text-muted-foreground text-sm">
                  多人協作即時同步，團隊成員隨時掌握最新動態。
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">數據分析</h3>
                <p className="text-muted-foreground text-sm">
                  自動分析選情趨勢，用數據輔助決策。
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Map className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">地圖視覺化</h3>
                <p className="text-muted-foreground text-sm">
                  直觀的地圖顯示，一眼看清選民分布與傾向。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-4">
            <HelpCircle className="inline-block mr-2 h-8 w-8 text-primary" />
            常見問題
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            點擊問題展開答案
          </p>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <button
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                  onClick={() =>
                    setExpandedFaq(expandedFaq === index ? null : index)
                  }
                >
                  <span className="font-medium pr-4">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <CardContent className="pt-0 pb-4">
                    <p className="text-muted-foreground border-t pt-4">
                      {faq.answer}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">準備好開始了嗎？</h2>
          <p className="text-xl opacity-90 mb-8">
            立即免費試用 14 天，體驗專業的選民管理系統
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-5 w-5" />
                免費開始使用
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
              <Link href="/pricing">
                查看方案價格
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">需要更多協助？</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Email 支援</h3>
                <p className="text-muted-foreground text-sm">
                  support@election-system.com
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">服務時間</h3>
                <p className="text-muted-foreground text-sm">
                  週一至週五 9:00-18:00
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">客服專線</h3>
                <p className="text-muted-foreground text-sm">
                  02-1234-5678
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto max-w-4xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">選</span>
            </div>
            <span className="font-semibold">選情系統</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 選情系統. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              價格方案
            </Link>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              登入
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
