'use client';

import { useMemo } from 'react';
import { useCampaignStore } from '@/stores/campaign';
import { votersApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import type { LeafletHeatmapInnerProps, HeatmapVoter } from './LeafletHeatmapInner';

interface LeafletHeatmapProps {
  className?: string;
}

// Dynamically import the entire map component to avoid SSR issues
const LeafletHeatmapInner = dynamic<LeafletHeatmapInnerProps>(
  () => import('./LeafletHeatmapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

export default function LeafletHeatmap({ className = 'w-full h-[500px]' }: LeafletHeatmapProps) {
  const { currentCampaign } = useCampaignStore();

  const { data: votersData, isLoading } = useQuery({
    queryKey: ['voters', currentCampaign?.id, 'heatmap'],
    queryFn: () =>
      votersApi.getAll({
        campaignId: currentCampaign?.id,
        limit: 100, // API 最大限制為 100
      }),
    enabled: !!currentCampaign?.id,
  });

  const voters = useMemo((): HeatmapVoter[] => {
    return votersData?.data?.filter(
      (v: any) => v.latitude && v.longitude
    ) || [];
  }, [votersData]);

  // Calculate center
  const center = useMemo((): [number, number] => {
    if (voters.length === 0) return [25.033, 121.565]; // Default to Taipei

    const avgLat = voters.reduce((sum: number, v) => sum + v.latitude, 0) / voters.length;
    const avgLng = voters.reduce((sum: number, v) => sum + v.longitude, 0) / voters.length;

    return [avgLat, avgLng];
  }, [voters]);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (voters.length === 0) {
    return (
      <div className={className}>
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500">
          <p className="mb-2">沒有選民有地理座標資料</p>
          <p className="text-sm">請確保選民資料有填寫地址</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <LeafletHeatmapInner
        voters={voters}
        center={center}
        zoom={13}
      />
    </div>
  );
}
