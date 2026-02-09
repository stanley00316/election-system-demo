'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { promoterSelfApi } from '@/lib/api';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'CLICKED', label: '已點擊' },
  { value: 'REGISTERED', label: '已註冊' },
  { value: 'SUBSCRIBED', label: '已訂閱' },
  { value: 'RENEWED', label: '已續約' },
];

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    CLICKED: '已點擊',
    REGISTERED: '已註冊',
    SUBSCRIBED: '已訂閱',
    RENEWED: '已續約',
  };
  return labels[status] || status;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    CLICKED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    REGISTERED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    SUBSCRIBED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    RENEWED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const getChannelLabel = (channel: string) => {
  const labels: Record<string, string> = {
    LINE: 'LINE',
    FACEBOOK: 'Facebook',
    SMS: '簡訊',
    QR_CODE: 'QR Code',
    EMAIL: 'Email',
    DIRECT_LINK: '直接連結',
    OTHER: '其他',
  };
  return labels[channel] || channel;
};

export default function PromoterReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReferrals();
  }, [statusFilter, page]);

  const loadReferrals = async () => {
    setIsLoading(true);
    try {
      const result = await promoterSelfApi.getReferrals({
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setReferrals(result.data);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Failed to load referrals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            推薦紀錄
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
          ) : referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              尚無推薦紀錄
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">被推薦者</th>
                      <th className="pb-2 font-medium">狀態</th>
                      <th className="pb-2 font-medium hidden md:table-cell">渠道</th>
                      <th className="pb-2 font-medium hidden md:table-cell">獎勵</th>
                      <th className="pb-2 font-medium">時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((ref: any) => (
                      <tr key={ref.id} className="border-b last:border-0">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                              {ref.referredUser?.name?.charAt(0) || '?'}
                            </div>
                            <span>{ref.referredUser?.name || '匿名'}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ref.status)}`}>
                            {getStatusLabel(ref.status)}
                          </span>
                        </td>
                        <td className="py-3 hidden md:table-cell text-muted-foreground">
                          {ref.shareLink?.channel ? getChannelLabel(ref.shareLink.channel) : '-'}
                        </td>
                        <td className="py-3 hidden md:table-cell">
                          {ref.rewardAmount ? (
                            <span className="text-green-600 font-medium">
                              ${Number(ref.rewardAmount).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground text-xs">
                          {new Date(ref.createdAt).toLocaleDateString('zh-TW')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
