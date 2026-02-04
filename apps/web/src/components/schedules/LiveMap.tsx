'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Phone, Navigation, MessageCircle } from 'lucide-react';
import { getStanceLabel } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

export interface NearbyVoter {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  lineId?: string;
  lineUrl?: string;
  stance?: string;
  influenceScore?: number;
  latitude: number;
  longitude: number;
  distance?: number;
  lastContactAt?: string;
}

export interface LiveMapProps {
  userLocation: { lat: number; lng: number } | null;
  radius: number; // 公尺
  nearbyVoters: NearbyVoter[];
  selectedVoterIds: Set<string>;
  onMapClick?: (lat: number, lng: number) => void;
  onVoterClick?: (voter: NearbyVoter) => void;
  isLocating?: boolean;
}

const STANCE_COLORS: Record<string, string> = {
  STRONG_SUPPORT: '#16a34a',
  SUPPORT: '#22c55e',
  LEAN_SUPPORT: '#86efac',
  NEUTRAL: '#f59e0b',
  UNDECIDED: '#9ca3af',
  LEAN_OPPOSE: '#fca5a5',
  OPPOSE: '#ef4444',
  STRONG_OPPOSE: '#dc2626',
};

// 建立使用者位置脈衝標記
function createUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="position: relative;">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background-color: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background-color: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: pulse 2s ease-out infinite;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      </style>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// 地圖視角控制元件
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  return null;
}

// 地圖點擊事件處理
function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// 選民 Popup
function VoterPopup({ 
  voter, 
  isSelected, 
  onToggle 
}: { 
  voter: NearbyVoter; 
  isSelected: boolean;
  onToggle: () => void;
}) {
  const stanceColor = voter.stance ? STANCE_COLORS[voter.stance] || '#9ca3af' : '#9ca3af';
  
  return (
    <div className="p-1 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-sm">{voter.name}</span>
        {voter.stance && (
          <span
            className="text-xs px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: stanceColor }}
          >
            {getStanceLabel(voter.stance)}
          </span>
        )}
      </div>

      {voter.address && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(voter.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline mb-1 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Navigation className="h-3 w-3" />
          {voter.address}
        </a>
      )}

      {voter.phone && (
        <a
          href={`tel:${voter.phone.replace(/[^0-9+]/g, '')}`}
          className="text-xs text-blue-600 hover:underline mb-1 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="h-3 w-3" />
          電話: {voter.phone}
        </a>
      )}

      {(voter.lineId || voter.lineUrl) && (
        <a
          href={voter.lineUrl || `https://line.me/ti/p/~${voter.lineId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-green-600 hover:underline mb-1 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageCircle className="h-3 w-3" />
          LINE: {voter.lineId || '開啟聊天'}
        </a>
      )}

      {voter.distance !== undefined && (
        <p className="text-xs text-gray-500 mb-1">
          距離: {voter.distance < 1000 
            ? `${Math.round(voter.distance)} 公尺` 
            : `${(voter.distance / 1000).toFixed(1)} 公里`}
        </p>
      )}

      {voter.influenceScore !== undefined && (
        <p className="text-xs text-gray-500 mb-1">影響力: {voter.influenceScore}</p>
      )}

      {voter.lastContactAt && (
        <p className="text-xs text-gray-500 mb-2">
          上次接觸: {new Date(voter.lastContactAt).toLocaleDateString()}
        </p>
      )}

      <button
        onClick={onToggle}
        className={`w-full text-xs px-2 py-1 rounded ${
          isSelected 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isSelected ? '從清單移除' : '加入拜訪清單'}
      </button>
    </div>
  );
}

export default function LiveMap({
  userLocation,
  radius,
  nearbyVoters,
  selectedVoterIds,
  onMapClick,
  onVoterClick,
  isLocating = false,
}: LiveMapProps) {
  // 預設中心點（台北市大安區）
  const defaultCenter: [number, number] = [25.026, 121.5436];
  const center: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 地圖控制器 */}
      {userLocation && (
        <MapController center={[userLocation.lat, userLocation.lng]} zoom={15} />
      )}

      {/* 點擊事件處理 */}
      <MapClickHandler onClick={onMapClick} />

      {/* 使用者位置標記 */}
      {userLocation && (
        <>
          {/* 搜尋範圍圓圈 */}
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={radius}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5',
            }}
          />
          
          {/* 使用者位置標記 */}
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createUserLocationIcon()}
          >
            <Tooltip direction="top" offset={[0, -20]}>
              <span className="font-medium">
                {isLocating ? '定位中...' : '目前位置'}
              </span>
            </Tooltip>
          </Marker>
        </>
      )}

      {/* 附近選民標記 */}
      {nearbyVoters.map((voter) => {
        const color = voter.stance ? STANCE_COLORS[voter.stance] || '#9ca3af' : '#9ca3af';
        const isSelected = selectedVoterIds.has(voter.id);
        
        return (
          <CircleMarker
            key={voter.id}
            center={[voter.latitude, voter.longitude]}
            radius={isSelected ? 12 : 8}
            fillColor={color}
            color={isSelected ? '#3b82f6' : '#ffffff'}
            weight={isSelected ? 3 : 2}
            opacity={0.9}
            fillOpacity={isSelected ? 0.9 : 0.7}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <span>
                {voter.name}
                {isSelected && ' ✓'}
                {voter.distance !== undefined && (
                  <span className="text-gray-500 ml-1">
                    ({voter.distance < 1000 
                      ? `${Math.round(voter.distance)}m` 
                      : `${(voter.distance / 1000).toFixed(1)}km`})
                  </span>
                )}
              </span>
            </Tooltip>
            <Popup>
              <VoterPopup 
                voter={voter} 
                isSelected={isSelected}
                onToggle={() => onVoterClick?.(voter)} 
              />
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
