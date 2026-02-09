'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { promotersPublicApi, isDemoMode } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import {
  Loader2,
  CheckCircle,
  Users,
  BarChart3,
  Shield,
  ArrowRight,
  Share2,
} from 'lucide-react';

export default function ShareLinkPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { isAuthenticated } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [shareLinkData, setShareLinkData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      loadShareLink();
    }
  }, [code]);

  const loadShareLink = async () => {
    try {
      const data = await promotersPublicApi.getShareLink(code);
      setShareLinkData(data);
      // 儲存推廣碼到 sessionStorage，以便登入後使用
      if (data.promoter?.referralCode) {
        sessionStorage.setItem('pendingPromoterCode', data.promoter.referralCode);
      }
    } catch (err: any) {
      setError('此分享連結無效或已失效');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTrial = () => {
    if (isAuthenticated) {
      // 已登入，導向定價頁面或直接套用推廣碼
      router.push('/pricing');
    } else {
      // 未登入，導向登入頁面
      router.push('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Share2 className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">連結無效</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <Button asChild>
              <Link href="/">返回首頁</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Badge variant="secondary" className="mb-4">
          由 {shareLinkData?.promoter?.name} 推薦
        </Badge>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          選情系統 - 選民關係管理平台
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          全方位的選情管理工具，助您掌握選情動態、有效管理選民關係、提升勝選機率。
        </p>
        <div className="flex justify-center gap-4">
          <Button size="lg" onClick={handleStartTrial}>
            立即免費試用 <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">查看方案</Link>
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>選民管理</CardTitle>
              <CardDescription>
                高效管理選民資料，支援分類、標籤、地區篩選等功能
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mb-2">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>數據分析</CardTitle>
              <CardDescription>
                即時選情分析，掌握支持度變化趨勢，制定精準策略
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-2">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>團隊協作</CardTitle>
              <CardDescription>
                多人協作支援，團隊成員可即時更新選情資訊
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 text-white py-16">
        <div className="max-w-3xl mx-auto text-center px-4">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">
            立即開始免費試用
          </h2>
          <p className="text-gray-300 mb-8">
            免費試用所有功能，無需信用卡。體驗完整的選情管理系統。
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={handleStartTrial}
          >
            免費試用 7 天
          </Button>
        </div>
      </div>
    </div>
  );
}
