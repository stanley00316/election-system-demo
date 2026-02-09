'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { promoterSelfApi } from '@/lib/api';
import {
  Loader2,
  Plus,
  Gift,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'PENDING', label: '待使用' },
  { value: 'ACTIVATED', label: '已啟用' },
  { value: 'ACTIVE', label: '使用中' },
  { value: 'CONVERTED', label: '已轉換' },
  { value: 'EXPIRED', label: '已過期' },
  { value: 'CANCELLED', label: '已取消' },
];

const INVITE_METHOD_OPTIONS = [
  { value: 'LINK', label: '連結' },
  { value: 'CODE', label: '邀請碼' },
  { value: 'DIRECT', label: '直接指定' },
];

const getStatusLabel = (status: string) => {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ACTIVATED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CONVERTED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    EXPIRED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export default function PromoterTrialsPage() {
  const [trials, setTrials] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create form state
  const [formData, setFormData] = useState({
    trialDays: 14,
    inviteMethod: 'CODE',
    inviteeName: '',
    inviteePhone: '',
    inviteeEmail: '',
    channel: 'LINE',
  });

  useEffect(() => {
    loadTrials();
  }, [statusFilter, page]);

  const loadTrials = async () => {
    setIsLoading(true);
    try {
      const result = await promoterSelfApi.getTrialInvites({
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setTrials(result.data);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Failed to load trials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const result = await promoterSelfApi.createTrialInvite({
        trialDays: formData.trialDays,
        inviteMethod: formData.inviteMethod,
        inviteeName: formData.inviteeName || undefined,
        inviteePhone: formData.inviteePhone || undefined,
        inviteeEmail: formData.inviteeEmail || undefined,
        channel: formData.channel,
      });
      setTrials([result, ...trials]);
      setShowCreateForm(false);
      setFormData({
        trialDays: 14,
        inviteMethod: 'CODE',
        inviteeName: '',
        inviteePhone: '',
        inviteeEmail: '',
        channel: 'LINE',
      });
    } catch (err: any) {
      alert(err?.message || '建立失敗');
    } finally {
      setIsCreating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          發放新試用
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">發放新試用邀請</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">試用天數</label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={formData.trialDays}
                  onChange={(e) =>
                    setFormData({ ...formData, trialDays: parseInt(e.target.value) || 14 })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">邀請方式</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={formData.inviteMethod}
                  onChange={(e) => setFormData({ ...formData, inviteMethod: e.target.value })}
                >
                  {INVITE_METHOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">受邀者姓名（選填）</label>
                <Input
                  value={formData.inviteeName}
                  onChange={(e) => setFormData({ ...formData, inviteeName: e.target.value })}
                  placeholder="輸入姓名"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">受邀者電話（選填）</label>
                <Input
                  value={formData.inviteePhone}
                  onChange={(e) => setFormData({ ...formData, inviteePhone: e.target.value })}
                  placeholder="輸入電話"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                建立邀請
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Filter */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={statusFilter === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter(opt.value);
                  setPage(1);
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trials List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            試用邀請
            {pagination && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                共 {pagination.total} 筆
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : trials.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">尚無試用邀請</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {trials.map((trial: any) => (
                  <div
                    key={trial.id}
                    className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono font-bold">{trial.code}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(trial.code)}
                        >
                          {copiedCode === trial.code ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trial.status)}`}>
                          {getStatusLabel(trial.status)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{trial.trialDays} 天試用</span>
                        {trial.inviteeName && <span>受邀者：{trial.inviteeName}</span>}
                        {trial.plan?.name && <span>方案：{trial.plan.name}</span>}
                        {trial.activatedUser?.name && (
                          <span>啟用者：{trial.activatedUser.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(trial.createdAt).toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    第 {pagination.page} / {pagination.totalPages} 頁
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
