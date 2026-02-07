'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Phone, Navigation, MessageCircle } from 'lucide-react';
import { getStanceLabel } from '@/lib/utils';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';

export interface RelationInSchedule {
  id: string;
  relationType: string;
  relatedVoterId: string;
  relatedVoter?: {
    id: string;
    name: string;
    stance?: string;
  };
}

export interface ScheduleItem {
  id: string;
  order: number;
  type: string;
  address?: string;
  locationLat?: number;
  locationLng?: number;
  status: string;
  voter?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    stance?: string;
    influenceScore?: number;
    relationsInSchedule?: RelationInSchedule[];
  };
}

const RELATION_TYPE_LABELS: Record<string, string> = {
  FAMILY: '家人',
  SPOUSE: '配偶',
  PARENT: '父母',
  CHILD: '子女',
  SIBLING: '兄弟姊妹',
  NEIGHBOR: '鄰居',
  FRIEND: '朋友',
  COLLEAGUE: '同事',
  COMMUNITY: '社區',
  OTHER: '其他',
};

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
}

export interface RouteMapViewProps {
  items: ScheduleItem[];
  nearbyVoters?: NearbyVoter[];
  center: [number, number];
  zoom?: number;
  onItemClick?: (item: ScheduleItem) => void;
  onNearbyVoterClick?: (voter: NearbyVoter) => void;
  selectedItemIds?: string[];
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

// 創建編號標記圖標
function createNumberedIcon(number: number, stance?: string): L.DivIcon {
  const color = stance ? STANCE_COLORS[stance] || '#3b82f6' : '#3b82f6';
  
  return L.divIcon({
    className: 'custom-numbered-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        ${number}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function ItemPopup({ item, onRemove }: { item: ScheduleItem; onRemove?: () => void }) {
  const voter = item.voter;
  const stanceColor = voter?.stance ? STANCE_COLORS[voter.stance] || '#9ca3af' : '#9ca3af';
  const relations = voter?.relationsInSchedule || [];
  
  return (
    <div className="p-1 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        {voter ? (
          <Link href={`/dashboard/voters/${voter.id}`} className="font-bold text-sm text-primary hover:underline">{voter.name}</Link>
        ) : (
          <span className="font-bold text-sm">{item.address || '未命名'}</span>
        )}
        {voter?.stance && (
          <span
            className="text-xs px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: stanceColor }}
          >
            {getStanceLabel(voter.stance)}
          </span>
        )}
      </div>

      {item.address && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline mb-1 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Navigation className="h-3 w-3" />
          {item.address}
        </a>
      )}

      {voter?.phone && (
        <a
          href={`tel:${voter.phone.replace(/[^0-9+]/g, '')}`}
          className="text-xs text-blue-600 hover:underline mb-1 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="h-3 w-3" />
          電話: {voter.phone}
        </a>
      )}

      {voter?.influenceScore !== undefined && (
        <p className="text-xs text-gray-500 mb-1">影響力: {voter.influenceScore}</p>
      )}

      {/* 顯示與行程內其他選民的關係 */}
      {relations.length > 0 && (
        <div className="mb-2 pt-1 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-1">行程內關係：</p>
          <div className="flex flex-wrap gap-1">
            {relations.map((rel) => (
              <span
                key={rel.id}
                className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-700"
              >
                <Link href={`/dashboard/voters/${rel.relatedVoter?.id}`} className="text-primary hover:underline">{rel.relatedVoter?.name}</Link>（{RELATION_TYPE_LABELS[rel.relationType] || rel.relationType}）
              </span>
            ))}
          </div>
        </div>
      )}

      {onRemove && (
        <button
          onClick={onRemove}
          className="w-full text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          從行程移除
        </button>
      )}
    </div>
  );
}

function NearbyVoterPopup({ voter, onAdd }: { voter: NearbyVoter; onAdd?: () => void }) {
  const stanceColor = voter.stance ? STANCE_COLORS[voter.stance] || '#9ca3af' : '#9ca3af';
  
  return (
    <div className="p-1 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/dashboard/voters/${voter.id}`} className="font-bold text-sm text-primary hover:underline">{voter.name}</Link>
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

      {voter.influenceScore !== undefined && (
        <p className="text-xs text-gray-500 mb-2">影響力: {voter.influenceScore}</p>
      )}

      {onAdd && (
        <button
          onClick={onAdd}
          className="w-full text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          加入行程
        </button>
      )}
    </div>
  );
}

export default function RouteMapView({
  items,
  nearbyVoters = [],
  center,
  zoom = 14,
  onItemClick,
  onNearbyVoterClick,
  selectedItemIds = [],
}: RouteMapViewProps) {
  // 過濾出有座標的項目
  const validItems = items.filter(item => item.locationLat && item.locationLng);
  
  // 建立路線座標陣列
  const routePositions: [number, number][] = validItems.map(item => [
    item.locationLat!,
    item.locationLng!,
  ]);

  // 過濾出不在行程中的附近選民
  const itemVoterIds = new Set(items.map(item => item.voter?.id).filter(Boolean));
  const availableNearbyVoters = nearbyVoters.filter(voter => !itemVoterIds.has(voter.id));

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

      {/* 繪製路線連線 */}
      {routePositions.length > 1 && (
        <Polyline
          positions={routePositions}
          color="#3b82f6"
          weight={3}
          opacity={0.8}
          dashArray="10, 10"
        />
      )}

      {/* 繪製行程項目標記 */}
      {validItems.map((item, index) => (
        <Marker
          key={item.id}
          position={[item.locationLat!, item.locationLng!]}
          icon={createNumberedIcon(index + 1, item.voter?.stance)}
          eventHandlers={{
            click: () => onItemClick?.(item),
          }}
        >
          <Tooltip direction="top" offset={[0, -16]}>
            <span className="font-medium">{item.voter?.name || item.address || `站點 ${index + 1}`}</span>
          </Tooltip>
          <Popup>
            <ItemPopup item={item} onRemove={() => onItemClick?.(item)} />
          </Popup>
        </Marker>
      ))}

      {/* 繪製附近選民（未加入行程） */}
      {availableNearbyVoters.map((voter) => {
        const color = voter.stance ? STANCE_COLORS[voter.stance] || '#9ca3af' : '#9ca3af';
        
        return (
          <CircleMarker
            key={voter.id}
            center={[voter.latitude, voter.longitude]}
            radius={8}
            fillColor={color}
            color="#ffffff"
            weight={2}
            opacity={0.8}
            fillOpacity={0.6}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <span>{voter.name}</span>
            </Tooltip>
            <Popup>
              <NearbyVoterPopup voter={voter} onAdd={() => onNearbyVoterClick?.(voter)} />
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
