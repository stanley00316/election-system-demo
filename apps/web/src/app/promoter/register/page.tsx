'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { promotersPublicApi } from '@/lib/api';
import {
  Loader2,
  CheckCircle,
  Megaphone,
  ArrowLeft,
} from 'lucide-react';

export default function PromoterRegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    lineId: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('請輸入姓名');
      return;
    }
    if (!formData.phone && !formData.email && !formData.lineId) {
      setError('請至少填寫一種聯繫方式（電話、Email 或 LINE ID）');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const submitData: any = { name: formData.name };
      if (formData.phone) submitData.phone = formData.phone;
      if (formData.email) submitData.email = formData.email;
      if (formData.lineId) submitData.lineId = formData.lineId;
      if (formData.notes) submitData.notes = formData.notes;

      await promotersPublicApi.register(submitData);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err?.message || '申請失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">申請已送出！</h2>
            <p className="text-gray-500 mb-2">
              感謝您申請成為推廣者。
            </p>
            <p className="text-sm text-gray-400 mb-6">
              管理員將盡快審核您的申請，審核通過後會透過您提供的聯繫方式通知您。
            </p>
            <Button asChild>
              <Link href="/">返回首頁</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center px-4 py-8">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">申請成為推廣者</CardTitle>
          <CardDescription>
            加入我們的推廣計畫，推薦選情系統給更多人使用，獲取豐厚獎勵。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名 *</Label>
              <Input
                id="name"
                name="name"
                placeholder="請輸入您的姓名"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">電話</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="09xx-xxx-xxx"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lineId">LINE ID</Label>
              <Input
                id="lineId"
                name="lineId"
                placeholder="您的 LINE ID"
                value={formData.lineId}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備註</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="其他想讓我們知道的事項（選填）"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
              />
            </div>

            <p className="text-xs text-gray-400">
              * 請至少填寫一種聯繫方式（電話、Email 或 LINE ID）
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  送出中...
                </>
              ) : (
                '送出申請'
              )}
            </Button>

            <div className="text-center">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                返回首頁
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
