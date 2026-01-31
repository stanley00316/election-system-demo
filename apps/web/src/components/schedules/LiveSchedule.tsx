'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { votersApi } from '@/lib/api';
import { 
  Locate, 
  MapPin, 
  RefreshCw, 
  Navigation,
  AlertCircle,
  Hand,
  Settings2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { NearbyVotersSidebar } from './NearbyVotersSidebar';
import type { NearbyVoter } from './LiveMap';

// 動態載入 LiveMap（避免 SSR 問題）
const LiveMap = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted/30">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">載入地圖中...</p>
      </div>
    </div>
  ),
});

interface LiveScheduleProps {
  campaignId?: string;
}

type LocationMode = 'gps' | 'manual' | 'none';

export default function LiveSchedule({ campaignId }: LiveScheduleProps) {
  const { toast } = useToast();
  
  // 位置狀態
  const [locationMode, setLocationMode] = useState<LocationMode>('none');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // 搜尋範圍（公尺）
  const [radius, setRadius] = useState(1000);
  
  // 側邊欄顯示狀態
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // 已選中的選民
  const [selectedVoters, setSelectedVoters] = useState<NearbyVoter[]>([]);
  
  // 設定面板
  const [showSettings, setShowSettings] = useState(false);

  // GPS 監聽器 ID
  const watchIdRef = useRef<number | null>(null);

  // 查詢附近選民
  const { data: nearbyVoters = [], isLoading: isLoadingVoters, refetch } = useQuery({
    queryKey: ['nearby-voters', campaignId, userLocation?.lat, userLocation?.lng, radius],
    queryFn: () => votersApi.getNearby({
      campaignId,
      latitude: userLocation!.lat,
      longitude: userLocation!.lng,
      radius,
      limit: 50,
    }),
    enabled: !!campaignId && !!userLocation,
  });

  // GPS 定位
  const startGPSTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('您的瀏覽器不支援定位功能');
      toast({
        title: '定位失敗',
        description: '您的瀏覽器不支援定位功能',
        variant: 'destructive',
      });
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setLocationMode('gps');

    // 先取得一次位置
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
        toast({
          title: '定位成功',
          description: '已取得您的位置',
        });
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = '無法取得位置';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = '請允許網站存取您的位置';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = '位置資訊不可用';
            break;
          case error.TIMEOUT:
            errorMsg = '定位逾時，請重試';
            break;
        }
        setLocationError(errorMsg);
        toast({
          title: '定位失敗',
          description: errorMsg,
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // 持續追蹤位置
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('GPS tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, [toast]);

  // 停止 GPS 追蹤
  const stopGPSTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocationMode('none');
  }, []);

  // 切換到手動模式
  const switchToManualMode = useCallback(() => {
    stopGPSTracking();
    setLocationMode('manual');
    toast({
      title: '手動定位模式',
      description: '請點擊地圖選擇位置',
    });
  }, [stopGPSTracking, toast]);

  // 地圖點擊處理
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (locationMode === 'manual') {
      setUserLocation({ lat, lng });
      toast({
        title: '位置已更新',
        description: '已設定新的位置',
      });
    }
  }, [locationMode, toast]);

  // 選民點擊處理
  const handleVoterClick = useCallback((voter: NearbyVoter) => {
    setSelectedVoters(prev => {
      const exists = prev.some(v => v.id === voter.id);
      if (exists) {
        return prev.filter(v => v.id !== voter.id);
      }
      return [...prev, voter];
    });
  }, []);

  // 移除選民
  const handleRemoveVoter = useCallback((voterId: string) => {
    setSelectedVoters(prev => prev.filter(v => v.id !== voterId));
  }, []);

  // 清空所有選民
  const handleClearAll = useCallback(() => {
    setSelectedVoters([]);
  }, []);

  // 清理 GPS 追蹤
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // 已選中的 ID 集合
  const selectedVoterIds = new Set(selectedVoters.map(v => v.id));

  if (!campaignId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">請先選擇選舉活動</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-[calc(100vh-280px)] min-h-[500px] flex flex-col">
      {/* 控制列 */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* 定位按鈕 */}
            <div className="flex items-center gap-2">
              <Button
                variant={locationMode === 'gps' ? 'default' : 'outline'}
                size="sm"
                onClick={locationMode === 'gps' ? stopGPSTracking : startGPSTracking}
                disabled={isLocating}
              >
                {isLocating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Locate className="h-4 w-4 mr-2" />
                )}
                {locationMode === 'gps' ? 'GPS 追蹤中' : 'GPS 定位'}
              </Button>

              <Button
                variant={locationMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={switchToManualMode}
              >
                <Hand className="h-4 w-4 mr-2" />
                手動定位
              </Button>
            </div>

            {/* 分隔線 */}
            <div className="h-8 w-px bg-border hidden sm:block" />

            {/* 搜尋範圍 */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                範圍設定
              </Button>
              <Badge variant="secondary">
                {radius < 1000 ? `${radius}m` : `${(radius / 1000).toFixed(1)}km`}
              </Badge>
            </div>

            {/* 重新整理 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={!userLocation || isLoadingVoters}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingVoters ? 'animate-spin' : ''}`} />
              重新整理
            </Button>

            {/* 狀態提示 */}
            <div className="flex-1 flex justify-end">
              {locationError ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {locationError}
                </Badge>
              ) : userLocation ? (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Navigation className="h-3 w-3" />
                  請選擇定位方式
                </Badge>
              )}
            </div>
          </div>

          {/* 範圍設定面板 */}
          {showSettings && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-4">
                <Label className="text-sm shrink-0">搜尋範圍</Label>
                <Slider
                  value={[radius]}
                  onValueChange={(value) => setRadius(value[0])}
                  min={200}
                  max={3000}
                  step={100}
                  className="flex-1 max-w-xs"
                />
                <span className="text-sm text-muted-foreground w-16 text-right">
                  {radius < 1000 ? `${radius}m` : `${(radius / 1000).toFixed(1)}km`}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 地圖與側邊欄 */}
      <div className="flex-1 flex relative rounded-lg overflow-hidden border">
        {/* 地圖區域 */}
        <div className={`flex-1 transition-all ${sidebarOpen ? 'mr-0 md:mr-80' : 'mr-0'}`}>
          <LiveMap
            userLocation={userLocation}
            radius={radius}
            nearbyVoters={nearbyVoters}
            selectedVoterIds={selectedVoterIds}
            onMapClick={handleMapClick}
            onVoterClick={handleVoterClick}
            isLocating={isLocating}
          />

          {/* 提示：手動定位模式 */}
          {locationMode === 'manual' && !userLocation && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
              <Badge variant="default" className="gap-2 px-4 py-2 shadow-lg">
                <Hand className="h-4 w-4" />
                點擊地圖設定位置
              </Badge>
            </div>
          )}

          {/* 提示：無定位 */}
          {locationMode === 'none' && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
              <Card className="mx-4 max-w-sm">
                <CardContent className="py-6 text-center">
                  <Navigation className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">開始即時行程</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    選擇定位方式來查看附近可拜訪的選民
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button onClick={startGPSTracking}>
                      <Locate className="h-4 w-4 mr-2" />
                      使用 GPS 定位
                    </Button>
                    <Button variant="outline" onClick={switchToManualMode}>
                      <Hand className="h-4 w-4 mr-2" />
                      手動選擇位置
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* 側邊欄 toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-1/2 -translate-y-1/2 right-0 md:right-80 z-30 h-12 w-6 bg-background border border-r-0 rounded-l-lg flex items-center justify-center hover:bg-muted transition-colors"
          style={{ right: sidebarOpen ? '320px' : '0' }}
        >
          {sidebarOpen ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* 側邊欄 */}
        <div 
          className={`absolute top-0 right-0 h-full w-80 z-20 transition-transform ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <NearbyVotersSidebar
            nearbyVoters={nearbyVoters}
            selectedVoters={selectedVoters}
            onAddVoter={handleVoterClick}
            onRemoveVoter={handleRemoveVoter}
            onClearAll={handleClearAll}
            isLoading={isLoadingVoters}
            radius={radius}
          />
        </div>
      </div>

      {/* 底部狀態列 */}
      {selectedVoters.length > 0 && (
        <Card className="mt-4">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="default" className="gap-1">
                  <Navigation className="h-3 w-3" />
                  已選 {selectedVoters.length} 位選民
                </Badge>
                <span className="text-sm text-muted-foreground">
                  可隨時新增或移除拜訪對象
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleClearAll}>
                  清空清單
                </Button>
                {/* 未來可加入：儲存為正式行程 */}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
