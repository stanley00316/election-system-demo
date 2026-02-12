'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { getContactTypeLabel, getContactOutcomeLabel } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

interface ContactPoint {
  id: string;
  type: string;
  outcome: string;
  contactDate: string;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  notes?: string;
  user?: { name: string };
}

interface ContactMiniMapProps {
  contacts: ContactPoint[];
  className?: string;
}

const OUTCOME_COLORS: Record<string, string> = {
  POSITIVE: '#16a34a',
  NEUTRAL: '#9ca3af',
  NEGATIVE: '#ef4444',
  NO_RESPONSE: '#f59e0b',
  NOT_HOME: '#8b5cf6',
};

export function ContactMiniMap({ contacts, className = 'h-48' }: ContactMiniMapProps) {
  // 篩選出有座標的接觸紀錄
  const geoContacts = useMemo(
    () => contacts.filter((c) => c.locationLat && c.locationLng),
    [contacts]
  );

  // 計算地圖中心
  const center = useMemo((): [number, number] => {
    if (geoContacts.length === 0) return [25.033, 121.565];
    const avgLat =
      geoContacts.reduce((sum, c) => sum + (c.locationLat || 0), 0) / geoContacts.length;
    const avgLng =
      geoContacts.reduce((sum, c) => sum + (c.locationLng || 0), 0) / geoContacts.length;
    return [avgLat, avgLng];
  }, [geoContacts]);

  if (geoContacts.length === 0) return null;

  return (
    <div className={`${className} rounded-lg overflow-hidden border`}>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {geoContacts.map((contact) => (
          <CircleMarker
            key={contact.id}
            center={[contact.locationLat!, contact.locationLng!]}
            radius={8}
            fillColor={OUTCOME_COLORS[contact.outcome] || '#9ca3af'}
            fillOpacity={0.8}
            color="#fff"
            weight={2}
          >
            <Popup>
              <div className="text-xs space-y-1 min-w-[140px]">
                <p className="font-medium">{getContactTypeLabel(contact.type)}</p>
                <p>結果：{getContactOutcomeLabel(contact.outcome)}</p>
                <p>
                  {new Date(contact.contactDate).toLocaleDateString('zh-TW')}
                  {contact.user?.name && ` · ${contact.user.name}`}
                </p>
                {contact.location && (
                  <p className="text-muted-foreground">{contact.location}</p>
                )}
                {contact.notes && (
                  <p className="text-muted-foreground line-clamp-2">{contact.notes}</p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
