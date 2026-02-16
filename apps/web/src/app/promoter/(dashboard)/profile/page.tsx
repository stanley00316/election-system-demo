'use client';

import { useState, useEffect } from 'react';
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
import { promoterSelfApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Building2, Globe, Save } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: '志工', label: '志工' },
  { value: '里長', label: '里長' },
  { value: '社區幹部', label: '社區幹部' },
  { value: '媒體', label: '媒體' },
  { value: '其他', label: '其他' },
];

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  line_official?: string;
  youtube?: string;
  tiktok?: string;
  [key: string]: string | undefined;
}

export default function PromoterProfilePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 基本資訊
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [lineId, setLineId] = useState('');

  // 組織資訊
  const [organization, setOrganization] = useState('');
  const [region, setRegion] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');

  // 社群連結
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  // 其他
  const [joinedReason, setJoinedReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await promoterSelfApi.getProfile();
      if (profile) {
        setName(profile.name || '');
        setPhone(profile.phone || '');
        setEmail(profile.email || '');
        setLineId(profile.lineId || '');
        setOrganization(profile.organization || '');
        setRegion(profile.region || '');
        setAddress(profile.address || '');
        setCategory(profile.category || '');
        setSocialLinks(profile.socialLinks || {});
        setJoinedReason(profile.joinedReason || '');
        setNotes(profile.notes || '');
      }
    } catch (error) {
      console.error('載入個人資料失敗:', error);
      toast({
        title: '載入失敗',
        description: '無法載入個人資料',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await promoterSelfApi.updateProfile({
        name,
        phone: phone || undefined,
        email: email || undefined,
        lineId: lineId || undefined,
        organization: organization || undefined,
        region: region || undefined,
        address: address || undefined,
        category: category || undefined,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        joinedReason: joinedReason || undefined,
        notes: notes || undefined,
      });
      toast({
        title: '儲存成功',
        description: '個人資料已更新',
      });
    } catch (error: any) {
      toast({
        title: '儲存失敗',
        description: error?.message || '更新個人資料時發生錯誤',
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
    }));
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
      <div>
        <h1 className="text-2xl font-bold">個人資料</h1>
        <p className="text-muted-foreground">管理您的推廣者個人資訊</p>
      </div>

      {/* 基本資訊 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            基本資訊
          </CardTitle>
          <CardDescription>您的聯絡方式與身份資訊</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="請輸入姓名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">電話</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xx-xxx-xxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lineId">LINE ID</Label>
              <Input
                id="lineId"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                placeholder="您的 LINE ID"
              />
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
          <CardDescription>您所屬的組織與負責區域</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organization">所屬組織/公司</Label>
              <Input
                id="organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="如：XX 里辦公處"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">推廣者分類</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="請選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">負責區域</Label>
              <Input
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="如：台北市大安區"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">聯絡地址</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="完整聯絡地址"
              />
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
          <CardDescription>您的社群媒體帳號與連結</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input
                value={socialLinks.facebook || ''}
                onChange={(e) => updateSocialLink('facebook', e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input
                value={socialLinks.instagram || ''}
                onChange={(e) => updateSocialLink('instagram', e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>LINE 官方帳號</Label>
              <Input
                value={socialLinks.line_official || ''}
                onChange={(e) => updateSocialLink('line_official', e.target.value)}
                placeholder="https://line.me/..."
              />
            </div>
            <div className="space-y-2">
              <Label>YouTube</Label>
              <Input
                value={socialLinks.youtube || ''}
                onChange={(e) => updateSocialLink('youtube', e.target.value)}
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 備註 */}
      <Card>
        <CardHeader>
          <CardTitle>其他資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="joinedReason">加入原因/動機</Label>
            <Textarea
              id="joinedReason"
              value={joinedReason}
              onChange={(e) => setJoinedReason(e.target.value)}
              placeholder="為什麼想成為推廣者？"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">備註</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="其他需要說明的事項"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 儲存按鈕 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !name.trim()} size="lg">
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          儲存變更
        </Button>
      </div>
    </div>
  );
}
