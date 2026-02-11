'use client';

import dynamic from 'next/dynamic';
import type { RouteMapViewProps } from './RouteMapView';

const RouteMapView = dynamic<RouteMapViewProps>(
  () => import('./RouteMapView'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">載入地圖中...</p>
        </div>
      </div>
    ),
  }
);

export { RouteMapView };
export type { RouteMapViewProps };
