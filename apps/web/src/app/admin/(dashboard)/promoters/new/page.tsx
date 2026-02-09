'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { adminPromotersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';

export default function NewPromoterPage() {
  return (
    <SuperAdminGuard>
      <NewPromoterContent />
    </SuperAdminGuard>
  );
}

function NewPromoterContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 基本資料
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [lineId, setLineId] = useState('');
  const [type, setType] = useState<string>('EXTERNAL');
  const [userId, setUserId] = useState('');
  const [notes, setNotes] = useState('');

  // 獎勵設定
  const [rewardType, setRewardType] = useState<string>('NONE');
  const [fixedAmount, setFixedAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [extensionMonths, setExtensionMonths] = useState('');
  const [maxRewardsPerMonth, setMaxRewardsPerMonth] = useState('');

  // 試用設定
  const [canIssueTrial, setCanIssueTrial] = useState(false);
  const [defaultTrialDays, setDefaultTrialDays] = useState('7');
  const [minTrialDays, setMinTrialDays] = useState('3');
  const [maxTrialDays, setMaxTrialDays] = useState('30');
  const [monthlyIssueLimit, setMonthlyIssueLimit] = useState('10');
  const [totalIssueLimit, setTotalIssueLimit] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: '請輸入姓名',
        description: '推廣者姓名為必填欄位',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const data: any = {
        name: name.trim(),
        type,
      };

      if (phone) data.phone = phone.trim();
      if (email) data.email = email.trim();
      if (lineId) data.lineId = lineId.trim();
      if (userId) data.userId = userId.trim();
      if (notes) data.notes = notes.trim();

      // 獎勵設定
      if (rewardType !== 'NONE') {
        data.rewardConfig = {
          rewardType,
        };
        if (rewardType === 'FIXED_AMOUNT' && fixedAmount) {
          data.rewardConfig.fixedAmount = Number(fixedAmount);
        }
        if (rewardType === 'PERCENTAGE' && percentage) {
          data.rewardConfig.percentage = Number(percentage);
        }
        if (rewardType === 'SUBSCRIPTION_EXTENSION' && extensionMonths) {
          data.rewardConfig.extensionMonths = Number(extensionMonths);
        }
        if (maxRewardsPerMonth) {
          data.rewardConfig.maxRewardsPerMonth = Number(maxRewardsPerMonth);
        }
      } else {
        data.rewardConfig = { rewardType: 'NONE' };
      }

      // 試用設定
      if (canIssueTrial) {
        data.trialConfig = {
          canIssueTrial: true,
          defaultTrialDays: Number(defaultTrialDays) || 7,
          minTrialDays: Number(minTrialDays) || 3,
          maxTrialDays: Number(maxTrialDays) || 30,
          monthlyIssueLimit: Number(monthlyIssueLimit) || 10,
        };
        if (totalIssueLimit) {
          data.trialConfig.totalIssueLimit = Number(totalIssueLimit);
        }
      }

      const result = await adminPromotersApi.createPromoter(data);
      toast({
        title: '建立成功',
        description: `推廣者 ${name} 已建立，推廣碼為 ${result.referralCode}`,
      });
      router.push(`/admin/promoters/${result.id}`);
    } catch (error: any) {
      console.error('Failed to create promoter:', error);
      toast({
        title: '建立失敗',
        description: error?.message || '建立推廣者時發生錯誤',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton href="/admin/promoters" />
        <div>
          <h1 className="text-2xl font-bold">新增推廣者</h1>
          <p className="text-muted-foreground">建立新的推廣者帳號</p>
        </div>
      </div>

      {/* 基本資料 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本資料</CardTitle>
          <CardDescription>推廣者的基本聯絡資訊</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                姓名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="輸入推廣者姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">推廣者類型</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">訂閱者（現有使用者）</SelectItem>
                  <SelectItem value="EXTERNAL">外部推廣者</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">電話</Label>
              <Input
                id="phone"
                placeholder="09xx-xxx-xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lineId">LINE ID</Label>
              <Input
                id="lineId"
                placeholder="LINE 帳號 ID"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
              />
            </div>
            {type === 'INTERNAL' && (
              <div className="space-y-2">
                <Label htmlFor="userId">綁定使用者 ID</Label>
                <Input
                  id="userId"
                  placeholder="系統使用者 ID（選填）"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">備註</Label>
            <Textarea
              id="notes"
              placeholder="額外備註資訊..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 獎勵設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">獎勵設定</CardTitle>
          <CardDescription>設定推廣成功後的獎勵方案</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>獎勵類型</Label>
            <Select value={rewardType} onValueChange={setRewardType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">無獎勵（純追蹤）</SelectItem>
                <SelectItem value="FIXED_AMOUNT">固定金額</SelectItem>
                <SelectItem value="PERCENTAGE">百分比佣金</SelectItem>
                <SelectItem value="SUBSCRIPTION_EXTENSION">延長訂閱</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rewardType === 'FIXED_AMOUNT' && (
            <div className="space-y-2">
              <Label htmlFor="fixedAmount">每次獎勵金額（NT$）</Label>
              <Input
                id="fixedAmount"
                type="number"
                placeholder="例如：500"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
              />
            </div>
          )}

          {rewardType === 'PERCENTAGE' && (
            <div className="space-y-2">
              <Label htmlFor="percentage">佣金比例（%）</Label>
              <Input
                id="percentage"
                type="number"
                placeholder="例如：10"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
              />
            </div>
          )}

          {rewardType === 'SUBSCRIPTION_EXTENSION' && (
            <div className="space-y-2">
              <Label htmlFor="extensionMonths">延長月數</Label>
              <Input
                id="extensionMonths"
                type="number"
                placeholder="例如：1"
                value={extensionMonths}
                onChange={(e) => setExtensionMonths(e.target.value)}
              />
            </div>
          )}

          {rewardType !== 'NONE' && (
            <div className="space-y-2">
              <Label htmlFor="maxRewardsPerMonth">每月獎勵上限（次）</Label>
              <Input
                id="maxRewardsPerMonth"
                type="number"
                placeholder="不限制可留空"
                value={maxRewardsPerMonth}
                onChange={(e) => setMaxRewardsPerMonth(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 試用設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">試用設定</CardTitle>
          <CardDescription>是否允許此推廣者發放試用邀請</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>允許發放試用</Label>
              <p className="text-sm text-muted-foreground">
                啟用後，推廣者可以透過後台發放試用邀請碼
              </p>
            </div>
            <Switch checked={canIssueTrial} onCheckedChange={setCanIssueTrial} />
          </div>

          {canIssueTrial && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="defaultTrialDays">預設試用天數</Label>
                <Input
                  id="defaultTrialDays"
                  type="number"
                  value={defaultTrialDays}
                  onChange={(e) => setDefaultTrialDays(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyIssueLimit">每月發放上限</Label>
                <Input
                  id="monthlyIssueLimit"
                  type="number"
                  value={monthlyIssueLimit}
                  onChange={(e) => setMonthlyIssueLimit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minTrialDays">最少試用天數</Label>
                <Input
                  id="minTrialDays"
                  type="number"
                  value={minTrialDays}
                  onChange={(e) => setMinTrialDays(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTrialDays">最多試用天數</Label>
                <Input
                  id="maxTrialDays"
                  type="number"
                  value={maxTrialDays}
                  onChange={(e) => setMaxTrialDays(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalIssueLimit">總發放上限</Label>
                <Input
                  id="totalIssueLimit"
                  type="number"
                  placeholder="不限制可留空"
                  value={totalIssueLimit}
                  onChange={(e) => setTotalIssueLimit(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 送出按鈕 */}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/admin/promoters')}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSubmitting ? '建立中...' : '建立推廣者'}
        </Button>
      </div>
    </div>
  );
}
