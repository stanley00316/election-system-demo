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
import { useHydration } from '@/hooks/use-hydration';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STANCE_OPTIONS = [
  { value: 'STRONG_SUPPORT', label: '強力支持' },
  { value: 'SUPPORT', label: '支持' },
  { value: 'LEAN_SUPPORT', label: '傾向支持' },
  { value: 'NEUTRAL', label: '中立' },
  { value: 'UNDECIDED', label: '未表態' },
  { value: 'LEAN_OPPOSE', label: '傾向反對' },
  { value: 'OPPOSE', label: '反對' },
];

export default function VotersPage() {
  const hydrated = useHydration();
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
  const [filterOpen, setFilterOpen] = useState(false);

  // 計算已啟用的篩選數量
  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

  const handleFilterChange = (key: string, value: string | undefined) => {
    const newFilters = { ...filters };
    if (value === '' || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setFilters(newFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

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

  // 水合完成前顯示載入狀態，避免 SSR 與客戶端渲染不匹配
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  篩選
                  {activeFilterCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">篩選條件</h4>
                    {activeFilterCount > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearFilters}
                        className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        清除全部
                      </Button>
                    )}
                  </div>
                  
                  {/* 政治傾向篩選 */}
                  <div className="space-y-2">
                    <Label>政治傾向</Label>
                    <Select
                      value={filters.stance || '__all__'}
                      onValueChange={(value) => handleFilterChange('stance', value === '__all__' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="全部" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">全部</SelectItem>
                        {STANCE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 影響力分數篩選 */}
                  <div className="space-y-2">
                    <Label>影響力分數</Label>
                    <Select
                      value={filters.influenceRange || '__all__'}
                      onValueChange={(value) => handleFilterChange('influenceRange', value === '__all__' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="全部" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">全部</SelectItem>
                        <SelectItem value="high">高（80+）</SelectItem>
                        <SelectItem value="medium">中（50-79）</SelectItem>
                        <SelectItem value="low">低（50 以下）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 接觸狀態篩選 */}
                  <div className="space-y-2">
                    <Label>接觸狀態</Label>
                    <Select
                      value={filters.contactStatus || '__all__'}
                      onValueChange={(value) => handleFilterChange('contactStatus', value === '__all__' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="全部" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">全部</SelectItem>
                        <SelectItem value="contacted">已接觸</SelectItem>
                        <SelectItem value="not_contacted">未接觸</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => setFilterOpen(false)}
                  >
                    套用篩選
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
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
