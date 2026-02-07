'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { schedulesApi, votersApi, googleApi } from '@/lib/api';
import { useCampaignStore } from '@/stores/campaign';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  MapPin,
  Clock,
  User,
  Users,
  Navigation,
  Search,
  CheckCircle,
  XCircle,
  SkipForward,
  Trash2,
  Calendar,
  RefreshCw,
  Loader2,
} from 'lucide-react';

const RELATION_TYPE_LABELS: Record<string, string> = {
  FAMILY: '家人',
  SPOUSE: '配偶',
  PARENT: '父母',
  CHILD: '子女',
  SIBLING: '兄弟姊妹',
  NEIGHBOR: '鄰居',
  FRIEND: '朋友',
  COLLEAGUE: '同事',
  COMMUNITY: '社區',
  OTHER: '其他',
};
import { useToast } from '@/hooks/use-toast';
import { RouteMapDialog } from '@/components/schedules';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PLANNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const ITEM_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  SKIPPED: 'bg-red-100 text-red-800',
};

export default function ScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { currentCampaign } = useCampaignStore();
  const { toast } = useToast();
  const scheduleId = params.id as string;
  
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [routeMapDialogOpen, setRouteMapDialogOpen] = useState(false);
  const [voterSearch, setVoterSearch] = useState('');
  const [selectedVoter, setSelectedVoter] = useState<any>(null);

  // 檢查 URL 參數，自動開啟路線地圖
  useEffect(() => {
    if (searchParams.get('openRouteMap') === 'true') {
      setRouteMapDialogOpen(true);
      // 清除 URL 參數
      router.replace(`/dashboard/schedules/${scheduleId}`);
    }
  }, [searchParams, scheduleId, router]);

  const { data: schedule, isLoading, error } = useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => schedulesApi.getById(scheduleId),
    enabled: !!scheduleId,
  });

  // Google Calendar 連結狀態
  const { data: googleStatus } = useQuery({
    queryKey: ['google-status'],
    queryFn: () => googleApi.getStatus(),
  });

  const { data: voterSearchResults } = useQuery({
    queryKey: ['voters', 'search', voterSearch, currentCampaign?.id],
    queryFn: () =>
      votersApi.getAll({
        campaignId: currentCampaign?.id,
        search: voterSearch,
        limit: 10,
      }),
    enabled: !!voterSearch && voterSearch.length >= 2 && !!currentCampaign?.id,
  });

  const addItemMutation = useMutation({
    mutationFn: (data: any) => schedulesApi.addItem(scheduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      setAddItemDialogOpen(false);
      setSelectedVoter(null);
      setVoterSearch('');
      toast({
        title: '成功',
        description: '已新增行程項目',
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => schedulesApi.removeItem(scheduleId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      toast({
        title: '成功',
        description: '已移除行程項目',
      });
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '移除失敗',
      });
    },
  });

  const updateItemStatusMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
      schedulesApi.updateItemStatus(scheduleId, itemId, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      const statusText = variables.status === 'COMPLETED' ? '已完成' : '已跳過';
      toast({
        title: '狀態已更新',
        description: `行程項目標記為${statusText}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '更新狀態失敗',
        variant: 'destructive',
      });
    },
  });

  // Google Calendar 同步 mutation
  const syncToGoogleMutation = useMutation({
    mutationFn: () => schedulesApi.syncToGoogle(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      toast({
        title: '同步成功',
        description: '行程已同步到 Google 行事曆',
      });
    },
    onError: (error: any) => {
      toast({
        title: '同步失敗',
        description: error.message || '無法同步到 Google 行事曆',
        variant: 'destructive',
      });
    },
  });

  const selectVoter = (voter: any) => {
    setSelectedVoter(voter);
    setVoterSearch('');
  };

  const handleAddItem = () => {
    if (!selectedVoter) return;
    
    addItemMutation.mutate({
      type: 'VOTER_VISIT',
      voterId: selectedVoter.id,
      address: selectedVoter.address,
      locationLat: selectedVoter.latitude,
      locationLng: selectedVoter.longitude,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">行程不存在</p>
            <Link href="/dashboard/schedules">
              <Button variant="outline" className="mt-4">
                返回行程列表
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/dashboard/schedules">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {formatDate(schedule.date, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold truncate">{schedule.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-11 sm:ml-0">
          <Badge className={`${STATUS_STYLES[schedule.status]} whitespace-nowrap`}>
            {schedule.status === 'DRAFT' ? '草稿' :
             schedule.status === 'PLANNED' ? '已規劃' :
             schedule.status === 'IN_PROGRESS' ? '進行中' :
             schedule.status === 'COMPLETED' ? '已完成' :
             schedule.status === 'CANCELLED' ? '已取消' : schedule.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Schedule Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-semibold">行程項目</h2>
            <div className="flex gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 sm:px-4"
                onClick={() => setRouteMapDialogOpen(true)}
                disabled={!schedule.items?.length}
              >
                <Navigation className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">優化路線</span>
              </Button>
              <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 px-2 sm:px-4">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">新增項目</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新增行程項目</DialogTitle>
                    <DialogDescription>
                      搜尋並選擇要拜訪的選民
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {selectedVoter ? (
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="font-medium">
                              {selectedVoter.name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{selectedVoter.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedVoter.address || '無地址'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedVoter(null)}
                        >
                          更換
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="搜尋選民..."
                            className="pl-10"
                            value={voterSearch}
                            onChange={(e) => setVoterSearch(e.target.value)}
                          />
                        </div>
                        {voterSearchResults?.data?.length > 0 && (
                          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                            {voterSearchResults.data.map((voter: any) => (
                              <button
                                key={voter.id}
                                type="button"
                                className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left"
                                onClick={() => selectVoter(voter)}
                              >
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <span className="text-sm">
                                    {voter.name?.charAt(0)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{voter.name}</p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {voter.address || '無地址'}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddItemDialogOpen(false);
                        setSelectedVoter(null);
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleAddItem}
                      disabled={!selectedVoter || addItemMutation.isPending}
                    >
                      {addItemMutation.isPending ? '新增中...' : '新增'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {schedule.items?.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {schedule.items.map((item: any, index: number) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 sm:gap-4 p-3 sm:p-4"
                    >
                      <div className="flex flex-col items-center shrink-0">
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-medium">
                          {index + 1}
                        </div>
                        {index < schedule.items.length - 1 && (
                          <div className="w-0.5 h-full min-h-[40px] bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-start sm:items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base truncate">
                              {item.voter ? (
                                <Link href={`/dashboard/voters/${item.voter.id}`} className="text-primary hover:underline">
                                  {item.voter.name}
                                </Link>
                              ) : (item.event?.name || item.address || '未命名')}
                            </p>
                            <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                              {item.plannedTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(item.plannedTime, {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                              {item.address && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-[120px] sm:max-w-[200px]">{item.address}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                            <Badge className={`${ITEM_STATUS_STYLES[item.status]} whitespace-nowrap text-xs`}>
                              {item.status === 'PENDING' ? '待執行' :
                               item.status === 'IN_PROGRESS' ? '進行中' :
                               item.status === 'COMPLETED' ? '已完成' : '已跳過'}
                            </Badge>
                            {item.status === 'PENDING' && (
                              <div className="flex">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  onClick={() => updateItemStatusMutation.mutate({ itemId: item.id, status: 'COMPLETED' })}
                                  disabled={updateItemStatusMutation.isPending}
                                  title="標記為已完成"
                                >
                                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  onClick={() => updateItemStatusMutation.mutate({ itemId: item.id, status: 'SKIPPED' })}
                                  disabled={updateItemStatusMutation.isPending}
                                  title="標記為已跳過"
                                >
                                  <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600" />
                                </Button>
                              </div>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              onClick={() => removeItemMutation.mutate(item.id)}
                              disabled={removeItemMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        {/* 顯示與行程內其他選民的關係 */}
                        {item.voter?.relationsInSchedule?.length > 0 && (
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">關係：</span>
                            <div className="flex flex-wrap gap-1">
                              {item.voter.relationsInSchedule.map((rel: any) => (
                                <Badge key={rel.id} variant="secondary" className="text-xs">
                                  <Link href={`/dashboard/voters/${rel.relatedVoter?.id}`} className="text-primary hover:underline">
                                    {rel.relatedVoter?.name}
                                  </Link>（{RELATION_TYPE_LABELS[rel.relationType] || rel.relationType}）
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.travelDistance && (
                          <p className="text-xs text-muted-foreground mt-2">
                            距離下一點：{(item.travelDistance / 1000).toFixed(1)} 公里
                            {item.travelDuration && `（約 ${Math.round(item.travelDuration / 60)} 分鐘）`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">尚未加入行程項目</p>
                <Button onClick={() => setAddItemDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  新增項目
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>行程統計</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">行程項目</span>
                <span className="font-medium">{schedule.items?.length || 0} 個</span>
              </div>
              {schedule.totalDistance && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">總距離</span>
                  <span className="font-medium">
                    {(schedule.totalDistance / 1000).toFixed(1)} 公里
                  </span>
                </div>
              )}
              {schedule.estimatedDuration && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">預估時間</span>
                  <span className="font-medium">
                    {Math.round(schedule.estimatedDuration / 60)} 分鐘
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">已完成</span>
                <span className="font-medium">
                  {schedule.items?.filter((i: any) => i.status === 'COMPLETED').length || 0} 個
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Google Calendar Sync */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Google 行事曆
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {googleStatus?.connected ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">同步狀態</span>
                    <span className={schedule.googleEventId ? 'text-green-600' : 'text-muted-foreground'}>
                      {schedule.googleEventId ? '已同步' : '未同步'}
                    </span>
                  </div>
                  {schedule.lastSyncedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">上次同步</span>
                      <span>{formatDate(schedule.lastSyncedAt, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => syncToGoogleMutation.mutate()}
                    disabled={syncToGoogleMutation.isPending}
                  >
                    {syncToGoogleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {schedule.googleEventId ? '重新同步' : '同步至 Google'}
                  </Button>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    尚未連結 Google 帳號
                  </p>
                  <Link href="/dashboard/settings">
                    <Button variant="outline" size="sm">
                      前往設定
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {schedule.description && (
            <Card>
              <CardHeader>
                <CardTitle>說明</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{schedule.description}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Route Map Dialog */}
      <RouteMapDialog
        open={routeMapDialogOpen}
        onOpenChange={setRouteMapDialogOpen}
        scheduleId={scheduleId}
        schedule={schedule}
      />
    </div>
  );
}
