'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { getStanceLabel } from '@/lib/utils';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';

export interface Voter {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  lineId?: string;
  lineUrl?: string;
  stance: string;
  influenceScore: number;
  latitude: number;
  longitude: number;
  contactCount: number;
}

export interface LeafletMapInnerProps {
  voters: Voter[];
  center: [number, number];
  zoom: number;
  onVoterClick?: (voter: Voter) => void;
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

function VoterPopup({ voter }: { voter: Voter }) {
  return (
    <div className="p-1 min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-sm">{voter.name}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: STANCE_MARKER_COLORS[voter.stance] || '#9ca3af' }}
        >
          {getStanceLabel(voter.stance)}
        </span>
      </div>

      {voter.address && (
        <p className="text-xs text-gray-600 mb-1">{voter.address}</p>
      )}

      {voter.phone && (
        <p className="text-xs text-gray-600 mb-1">電話: {voter.phone}</p>
      )}

      {(voter.lineId || voter.lineUrl) && (
        <a
          href={voter.lineUrl || `https://line.me/ti/p/~${voter.lineId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-green-600 hover:underline mb-1 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          LINE: {voter.lineId || '開啟聊天'}
        </a>
      )}

      <div className="flex items-center justify-between text-xs mt-2 text-gray-500">
        <span>影響力: {voter.influenceScore}</span>
        <span>接觸: {voter.contactCount}次</span>
      </div>

      <div className="mt-2 flex gap-1">
        <Link href={`/dashboard/voters/${voter.id}`}>
          <button className="text-xs px-2 py-1 border rounded hover:bg-gray-100">
            查看詳情
          </button>
        </Link>
        <Link href={`/dashboard/contacts/new?voterId=${voter.id}`}>
          <button className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
            記錄接觸
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function LeafletMapInner({
  voters,
  center,
  zoom,
  onVoterClick,
}: LeafletMapInnerProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {voters.map((voter) => {
        const color = STANCE_MARKER_COLORS[voter.stance] || '#9ca3af';
        const radius = Math.min(8 + voter.influenceScore / 10, 20);

        return (
          <CircleMarker
            key={voter.id}
            center={[voter.latitude, voter.longitude]}
            radius={radius}
            fillColor={color}
            color={color}
            weight={2}
            opacity={1}
            fillOpacity={0.7}
            eventHandlers={{
              click: () => onVoterClick?.(voter),
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <span className="font-medium">{voter.name}</span>
            </Tooltip>
            <Popup>
              <VoterPopup voter={voter} />
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
