'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminUsersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/common/BackButton';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import { Loader2, User, Shield, Save, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdminUserEditPage() {
  return (
    <SuperAdminGuard>
      <AdminUserEditContent />
    </SuperAdminGuard>
  );
}

function AdminUserEditContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      const data = await adminUsersApi.getUser(id);
      if (data) {
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setLineUserId(data.lineUserId || '');
        setIsAdmin(data.isAdmin || false);
        setIsSuspended(data.isSuspended || false);
      }
    } catch (error) {
      toast({
        title: '載入失敗',
        description: '無法載入使用者資料',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await adminUsersApi.updateUser(id, {
        name: name || undefined,
        email: email || undefined,
        phone: phone || undefined,
      });

      toast({
        title: '儲存成功',
        description: '使用者資料已更新',
      });
      router.push(`/admin/users/${id}`);
    } catch (error: any) {
      toast({
        title: '儲存失敗',
        description: error?.message || '更新使用者資料時發生錯誤',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
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
        <BackButton href={`/admin/users/${id}`} />
        <div>
          <h1 className="text-2xl font-bold">編輯使用者</h1>
          <div className="flex items-center gap-2 mt-1">
            {isAdmin && <Badge>管理員</Badge>}
            {isSuspended && <Badge variant="destructive">已停用</Badge>}
          </div>
        </div>
      </div>

      {/* 基本資料（可編輯） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            基本資料
          </CardTitle>
          <CardDescription>可修改使用者的基本聯絡資訊</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="使用者姓名"
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
              <Label htmlFor="phone">電話</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xx-xxx-xxx"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LINE ID（唯讀） */}
      <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-600" />
            LINE 認證資訊
          </CardTitle>
          <CardDescription>
            LINE User ID 為認證識別碼，修改會導致使用者無法登入，因此僅供查看
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>LINE User ID</Label>
            <Input
              value={lineUserId}
              disabled
              className="bg-muted font-mono text-sm"
            />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              <Shield className="inline h-3 w-3 mr-1" />
              此欄位受安全保護，不可編輯
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push(`/admin/users/${id}`)}>
          取消
        </Button>
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          儲存變更
        </Button>
      </div>
    </div>
  );
}
