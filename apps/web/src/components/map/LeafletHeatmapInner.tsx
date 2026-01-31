'use client';

import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface HeatmapVoter {
  id: string;
  latitude: number;
  longitude: number;
  stance: string;
  influenceScore?: number;
}

export interface LeafletHeatmapInnerProps {
  voters: HeatmapVoter[];
  center: [number, number];
  zoom?: number;
}

// 根據支持度計算熱度顏色
function getHeatColor(stance: string, influenceScore: number): string {
  const supportStances = ['STRONG_SUPPORT', 'SUPPORT', 'LEAN_SUPPORT'];
  const opposeStances = ['STRONG_OPPOSE', 'OPPOSE', 'LEAN_OPPOSE'];

  if (supportStances.includes(stance)) {
    const intensity = Math.min(influenceScore / 100, 1);
    return `rgba(34, 197, 94, ${0.3 + intensity * 0.5})`; // 綠色（支持）
  } else if (opposeStances.includes(stance)) {
    const intensity = Math.min(influenceScore / 100, 1);
    return `rgba(239, 68, 68, ${0.3 + intensity * 0.5})`; // 紅色（反對）
  } else {
    const intensity = Math.min(influenceScore / 100, 1);
    return `rgba(245, 158, 11, ${0.3 + intensity * 0.5})`; // 橘色（中立/未定）
  }
}

export default function LeafletHeatmapInner({
  voters,
  center,
  zoom = 13,
}: LeafletHeatmapInnerProps) {
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
        const color = getHeatColor(voter.stance, voter.influenceScore || 50);
        const radius = 20 + (voter.influenceScore || 50) / 5;

        return (
          <CircleMarker
            key={voter.id}
            center={[voter.latitude, voter.longitude]}
            radius={radius}
            fillColor={color}
            color="transparent"
            weight={0}
            fillOpacity={0.6}
          />
        );
      })}
    </MapContainer>
  );
}
