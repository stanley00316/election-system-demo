'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { schedulesApi, votersApi } from '@/lib/api';
import { useCampaignStore } from '@/stores/campaign';
import { RouteMapView } from './RouteMap';
import { VoterSidebar } from './VoterSidebar';
import type { ScheduleItem, NearbyVoter } from './RouteMapView';
import {
  X,
  Navigation,
  Save,
  Loader2,
  MapPin,
  Clock,
  Route,
  ChevronUp,
  ChevronDown,
  GripHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RouteMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  schedule: {
    id: string;
    title: string;
    date: string;
    status: string;
    items: ScheduleItem[];
    totalDistance?: number;
    estimatedDuration?: number;
  };
}

export function RouteMapDialog({
  open,
  onOpenChange,
  scheduleId,
  schedule,
}: RouteMapDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentCampaign } = useCampaignStore();
  const campaignId = currentCampaign?.id;

  const [items, setItems] = useState<ScheduleItem[]>(schedule.items || []);
  const [hasChanges, setHasChanges] = useState(false);
  
  // 手機版底部抽屜狀態
  type SheetState = 'collapsed' | 'half' | 'full';
  const [sheetState, setSheetState] = useState<SheetState>('half');
  const touchStartY = useRef<number>(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // 切換抽屜狀態
  const toggleSheet = () => {
    setSheetState(prev => {
      if (prev === 'collapsed') return 'half';
      if (prev === 'half') return 'full';
      return 'collapsed';
    });
  };

  // 處理觸控開始
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  // 處理觸控結束
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStartY.current - touchEndY;
    const threshold = 50; // 滑動閾值

    if (deltaY > threshold) {
      // 向上滑動 - 展開
      setSheetState(prev => {
        if (prev === 'collapsed') return 'half';
        if (prev === 'half') return 'full';
        return prev;
      });
    } else if (deltaY < -threshold) {
      // 向下滑動 - 收合
      setSheetState(prev => {
        if (prev === 'full') return 'half';
        if (prev === 'half') return 'collapsed';
        return prev;
      });
    }
  };

  // 取得抽屜高度 class
  const getSheetHeightClass = () => {
    switch (sheetState) {
      case 'collapsed': return 'h-14';
      case 'half': return 'h-[45%]';
      case 'full': return 'h-[85%]';
    }
  };

  // 更新 items 當 schedule 改變時
  useEffect(() => {
    setItems(schedule.items || []);
    setHasChanges(false);
  }, [schedule.items]);

  // 計算地圖中心點
  const getMapCenter = useCallback((): [number, number] => {
    const validItems = items.filter(item => item.locationLat && item.locationLng);
    if (validItems.length > 0) {
      const avgLat = validItems.reduce((sum, item) => sum + item.locationLat!, 0) / validItems.length;
      const avgLng = validItems.reduce((sum, item) => sum + item.locationLng!, 0) / validItems.length;
      return [avgLat, avgLng];
    }
    return [25.033, 121.565]; // 預設台北
  }, [items]);

  // 查詢附近選民
  const { data: nearbyVotersData, isLoading: isLoadingNearby } = useQuery({
    queryKey: ['voters', 'nearby', campaignId, getMapCenter()],
    queryFn: async () => {
      const center = getMapCenter();
      // 使用 getNearby API 獲取附近選民
      const response = await votersApi.getNearby({
        campaignId,
        lat: center[0],
        lng: center[1],
        radius: 2, // 2 公里範圍
        limit: 50,
      });
      // 轉換格式
      return (response || []).map((voter: any) => ({
        id: voter.id,
        name: voter.name,
        address: voter.address,
        phone: voter.phone,
        stance: voter.stance,
        influenceScore: voter.influenceScore,
        latitude: voter.latitude,
        longitude: voter.longitude,
      })) as NearbyVoter[];
    },
    enabled: open && !!campaignId,
  });

  // 優化路線 mutation
  const optimizeMutation = useMutation({
    mutationFn: () => {
      const center = getMapCenter();
      return schedulesApi.optimize(scheduleId, { lat: center[0], lng: center[1] });
    },
    onSuccess: (data) => {
      setItems(data.items || []);
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      toast({
        title: '路線已優化',
        description: '已依最短路徑重新排序行程',
      });
    },
    onError: (error: any) => {
      toast({
        title: '優化失敗',
        description: error.message || '無法優化路線',
        variant: 'destructive',
      });
    },
  });

  // 新增行程項目 mutation
  const addItemMutation = useMutation({
    mutationFn: (voter: NearbyVoter) => {
      return schedulesApi.addItem(scheduleId, {
        type: 'VOTER_VISIT',
        voterId: voter.id,
        address: voter.address,
        locationLat: voter.latitude,
        locationLng: voter.longitude,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      toast({
        title: '已新增',
        description: '選民已加入行程',
      });
    },
    onError: (error: any) => {
      toast({
        title: '新增失敗',
        description: error.message || '無法新增行程項目',
        variant: 'destructive',
      });
    },
  });

  // 移除行程項目 mutation
  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => {
      return schedulesApi.removeItem(scheduleId, itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      toast({
        title: '已移除',
        description: '行程項目已移除',
      });
    },
    onError: (error: any) => {
      toast({
        title: '移除失敗',
        description: error.message || '無法移除行程項目',
        variant: 'destructive',
      });
    },
  });

  // 調整順序 mutation
  const reorderMutation = useMutation({
    mutationFn: (itemIds: string[]) => {
      return schedulesApi.reorderItems(scheduleId, itemIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      toast({
        title: '順序已調整',
        description: '拜訪順序已更新',
      });
    },
    onError: (error: any) => {
      toast({
        title: '調整失敗',
        description: error.message || '無法調整順序',
        variant: 'destructive',
      });
    },
  });

  const handleAddVoter = (voter: NearbyVoter) => {
    addItemMutation.mutate(voter);
  };

  const handleRemoveItem = (itemId: string) => {
    removeItemMutation.mutate(itemId);
  };

  const handleReorderItems = (newItemIds: string[]) => {
    // 根據新順序重新排列 items
    const newItems = newItemIds
      .map(id => items.find(item => item.id === id))
      .filter((item): item is ScheduleItem => item !== undefined);
    
    // 更新本地狀態
    setItems(newItems);
    setHasChanges(true);
    
    // 呼叫 API 保存順序
    reorderMutation.mutate(newItemIds);
  };

  const handleItemClick = (item: ScheduleItem) => {
    // 可以在此處理點擊行程項目的邏輯
    // 例如顯示確認對話框後移除
  };

  const handleNearbyVoterClick = (voter: NearbyVoter) => {
    handleAddVoter(voter);
  };

  // 計算統計資訊
  const stats = {
    totalItems: items.length,
    totalDistance: schedule.totalDistance ? (schedule.totalDistance / 1000).toFixed(1) : '0',
    estimatedDuration: schedule.estimatedDuration ? Math.round(schedule.estimatedDuration / 60) : 0,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !flex-col max-w-full md:max-w-[95vw] w-full max-h-[100dvh] md:max-h-[95vh] h-[100dvh] md:h-[90vh] p-0 gap-0 rounded-none md:rounded-lg [&>button]:hidden">
        {/* 頂部工具列 - 響應式設計 */}
        <div className="flex items-center justify-between px-2 md:px-4 py-1.5 md:py-3 border-b bg-background shrink-0">
          <div className="flex items-center gap-1.5 md:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-10 md:w-10 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm md:text-base truncate">{schedule.title}</h2>
              <p className="text-[10px] md:text-xs text-muted-foreground">路線規劃</p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 md:h-10 px-2 md:px-4"
              onClick={() => optimizeMutation.mutate()}
              disabled={optimizeMutation.isPending || items.length < 2}
            >
              {optimizeMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2 animate-spin" />
              ) : (
                <Navigation className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
              )}
              <span className="hidden md:inline">重新優化</span>
            </Button>
            <Button size="sm" className="h-7 md:h-10 px-2 md:px-4" onClick={() => onOpenChange(false)}>
              <Save className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
              <span className="hidden md:inline">完成</span>
            </Button>
          </div>
        </div>

        {/* 桌面版 - 並排佈局 */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          {/* 左側選民清單 */}
          <div className="w-80 flex-shrink-0 overflow-hidden">
            <VoterSidebar
              items={items}
              nearbyVoters={nearbyVotersData || []}
              onRemoveItem={handleRemoveItem}
              onAddVoter={handleAddVoter}
              onReorderItems={handleReorderItems}
              isLoading={isLoadingNearby}
            />
          </div>

          {/* 右側地圖 */}
          <div className="flex-1 relative">
            <RouteMapView
              items={items}
              nearbyVoters={nearbyVotersData || []}
              center={getMapCenter()}
              zoom={14}
              onItemClick={handleItemClick}
              onNearbyVoterClick={handleNearbyVoterClick}
            />
          </div>
        </div>

        {/* 手機版 - 地圖全螢幕 + 底部抽屜 */}
        <div className="md:hidden relative flex-1 overflow-hidden">
          {/* 地圖佔滿背景 */}
          <div className="absolute inset-0">
            <RouteMapView
              items={items}
              nearbyVoters={nearbyVotersData || []}
              center={getMapCenter()}
              zoom={14}
              onItemClick={handleItemClick}
              onNearbyVoterClick={handleNearbyVoterClick}
            />
          </div>

          {/* 底部抽屜 */}
          <div
            ref={sheetRef}
            className={`absolute left-0 right-0 bottom-0 bg-background rounded-t-xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 ease-out flex flex-col ${getSheetHeightClass()}`}
          >
            {/* 拖曳把手區域 */}
            <div
              className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={toggleSheet}
            >
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mb-1" />
              <GripHorizontal className="h-4 w-4 text-muted-foreground/50" />
            </div>

            {/* 標題列 */}
            <div 
              className="flex items-center justify-between px-4 py-2 border-b bg-background"
              onClick={toggleSheet}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">行程中選民</span>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                {sheetState === 'collapsed' ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>

            {/* 選民清單 - 只在展開時顯示 */}
            {sheetState !== 'collapsed' && (
              <div className="flex-1 overflow-hidden">
                <VoterSidebar
                  items={items}
                  nearbyVoters={nearbyVotersData || []}
                  onRemoveItem={handleRemoveItem}
                  onAddVoter={handleAddVoter}
                  onReorderItems={handleReorderItems}
                  isLoading={isLoadingNearby}
                />
              </div>
            )}
          </div>
        </div>

        {/* 底部統計列 - 僅桌面版顯示 */}
        <div className="hidden md:flex items-center justify-center gap-8 px-4 py-3 border-t bg-muted/50">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">停靠點：</span>
            <span className="font-medium">{stats.totalItems} 個</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Route className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">總距離：</span>
            <span className="font-medium">{stats.totalDistance} 公里</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">預估時間：</span>
            <span className="font-medium">{stats.estimatedDuration} 分鐘</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
