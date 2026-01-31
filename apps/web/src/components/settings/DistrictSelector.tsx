'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, X, Loader2, Map } from 'lucide-react';

// 動態載入地圖元件
const DistrictMap = dynamic(() => import('./DistrictMapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">載入地圖中...</p>
      </div>
    </div>
  ),
});

export interface DistrictSelection {
  city: string;
  district?: string;
}

interface DistrictSelectorProps {
  value?: DistrictSelection;
  onChange: (selection: DistrictSelection) => void;
  showMap?: boolean;
}

export function DistrictSelector({ value, onChange, showMap = true }: DistrictSelectorProps) {
  const [isMapVisible, setIsMapVisible] = useState(showMap);
  const [isLoading, setIsLoading] = useState(false);

  const handleDistrictSelect = useCallback((city: string, district?: string) => {
    onChange({ city, district });
  }, [onChange]);

  const handleClear = () => {
    onChange({ city: '', district: '' });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Map className="h-4 w-4" />
              地圖選區
            </CardTitle>
            <CardDescription>點擊地圖選擇選區範圍</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMapVisible(!isMapVisible)}
          >
            {isMapVisible ? '隱藏地圖' : '顯示地圖'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 已選擇的區域 */}
        {value?.city && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {value.city}
              {value.district && ` ${value.district}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 地圖 */}
        {isMapVisible && (
          <div className="rounded-lg overflow-hidden border">
            <DistrictMap
              selectedCity={value?.city}
              selectedDistrict={value?.district}
              onSelect={handleDistrictSelect}
            />
          </div>
        )}

        {/* 提示 */}
        <p className="text-xs text-muted-foreground">
          提示：點擊地圖上的縣市可選擇該區域，再次點擊可選擇區/鄉/鎮
        </p>
      </CardContent>
    </Card>
  );
}

export default DistrictSelector;
