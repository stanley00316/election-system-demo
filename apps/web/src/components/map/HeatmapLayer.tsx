'use client';

import { useEffect, useState } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { useCampaignStore } from '@/stores/campaign';
import { analysisApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

interface HeatmapProps {
  className?: string;
}

function HeatmapContent() {
  const map = useMap();
  const { currentCampaign } = useCampaignStore();
  const [heatmapLayer, setHeatmapLayer] = useState<google.maps.visualization.HeatmapLayer | null>(null);

  const { data } = useQuery({
    queryKey: ['analysis', 'heatmap', currentCampaign?.id],
    queryFn: () => analysisApi.getHeatmap(currentCampaign!.id),
    enabled: !!currentCampaign?.id,
  });

  useEffect(() => {
    if (!map || !data?.points) return;

    // Load visualization library
    if (!google.maps.visualization) {
      console.warn('Google Maps visualization library not loaded');
      return;
    }

    // Create heatmap data
    const heatmapData = data.points.map((point: HeatmapPoint) => ({
      location: new google.maps.LatLng(point.latitude, point.longitude),
      weight: point.weight,
    }));

    // Create or update heatmap layer
    if (heatmapLayer) {
      heatmapLayer.setData(heatmapData);
    } else {
      const newHeatmap = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: map,
        radius: 30,
        opacity: 0.6,
        gradient: [
          'rgba(0, 255, 255, 0)',
          'rgba(0, 255, 255, 1)',
          'rgba(0, 191, 255, 1)',
          'rgba(0, 127, 255, 1)',
          'rgba(0, 63, 255, 1)',
          'rgba(0, 0, 255, 1)',
          'rgba(0, 0, 223, 1)',
          'rgba(0, 0, 191, 1)',
          'rgba(0, 0, 159, 1)',
          'rgba(0, 0, 127, 1)',
          'rgba(63, 0, 91, 1)',
          'rgba(127, 0, 63, 1)',
          'rgba(191, 0, 31, 1)',
          'rgba(255, 0, 0, 1)',
        ],
      });
      setHeatmapLayer(newHeatmap);
    }

    // Fit bounds
    if (data.bounds) {
      map.fitBounds({
        north: data.bounds.north,
        south: data.bounds.south,
        east: data.bounds.east,
        west: data.bounds.west,
      });
    }

    return () => {
      if (heatmapLayer) {
        heatmapLayer.setMap(null);
      }
    };
  }, [map, data, heatmapLayer]);

  return null;
}

export default function HeatmapLayer({ className = 'w-full h-[500px]' }: HeatmapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  if (!apiKey) {
    return (
      <div className={`${className} bg-muted rounded-lg flex items-center justify-center`}>
        <p className="text-muted-foreground">請設定 Google Maps API Key</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <APIProvider apiKey={apiKey} libraries={['visualization']}>
        <Map
          defaultCenter={{ lat: 25.033, lng: 121.565 }}
          defaultZoom={13}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID || ''}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
        >
          <HeatmapContent />
        </Map>
      </APIProvider>
    </div>
  );
}
