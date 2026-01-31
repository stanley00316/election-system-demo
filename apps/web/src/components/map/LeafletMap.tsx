'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { Voter, LeafletMapInnerProps } from './LeafletMapInner';

interface LeafletMapProps {
  voters: Voter[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onVoterClick?: (voter: Voter) => void;
  className?: string;
}

// Dynamically import the entire map component to avoid SSR issues
const LeafletMapInner = dynamic<LeafletMapInnerProps>(
  () => import('./LeafletMapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

export default function LeafletMap({
  voters,
  center = { lat: 25.033, lng: 121.565 },
  zoom = 13,
  onVoterClick,
  className = 'w-full h-[500px]',
}: LeafletMapProps) {
  // Calculate center from voters if available
  const mapCenter = useMemo((): [number, number] => {
    if (voters.length === 0) return [center.lat, center.lng];

    const avgLat = voters.reduce((sum, v) => sum + v.latitude, 0) / voters.length;
    const avgLng = voters.reduce((sum, v) => sum + v.longitude, 0) / voters.length;

    return [avgLat, avgLng];
  }, [voters, center]);

  return (
    <div className={className}>
      <LeafletMapInner
        voters={voters}
        center={mapCenter}
        zoom={zoom}
        onVoterClick={onVoterClick}
      />
    </div>
  );
}

// Re-export Voter type for consumers
export type { Voter } from './LeafletMapInner';
