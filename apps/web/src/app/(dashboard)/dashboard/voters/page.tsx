'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCampaignStore } from '@/stores/campaign';
import { votersApi } from '@/lib/api';
import { formatRelativeTime, getStanceColor, getStanceLabel } from '@/lib/utils';
import {
  Search,
  Plus,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Loader2,
  CalendarPlus,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { VoterImportDialog } from '@/components/voters/VoterImportDialog';
import { AddToScheduleDialog } from '@/components/voters/AddToScheduleDialog';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';

export default function VotersPage() {
  const { currentCampaign } = useCampaignStore();
  const campaignId = currentCampaign?.id;
  const { toast } = useToast();
  const { canEdit, canCreateVoter } = usePermissions();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [isExporting, setIsExporting] = useState(false);
  const [selectedVoters, setSelectedVoters] = useState<Map<string, any>>(new Map());
  const [addToScheduleOpen, setAddToScheduleOpen] = useState(false);

  const handleExport = async () => {
    if (!campaignId) return;
    
    setIsExporting(true);
    try {
      await votersApi.exportExcel(campaignId);
      toast({
        title: '匯出成功',
        description: '選民資料已下載',
      });
    } catch (error: any) {
      toast({
        title: '匯出失敗',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['voters', campaignId, page, search, filters],
    queryFn: () =>
      votersApi.getAll({
        campaignId,
        page,
        limit: 20,
        search: search || undefined,
        ...filters,
      }),
    enabled: !!campaignId,
  });

  if (!currentCampaign) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">請先選擇選舉活動</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">選民管理</h1>
          <p className="text-muted-foreground">
            共 {data?.pagination?.total || 0} 位選民
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && <VoterImportDialog campaignId={campaignId || ''} />}
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? '匯出中...' : '匯出'}
          </Button>
          {canCreateVoter && (
            <Link href="/dashboard/voters/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新增選民
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋姓名、電話、地址..."
                className="pl-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              篩選
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 批量選擇工具列 */}
      {selectedVoters.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              已選擇 {selectedVoters.size} 位選民
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedVoters(new Map())}
            >
              <X className="h-4 w-4 mr-1" />
              取消選擇
            </Button>
          </div>
          <Button onClick={() => setAddToScheduleOpen(true)}>
            <CalendarPlus className="h-4 w-4 mr-2" />
            加入行程
          </Button>
        </div>
      )}

      {/* Voters List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              載入失敗，請重試
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              沒有找到選民資料
            </div>
          ) : (
            <div className="divide-y">
              {data?.data?.map((voter: any) => (
                <div
                  key={voter.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={selectedVoters.has(voter.id)}
                    onCheckedChange={(checked) => {
                      const newSelected = new Map(selectedVoters);
                      if (checked) {
                        newSelected.set(voter.id, voter);
                      } else {
                        newSelected.delete(voter.id);
                      }
                      setSelectedVoters(newSelected);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />

                  {/* 可點擊的內容區域 */}
                  <Link
                    href={`/dashboard/voters/${voter.id}`}
                    className="flex items-center gap-4 flex-1 min-w-0"
                  >
                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-lg font-medium">
                        {voter.name?.charAt(0)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{voter.name}</span>
                        <Badge
                          className={getStanceColor(voter.stance)}
                          variant="secondary"
                        >
                          {getStanceLabel(voter.stance)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {voter.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {voter.phone}
                          </span>
                        )}
                        {voter.address && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" />
                            {voter.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-sm">
                        接觸 {voter.contactCount} 次
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {voter.lastContactAt
                          ? formatRelativeTime(voter.lastContactAt)
                          : '尚未接觸'}
                      </div>
                    </div>

                    {/* Influence */}
                    <div className="shrink-0 hidden md:block">
                      <div className="h-10 w-10 rounded-full border-2 flex items-center justify-center text-sm font-medium">
                        {voter.influenceScore}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                第 {page} 頁，共 {data.pagination.totalPages} 頁
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage(Math.min(data.pagination.totalPages, page + 1))
                  }
                  disabled={page >= data.pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 加入行程對話框 */}
      <AddToScheduleDialog
        voters={Array.from(selectedVoters.values()).map((voter) => ({
          id: voter.id,
          name: voter.name,
          address: voter.address,
          latitude: voter.latitude,
          longitude: voter.longitude,
        }))}
        open={addToScheduleOpen}
        onOpenChange={setAddToScheduleOpen}
        onSuccess={() => setSelectedVoters(new Map())}
      />
    </div>
  );
}
