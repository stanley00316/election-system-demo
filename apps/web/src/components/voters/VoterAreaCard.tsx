'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  ChevronRight,
  Users,
  TrendingUp,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import { formatRelativeTime, getContactTypeLabel, getStanceLabel } from '@/lib/utils';
import type { LeafletMapInnerProps } from '@/components/map/LeafletMapInner';

// 動態匯入地圖元件，避免 SSR 問題
const LeafletMapInner = dynamic<LeafletMapInnerProps>(
  () => import('@/components/map/LeafletMapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[180px] flex items-center justify-center bg-muted rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

// 立場顏色
const STANCE_COLORS: Record<string, string> = {
  STRONG_SUPPORT: 'bg-green-500',
  SUPPORT: 'bg-green-400',
  LEAN_SUPPORT: 'bg-green-300',
  NEUTRAL: 'bg-gray-400',
  UNDECIDED: 'bg-yellow-400',
  LEAN_OPPOSE: 'bg-red-300',
  OPPOSE: 'bg-red-400',
  STRONG_OPPOSE: 'bg-red-500',
};

interface VoterAreaCardProps {
  voter: any;
  areaVoters?: any[];
  isLoadingAreaVoters?: boolean;
}

export function VoterAreaCard({
  voter,
  areaVoters = [],
  isLoadingAreaVoters = false,
}: VoterAreaCardProps) {
  // 區域階層
  const areaBreadcrumb = useMemo(() => {
    const parts: { label: string; filterKey?: string; filterValue?: string }[] = [];
    if (voter.city) {
      parts.push({ label: voter.city, filterKey: 'city', filterValue: voter.city });
    }
    if (voter.districtName) {
      parts.push({ label: voter.districtName, filterKey: 'district', filterValue: voter.districtName });
    }
    if (voter.village) {
      parts.push({ label: voter.village, filterKey: 'village', filterValue: voter.village });
    }
    if (voter.neighborhood) {
      parts.push({ label: voter.neighborhood });
    }
    return parts;
  }, [voter.city, voter.districtName, voter.village, voter.neighborhood]);

  // 地圖資料
  const hasCoordinates = voter.latitude && voter.longitude;
  const mapVoters = useMemo(() => {
    const voters: any[] = [];
    // 當前選民（有座標才加入）
    if (hasCoordinates) {
      voters.push({
        id: voter.id,
        name: voter.name,
        stance: voter.stance,
        influenceScore: voter.influenceScore || 0,
        latitude: voter.latitude,
        longitude: voter.longitude,
        contactCount: voter.contactCount || 0,
      });
    }
    // 同區域選民（有座標者）
    areaVoters.forEach((v) => {
      if (v.latitude && v.longitude && v.id !== voter.id) {
        voters.push({
          id: v.id,
          name: v.name,
          stance: v.stance,
          influenceScore: v.influenceScore || 0,
          latitude: v.latitude,
          longitude: v.longitude,
          contactCount: v.contactCount || 0,
        });
      }
    });
    return voters;
  }, [voter, areaVoters, hasCoordinates]);

  // 區域統計
  const areaStats = useMemo(() => {
    // 同區（districtName）選民 = areaVoters（已篩選同 district）
    const districtVoters = areaVoters;
    // 同里選民
    const villageVoters = voter.village
      ? areaVoters.filter((v) => v.village === voter.village)
      : [];

    // 支持率（STRONG_SUPPORT + SUPPORT + LEAN_SUPPORT）
    const supportStances = ['STRONG_SUPPORT', 'SUPPORT', 'LEAN_SUPPORT'];
    const districtSupportCount = districtVoters.filter((v) =>
      supportStances.includes(v.stance)
    ).length;
    const supportRate =
      districtVoters.length > 0
        ? Math.round((districtSupportCount / districtVoters.length) * 100)
        : 0;

    // 接觸率
    const contactedCount = districtVoters.filter(
      (v) => v.contactCount > 0
    ).length;
    const contactRate =
      districtVoters.length > 0
        ? Math.round((contactedCount / districtVoters.length) * 100)
        : 0;

    return {
      districtCount: districtVoters.length,
      villageCount: villageVoters.length,
      supportRate,
      contactRate,
    };
  }, [areaVoters, voter.village]);

  // 最近接觸提示（團隊協作）
  const latestContact = voter.contacts?.[0];
  const isRecentlyContacted =
    latestContact &&
    Date.now() - new Date(latestContact.contactDate).getTime() <
      48 * 60 * 60 * 1000;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          區域定位
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* A. 區域階層麵包屑 */}
        <div className="flex items-center flex-wrap gap-1 bg-primary/5 rounded-lg p-3">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          {areaBreadcrumb.length > 0 ? (
            areaBreadcrumb.map((part, index) => (
              <span key={index} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                {part.filterKey ? (
                  <Link
                    href={`/dashboard/voters?${part.filterKey}=${encodeURIComponent(part.filterValue!)}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {part.label}
                  </Link>
                ) : (
                  <span className="text-sm font-medium">{part.label}</span>
                )}
              </span>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">區域資訊未設定</span>
          )}
        </div>

        {/* B. 迷你地圖 */}
        {hasCoordinates ? (
          <div className="rounded-lg overflow-hidden border" style={{ height: '180px' }}>
            <LeafletMapInner
              voters={mapVoters}
              center={[voter.latitude, voter.longitude]}
              zoom={15}
            />
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 flex items-center justify-center h-[100px]">
            <p className="text-sm text-muted-foreground">此選民尚未設定地理位置</p>
          </div>
        )}

        {/* C. 區域統計 */}
        {isLoadingAreaVoters ? (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg bg-muted/50 p-3 animate-pulse h-16" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {areaStats.districtCount}
              </div>
              <div className="text-xs text-muted-foreground">
                同區選民
              </div>
            </div>
            <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-3 text-center">
              <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                {areaStats.villageCount}
              </div>
              <div className="text-xs text-muted-foreground">
                同里選民
              </div>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-center">
              <div className="text-lg font-bold text-green-700 dark:text-green-300">
                {areaStats.supportRate}%
              </div>
              <div className="text-xs text-muted-foreground">
                區域支持率
              </div>
            </div>
            <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-3 text-center">
              <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
                {areaStats.contactRate}%
              </div>
              <div className="text-xs text-muted-foreground">
                區域接觸率
              </div>
            </div>
          </div>
        )}

        {/* D. 團隊接觸提示 */}
        {isRecentlyContacted && latestContact && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-medium text-yellow-800 dark:text-yellow-200">
                {latestContact.user?.name || '團隊成員'}
              </span>
              <span className="text-yellow-700 dark:text-yellow-300">
                {' '}於 {formatRelativeTime(latestContact.contactDate)} 已接觸此選民
              </span>
              <span className="text-yellow-600 dark:text-yellow-400">
                （{getContactTypeLabel(latestContact.type)}）
              </span>
            </div>
          </div>
        )}
        {!isRecentlyContacted && latestContact && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>
              最近接觸：{latestContact.user?.name || '團隊成員'} ·{' '}
              {formatRelativeTime(latestContact.contactDate)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
