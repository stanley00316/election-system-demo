'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Edit, Ban, CheckCircle, Phone, Mail, MessageSquare,
  Copy, TrendingUp, Users, TestTube, Award, Eye, Link2,
} from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { adminPromotersApi } from '@/lib/api';
import {
  getPromoterTypeLabel, getPromoterStatusLabel, getRewardTypeLabel,
  getPromoterReferralStatusLabel, getTrialInviteStatusLabel,
  getTrialInviteMethodLabel, getShareChannelLabel,
} from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';

export default function PromoterDetailPage() {
  return (
    <SuperAdminGuard>
      <PromoterDetailContent />
    </SuperAdminGuard>
  );
}

function PromoterDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [promoter, setPromoter] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [trials, setTrials] = useState<any[]>([]);
  const [shareLinks, setShareLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [promoterData, refData, trialData, linksData] = await Promise.all([
        adminPromotersApi.getPromoter(id),
        adminPromotersApi.getPromoterReferrals(id, { limit: 50 }),
        adminPromotersApi.getPromoterTrialInvites(id, { limit: 50 }),
        adminPromotersApi.getPromoterShareLinks(id),
      ]);
      setPromoter(promoterData);
      setReferrals(refData.data);
      setTrials(trialData.data);
      setShareLinks(linksData);
    } catch (error) {
      console.error('Failed to load promoter:', error);
      toast({ title: '載入失敗', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspend = async () => {
    try {
      await adminPromotersApi.suspendPromoter(id);
      toast({ title: '已停用推廣者' });
      loadData();
    } catch (error) {
      toast({ title: '操作失敗', variant: 'destructive' });
    }
  };

  const handleActivate = async () => {
    try {
      await adminPromotersApi.activatePromoter(id);
      toast({ title: '已重新啟用推廣者' });
      loadData();
    } catch (error) {
      toast({ title: '操作失敗', variant: 'destructive' });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      SUSPENDED: 'bg-red-100 text-red-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      CLICKED: 'bg-gray-100 text-gray-800',
      REGISTERED: 'bg-blue-100 text-blue-800',
      TRIAL: 'bg-purple-100 text-purple-800',
      SUBSCRIBED: 'bg-green-100 text-green-800',
      RENEWED: 'bg-emerald-100 text-emerald-800',
      EXPIRED: 'bg-red-100 text-red-800',
      CONVERTED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!promoter) {
    return (
      <div className="p-6 text-center text-muted-foreground">推廣者不存在</div>
    );
  }

  const { stats } = promoter;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton href="/admin/promoters" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{promoter.name}</h1>
            <Badge className={getStatusBadgeColor(promoter.status)}>
              {getPromoterStatusLabel(promoter.status)}
            </Badge>
            <Badge variant="outline">{getPromoterTypeLabel(promoter.type)}</Badge>
          </div>
          <p className="text-muted-foreground">
            推廣碼：<span className="font-mono font-medium">{promoter.referralCode}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {promoter.status === 'ACTIVE' ? (
            <Button variant="destructive" size="sm" onClick={handleSuspend}>
              <Ban className="h-4 w-4 mr-1" /> 停用
            </Button>
          ) : promoter.status === 'SUSPENDED' ? (
            <Button variant="default" size="sm" onClick={handleActivate}>
              <CheckCircle className="h-4 w-4 mr-1" /> 重新啟用
            </Button>
          ) : null}
        </div>
      </div>

      {/* 基本資訊 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">聯絡資訊</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {promoter.phone && (
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {promoter.phone}</div>
            )}
            {promoter.email && (
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {promoter.email}</div>
            )}
            {promoter.lineId && (
              <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground" /> {promoter.lineId}</div>
            )}
            {promoter.approver && (
              <div className="text-muted-foreground mt-2">
                審核人：{promoter.approver.name}
                {promoter.approvedAt && ` · ${format(new Date(promoter.approvedAt), 'yyyy/MM/dd')}`}
              </div>
            )}
            {promoter.notes && <p className="text-muted-foreground italic mt-2">{promoter.notes}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">獎勵設定</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {promoter.rewardConfig ? (
              <>
                <p>類型：{getRewardTypeLabel(promoter.rewardConfig.rewardType)}</p>
                {promoter.rewardConfig.fixedAmount && <p>金額：NT$ {Number(promoter.rewardConfig.fixedAmount).toLocaleString()} / 次</p>}
                {promoter.rewardConfig.percentage && <p>比例：{Number(promoter.rewardConfig.percentage)}%</p>}
                {promoter.rewardConfig.extensionMonths && <p>延長：{promoter.rewardConfig.extensionMonths} 個月</p>}
                {promoter.rewardConfig.maxRewardsPerMonth && <p>每月上限：{promoter.rewardConfig.maxRewardsPerMonth} 次</p>}
              </>
            ) : (
              <p className="text-muted-foreground">尚未設定</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">試用設定</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {promoter.trialConfig ? (
              <>
                <p>可發放試用：{promoter.trialConfig.canIssueTrial ? '是' : '否'}</p>
                <p>天數範圍：{promoter.trialConfig.minTrialDays} ~ {promoter.trialConfig.maxTrialDays} 天</p>
                <p>預設天數：{promoter.trialConfig.defaultTrialDays} 天</p>
                {promoter.trialConfig.monthlyIssueLimit && <p>每月上限：{promoter.trialConfig.monthlyIssueLimit} 次</p>}
                {promoter.trialConfig.trialPlan && <p>試用方案：{promoter.trialConfig.trialPlan.name}</p>}
              </>
            ) : (
              <p className="text-muted-foreground">尚未設定（使用系統預設）</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[
          { icon: Eye, label: '總點擊', value: stats.totalClicks },
          { icon: Users, label: '已註冊', value: stats.registeredCount },
          { icon: TrendingUp, label: '已訂閱', value: stats.subscribedCount },
          { icon: TestTube, label: '試用發放', value: stats.trialTotal },
          { icon: Award, label: '累計獎勵', value: `NT$ ${Number(stats.totalReward).toLocaleString()}` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <s.icon className="h-4 w-4" />
                {s.label}
              </div>
              <p className="text-xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 分頁內容 */}
      <Tabs defaultValue="referrals">
        <TabsList>
          <TabsTrigger value="referrals">推薦紀錄 ({promoter._count.referrals})</TabsTrigger>
          <TabsTrigger value="trials">試用紀錄 ({promoter._count.trialInvites})</TabsTrigger>
          <TabsTrigger value="links">分享連結 ({promoter._count.shareLinks})</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>被推薦人</TableHead>
                    <TableHead>管道</TableHead>
                    <TableHead>點擊時間</TableHead>
                    <TableHead>註冊時間</TableHead>
                    <TableHead>訂閱時間</TableHead>
                    <TableHead>狀態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">尚無推薦紀錄</TableCell>
                    </TableRow>
                  ) : referrals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.referredUser?.name || r.referredName || '(未知)'}</TableCell>
                      <TableCell>{r.channel ? getShareChannelLabel(r.channel) : '---'}</TableCell>
                      <TableCell className="text-sm">{r.clickedAt ? format(new Date(r.clickedAt), 'MM/dd HH:mm') : '---'}</TableCell>
                      <TableCell className="text-sm">{r.registeredAt ? format(new Date(r.registeredAt), 'MM/dd HH:mm') : '---'}</TableCell>
                      <TableCell className="text-sm">{r.subscribedAt ? format(new Date(r.subscribedAt), 'MM/dd HH:mm') : '---'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(r.status)}>
                          {getPromoterReferralStatusLabel(r.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trials">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>邀請對象</TableHead>
                    <TableHead>發放方式</TableHead>
                    <TableHead>天數</TableHead>
                    <TableHead>管道</TableHead>
                    <TableHead>發放時間</TableHead>
                    <TableHead>啟用時間</TableHead>
                    <TableHead>到期時間</TableHead>
                    <TableHead>狀態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">尚無試用紀錄</TableCell>
                    </TableRow>
                  ) : trials.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.activatedUser?.name || t.inviteeName || '(未領取)'}</TableCell>
                      <TableCell>{getTrialInviteMethodLabel(t.inviteMethod)}</TableCell>
                      <TableCell>{t.trialDays} 天</TableCell>
                      <TableCell>{t.channel ? getShareChannelLabel(t.channel) : '---'}</TableCell>
                      <TableCell className="text-sm">{format(new Date(t.createdAt), 'MM/dd')}</TableCell>
                      <TableCell className="text-sm">{t.activatedAt ? format(new Date(t.activatedAt), 'MM/dd') : '---'}</TableCell>
                      <TableCell className="text-sm">{t.expiresAt ? format(new Date(t.expiresAt), 'MM/dd') : '---'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(t.status)}>
                          {getTrialInviteStatusLabel(t.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>連結代碼</TableHead>
                    <TableHead>管道</TableHead>
                    <TableHead className="text-right">點擊數</TableHead>
                    <TableHead className="text-right">轉換數</TableHead>
                    <TableHead>建立時間</TableHead>
                    <TableHead>狀態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shareLinks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">尚無分享連結</TableCell>
                    </TableRow>
                  ) : shareLinks.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-sm">/r/{l.code}</TableCell>
                      <TableCell>{getShareChannelLabel(l.channel)}</TableCell>
                      <TableCell className="text-right">{l._count?.clicks || l.clickCount}</TableCell>
                      <TableCell className="text-right">{l._count?.referrals || 0}</TableCell>
                      <TableCell className="text-sm">{format(new Date(l.createdAt), 'yyyy/MM/dd')}</TableCell>
                      <TableCell>
                        <Badge className={l.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {l.isActive ? '啟用' : '停用'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
