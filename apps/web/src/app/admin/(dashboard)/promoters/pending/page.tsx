'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, X, Clock } from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { adminPromotersApi } from '@/lib/api';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';

export default function PendingPromotersPage() {
  return (
    <SuperAdminGuard>
      <PendingPromotersContent />
    </SuperAdminGuard>
  );
}

function PendingPromotersContent() {
  const { toast } = useToast();
  const [promoters, setPromoters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; promoter: any }>({
    open: false, promoter: null,
  });
  const [reviewData, setReviewData] = useState({
    rewardType: 'NONE',
    fixedAmount: '',
    percentage: '',
    extensionMonths: '',
    canIssueTrial: true,
    defaultTrialDays: '14',
    notes: '',
  });

  useEffect(() => { loadPending(); }, []);

  const loadPending = async () => {
    setIsLoading(true);
    try {
      const data = await adminPromotersApi.getPendingPromoters();
      setPromoters(data);
    } catch (error) {
      console.error('Failed to load pending promoters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    const p = reviewDialog.promoter;
    if (!p) return;

    try {
      const body: any = {};

      // 獎勵設定
      if (reviewData.rewardType !== 'NONE') {
        body.rewardConfig = {
          rewardType: reviewData.rewardType,
          ...(reviewData.rewardType === 'FIXED_AMOUNT' && { fixedAmount: parseFloat(reviewData.fixedAmount) }),
          ...(reviewData.rewardType === 'PERCENTAGE' && { percentage: parseFloat(reviewData.percentage) }),
          ...(reviewData.rewardType === 'SUBSCRIPTION_EXTENSION' && { extensionMonths: parseInt(reviewData.extensionMonths || '1', 10) }),
        };
      } else {
        body.rewardConfig = { rewardType: 'NONE' };
      }

      // 試用設定
      body.trialConfig = {
        canIssueTrial: reviewData.canIssueTrial,
        defaultTrialDays: parseInt(reviewData.defaultTrialDays, 10),
      };

      await adminPromotersApi.approvePromoter(p.id, body);
      toast({ title: `已核准 ${p.name}` });
      setReviewDialog({ open: false, promoter: null });
      loadPending();
    } catch (error) {
      toast({ title: '操作失敗', variant: 'destructive' });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await adminPromotersApi.rejectPromoter(id);
      toast({ title: '已駁回申請' });
      loadPending();
    } catch (error) {
      toast({ title: '操作失敗', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/admin/promoters" />
        <div>
          <h1 className="text-2xl font-bold">待審核推廣者</h1>
          <p className="text-muted-foreground">審核外部推廣者的申請</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : promoters.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">目前沒有待審核的申請</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>電話</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>LINE ID</TableHead>
                  <TableHead>推廣碼</TableHead>
                  <TableHead>申請時間</TableHead>
                  <TableHead>備註</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoters.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.phone || '---'}</TableCell>
                    <TableCell>{p.email || '---'}</TableCell>
                    <TableCell>{p.lineId || '---'}</TableCell>
                    <TableCell className="font-mono text-sm">{p.referralCode}</TableCell>
                    <TableCell className="text-sm">{format(new Date(p.createdAt), 'yyyy/MM/dd HH:mm')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-32 truncate">{p.notes || '---'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            setReviewDialog({ open: true, promoter: p });
                            setReviewData({
                              rewardType: 'NONE',
                              fixedAmount: '',
                              percentage: '',
                              extensionMonths: '',
                              canIssueTrial: true,
                              defaultTrialDays: '14',
                              notes: '',
                            });
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" /> 審核
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(p.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 審核對話框 */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => setReviewDialog((d) => ({ ...d, open }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>審核推廣者申請 - {reviewDialog.promoter?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 申請人資訊 */}
            <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
              <p><strong>姓名：</strong>{reviewDialog.promoter?.name}</p>
              <p><strong>電話：</strong>{reviewDialog.promoter?.phone || '未提供'}</p>
              <p><strong>Email：</strong>{reviewDialog.promoter?.email || '未提供'}</p>
              {reviewDialog.promoter?.notes && <p><strong>自我介紹：</strong>{reviewDialog.promoter.notes}</p>}
            </div>

            {/* 獎勵方案 */}
            <div>
              <Label>獎勵方案</Label>
              <Select
                value={reviewData.rewardType}
                onValueChange={(v) => setReviewData((d) => ({ ...d, rewardType: v }))}
              >
                <SelectTrigger className="mt-1">
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

            {reviewData.rewardType === 'FIXED_AMOUNT' && (
              <div>
                <Label>每次獎勵金額 (NT$)</Label>
                <Input
                  type="number"
                  value={reviewData.fixedAmount}
                  onChange={(e) => setReviewData((d) => ({ ...d, fixedAmount: e.target.value }))}
                  placeholder="300"
                  className="mt-1"
                />
              </div>
            )}

            {reviewData.rewardType === 'PERCENTAGE' && (
              <div>
                <Label>佣金比例 (%)</Label>
                <Input
                  type="number"
                  value={reviewData.percentage}
                  onChange={(e) => setReviewData((d) => ({ ...d, percentage: e.target.value }))}
                  placeholder="10"
                  className="mt-1"
                />
              </div>
            )}

            {reviewData.rewardType === 'SUBSCRIPTION_EXTENSION' && (
              <div>
                <Label>延長月數</Label>
                <Input
                  type="number"
                  value={reviewData.extensionMonths}
                  onChange={(e) => setReviewData((d) => ({ ...d, extensionMonths: e.target.value }))}
                  placeholder="1"
                  className="mt-1"
                />
              </div>
            )}

            {/* 試用設定 */}
            <div className="border-t pt-3">
              <Label>試用權限</Label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={reviewData.canIssueTrial}
                    onChange={(e) => setReviewData((d) => ({ ...d, canIssueTrial: e.target.checked }))}
                  />
                  允許發放試用
                </label>
                {reviewData.canIssueTrial && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">預設天數：</Label>
                    <Input
                      type="number"
                      value={reviewData.defaultTrialDays}
                      onChange={(e) => setReviewData((d) => ({ ...d, defaultTrialDays: e.target.value }))}
                      className="w-20"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog({ open: false, promoter: null })}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => {
              handleReject(reviewDialog.promoter?.id);
              setReviewDialog({ open: false, promoter: null });
            }}>
              駁回
            </Button>
            <Button onClick={handleApprove}>核准並啟用</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
