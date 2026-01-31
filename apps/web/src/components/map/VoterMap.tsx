'use client';

import { useState, useCallback, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getStanceColor, getStanceLabel } from '@/lib/utils';
import Link from 'next/link';

interface Voter {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  stance: string;
  influenceScore: number;
  latitude: number;
  longitude: number;
  contactCount: number;
}

interface VoterMapProps {
  voters: Voter[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onVoterClick?: (voter: Voter) => void;
  className?: string;
}

const STANCE_MARKER_COLORS: Record<string, string> = {
  STRONG_SUPPORT: '#16a34a',
  SUPPORT: '#22c55e',
  LEAN_SUPPORT: '#86efac',
  NEUTRAL: '#f59e0b',
  UNDECIDED: '#9ca3af',
  LEAN_OPPOSE: '#fca5a5',
  OPPOSE: '#ef4444',
  STRONG_OPPOSE: '#dc2626',
};

function VoterMarker({
  voter,
  onClick,
}: {
  voter: Voter;
  onClick: () => void;
}) {
  const color = STANCE_MARKER_COLORS[voter.stance] || '#9ca3af';
  const size = Math.min(20 + voter.influenceScore / 5, 40);

  return (
    <AdvancedMarker
      position={{ lat: voter.latitude, lng: voter.longitude }}
      onClick={onClick}
    >
      <div
        className="relative cursor-pointer transition-transform hover:scale-110"
        style={{
          width: size,
          height: size,
        }}
      >
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{ backgroundColor: color }}
        />
        <div
          className="absolute inset-1 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: color }}
        >
          {voter.name.charAt(0)}
        </div>
      </div>
    </AdvancedMarker>
  );
}

function VoterInfoWindow({
  voter,
  onClose,
}: {
  voter: Voter;
  onClose: () => void;
}) {
  return (
    <InfoWindow
      position={{ lat: voter.latitude, lng: voter.longitude }}
      onCloseClick={onClose}
    >
      <div className="p-2 min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold">{voter.name}</span>
          <Badge className={`text-xs ${getStanceColor(voter.stance)}`}>
            {getStanceLabel(voter.stance)}
          </Badge>
        </div>
        
        {voter.address && (
          <p className="text-sm text-gray-600 mb-1">{voter.address}</p>
        )}
        
        {voter.phone && (
          <p className="text-sm text-gray-600 mb-1">電話: {voter.phone}</p>
        )}
        
        <div className="flex items-center justify-between text-sm mt-2">
          <span>影響力: {voter.influenceScore}</span>
          <span>接觸: {voter.contactCount}次</span>
        </div>
        
        <div className="mt-3 flex gap-2">
          <Link href={`/dashboard/voters/${voter.id}`}>
            <Button size="sm" variant="outline">
              查看詳情
            </Button>
          </Link>
          <Link href={`/dashboard/contacts/new?voterId=${voter.id}`}>
            <Button size="sm">
              記錄接觸
            </Button>
          </Link>
        </div>
      </div>
    </InfoWindow>
  );
}

function MapContent({
  voters,
  center,
  zoom,
  onVoterClick,
}: {
  voters: Voter[];
  center: { lat: number; lng: number };
  zoom: number;
  onVoterClick?: (voter: Voter) => void;
}) {
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const map = useMap();

  const handleMarkerClick = useCallback(
    (voter: Voter) => {
      setSelectedVoter(voter);
      onVoterClick?.(voter);
      
      // Pan to marker
      if (map) {
        map.panTo({ lat: voter.latitude, lng: voter.longitude });
      }
    },
    [map, onVoterClick]
  );

  // Calculate bounds to fit all markers
  const bounds = useMemo(() => {
    if (voters.length === 0) return null;
    
    let north = -Infinity;
    let south = Infinity;
    let east = -Infinity;
    let west = Infinity;
    
    voters.forEach((voter) => {
      north = Math.max(north, voter.latitude);
      south = Math.min(south, voter.latitude);
      east = Math.max(east, voter.longitude);
      west = Math.min(west, voter.longitude);
    });
    
    return { north, south, east, west };
  }, [voters]);

  return (
    <Map
      defaultCenter={center}
      defaultZoom={zoom}
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID || ''}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapTypeControl={false}
      streetViewControl={false}
    >
      {voters.map((voter) => (
        <VoterMarker
          key={voter.id}
          voter={voter}
          onClick={() => handleMarkerClick(voter)}
        />
      ))}
      
      {selectedVoter && (
        <VoterInfoWindow
          voter={selectedVoter}
          onClose={() => setSelectedVoter(null)}
        />
      )}
    </Map>
  );
}

export default function VoterMap({
  voters,
  center = { lat: 25.033, lng: 121.565 }, // Default to Taipei
  zoom = 13,
  onVoterClick,
  className = 'w-full h-[500px]',
}: VoterMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Calculate center from voters if not provided
  const mapCenter = useMemo(() => {
    if (voters.length === 0) return center;
    
    const avgLat = voters.reduce((sum, v) => sum + v.latitude, 0) / voters.length;
    const avgLng = voters.reduce((sum, v) => sum + v.longitude, 0) / voters.length;
    
    return { lat: avgLat, lng: avgLng };
  }, [voters, center]);

  if (!apiKey) {
    return (
      <div className={`${className} bg-muted rounded-lg flex items-center justify-center`}>
        <p className="text-muted-foreground">請設定 Google Maps API Key</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <APIProvider apiKey={apiKey}>
        <MapContent
          voters={voters}
          center={mapCenter}
          zoom={zoom}
          onVoterClick={onVoterClick}
        />
      </APIProvider>
    </div>
  );
}
