'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminPromotersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/common/BackButton';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import { Loader2, User, Building2, Globe, Save } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: '志工', label: '志工' },
  { value: '里長', label: '里長' },
  { value: '社區幹部', label: '社區幹部' },
  { value: '媒體', label: '媒體' },
  { value: '其他', label: '其他' },
];

export default function AdminPromoterEditPage() {
  return (
    <SuperAdminGuard>
      <AdminPromoterEditContent />
    </SuperAdminGuard>
  );
}

function AdminPromoterEditContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [lineId, setLineId] = useState('');
  const [notes, setNotes] = useState('');
  const [organization, setOrganization] = useState('');
  const [region, setRegion] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [avatarUrl, setAvatarUrl] = useState('');
  const [joinedReason, setJoinedReason] = useState('');
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    loadPromoter();
  }, [id]);

  const loadPromoter = async () => {
    try {
      const data = await adminPromotersApi.getPromoter(id);
      if (data) {
        setName(data.name || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setLineId(data.lineId || '');
        setNotes(data.notes || '');
        setOrganization(data.organization || '');
        setRegion(data.region || '');
        setAddress(data.address || '');
        setCategory(data.category || '');
        setSocialLinks(data.socialLinks || {});
        setAvatarUrl(data.avatarUrl || '');
        setJoinedReason(data.joinedReason || '');
        setReferralCode(data.referralCode || '');
      }
    } catch (error) {
      toast({
        title: '載入失敗',
        description: '無法載入推廣者資料',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: '驗證錯誤', description: '姓名為必填欄位', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      await adminPromotersApi.updatePromoter(id, {
        name,
        phone: phone || undefined,
        email: email || undefined,
        lineId: lineId || undefined,
        notes: notes || undefined,
        organization: organization || undefined,
        region: region || undefined,
        address: address || undefined,
        category: category || undefined,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        avatarUrl: avatarUrl || undefined,
        joinedReason: joinedReason || undefined,
      });

      toast({
        title: '儲存成功',
        description: '推廣者資料已更新',
      });
      router.push(`/admin/promoters/${id}`);
    } catch (error: any) {
      toast({
        title: '儲存失敗',
        description: error?.message || '更新推廣者資料時發生錯誤',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSocialLink = (key: string, value: string) => {
    setSocialLinks((prev) => ({
      ...prev,
      [key]: value || undefined,
    } as Record<string, string>));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <BackButton href={`/admin/promoters/${id}`} />
        <div>
          <h1 className="text-2xl font-bold">編輯推廣者</h1>
          <p className="text-muted-foreground">推薦碼：{referralCode}</p>
        </div>
      </div>

      {/* 基本資訊 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            基本資訊
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名 *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">電話</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lineId">LINE ID</Label>
              <Input id="lineId" value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="推廣者 LINE ID（可編輯）" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 組織資訊 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            組織資訊
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organization">所屬組織/公司</Label>
              <Input id="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">推廣者分類</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="請選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">負責區域</Label>
              <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">聯絡地址</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 社群連結 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            社群連結
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input value={socialLinks.facebook || ''} onChange={(e) => updateSocialLink('facebook', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input value={socialLinks.instagram || ''} onChange={(e) => updateSocialLink('instagram', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>LINE 官方帳號</Label>
              <Input value={socialLinks.line_official || ''} onChange={(e) => updateSocialLink('line_official', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>YouTube</Label>
              <Input value={socialLinks.youtube || ''} onChange={(e) => updateSocialLink('youtube', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 其他 */}
      <Card>
        <CardHeader>
          <CardTitle>其他資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="joinedReason">加入原因/動機</Label>
            <Textarea id="joinedReason" value={joinedReason} onChange={(e) => setJoinedReason(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">管理員備註</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push(`/admin/promoters/${id}`)}>
          取消
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !name.trim()} size="lg">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          儲存變更
        </Button>
      </div>
    </div>
  );
}
