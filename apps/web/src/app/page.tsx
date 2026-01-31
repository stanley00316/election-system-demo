import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Users,
  MapPin,
  BarChart3,
  Calendar,
  Shield,
  Smartphone,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">選</span>
            </div>
            <span className="font-bold text-xl">選情系統</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">登入</Button>
            </Link>
            <Link href="/login">
              <Button>開始使用</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          專為台灣選舉設計的
          <br />
          <span className="text-primary">選情管理平台</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          系統化管理選民資料、分析選票結構、規劃拜訪行程，
          建立長期可累積的選民關係資料庫。
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="gap-2">
              使用 LINE 登入
            </Button>
          </Link>
          <Button size="lg" variant="outline">
            了解更多
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">核心功能</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Users className="h-8 w-8" />}
            title="選民關係管理"
            description="建立完整的選民資料庫，追蹤每次接觸紀錄，管理家庭與社交關係網路。"
          />
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8" />}
            title="選情分析"
            description="即時分析票源結構、支持率分布，預測勝選機率，提供數據驅動的決策支援。"
          />
          <FeatureCard
            icon={<MapPin className="h-8 w-8" />}
            title="地圖與行程"
            description="整合 Google Maps 顯示選民分布，智慧規劃每日拜訪路線，最佳化行程效率。"
          />
          <FeatureCard
            icon={<Calendar className="h-8 w-8" />}
            title="活動管理"
            description="管理客廳會、公祭、社區活動等，追蹤參與者並建立關係連結。"
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8" />}
            title="資料安全"
            description="採用業界標準加密技術，嚴格權限控制，完整稽核日誌，保護選民個資。"
          />
          <FeatureCard
            icon={<Smartphone className="h-8 w-8" />}
            title="行動優先"
            description="響應式設計支援各種裝置，離線功能確保實地拜訪時也能正常使用。"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-primary rounded-2xl p-12 text-center text-primary-foreground">
          <h2 className="text-3xl font-bold mb-4">準備好開始了嗎？</h2>
          <p className="text-lg opacity-90 mb-8">
            立即使用 LINE 帳號登入，開始建立您的選情管理系統。
          </p>
          <Link href="/login">
            <Button size="lg" variant="secondary">
              免費開始使用
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground">
            © 2024 選情系統. All rights reserved.
          </p>
          <div className="flex gap-6 text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              隱私政策
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              服務條款
            </Link>
            <Link href="/contact" className="hover:text-foreground">
              聯絡我們
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
