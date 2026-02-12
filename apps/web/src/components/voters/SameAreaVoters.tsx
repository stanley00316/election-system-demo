'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  Loader2,
  User,
} from 'lucide-react';
import { votersApi } from '@/lib/api';
import { getStanceLabel, formatRelativeTime } from '@/lib/utils';

// 立場顏色
const STANCE_BADGE_COLORS: Record<string, string> = {
  STRONG_SUPPORT: 'bg-green-500 text-white',
  SUPPORT: 'bg-green-400 text-white',
  LEAN_SUPPORT: 'bg-green-300 text-green-900',
  NEUTRAL: 'bg-gray-400 text-white',
  UNDECIDED: 'bg-yellow-400 text-yellow-900',
  LEAN_OPPOSE: 'bg-red-300 text-red-900',
  OPPOSE: 'bg-red-400 text-white',
  STRONG_OPPOSE: 'bg-red-500 text-white',
};

interface SameAreaVotersProps {
  currentVoterId: string;
  district?: string;
  village?: string;
  campaignId: string;
  /** 外部傳入的同區域選民資料（避免重複查詢） */
  areaVoters?: any[];
  isLoading?: boolean;
}

export function SameAreaVoters({
  currentVoterId,
  district,
  village,
  campaignId,
  areaVoters,
  isLoading = false,
}: SameAreaVotersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 如果外部沒有傳入資料，自行查詢
  const { data: queryResult, isLoading: isQueryLoading } = useQuery({
    queryKey: ['voters', 'same-area', campaignId, district, village, currentVoterId],
    queryFn: () =>
      votersApi.getAll({
        campaignId,
        district,
        village,
        excludeId: currentVoterId,
        limit: 50,
        page: 1,
      }),
    enabled: !areaVoters && !!district && !!campaignId,
  });

  const loading = areaVoters ? isLoading : isQueryLoading;
  const voters = areaVoters
    ? areaVoters.filter((v) => v.id !== currentVoterId)
    : queryResult?.data || [];

  // 按影響力降序排列，取前 10 筆
  const sortedVoters = [...voters]
    .sort((a, b) => (b.influenceScore || 0) - (a.influenceScore || 0))
    .slice(0, 10);

  const totalCount = voters.length;

  if (!district) return null;

  // 建構查看全部的連結
  const viewAllParams = new URLSearchParams();
  if (district) viewAllParams.set('district', district);
  if (village) viewAllParams.set('village', village);
  const viewAllUrl = `/dashboard/voters?${viewAllParams.toString()}`;

  return (
    <Card>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            同區域選民
          </span>
          {!loading && (
            <Badge variant="secondary" className="text-xs">
              {totalCount} 位
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">載入中...</span>
            </div>
          ) : sortedVoters.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              此區域尚無其他選民資料
            </div>
          ) : (
            <div className="space-y-1">
              {sortedVoters.map((v) => (
                <Link
                  key={v.id}
                  href={`/dashboard/voters/${v.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  {/* 姓名 */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate group-hover:text-primary">
                      {v.name}
                    </span>
                  </div>

                  {/* 立場 */}
                  <Badge
                    variant="secondary"
                    className={`text-xs shrink-0 ${STANCE_BADGE_COLORS[v.stance] || ''}`}
                  >
                    {getStanceLabel(v.stance)}
                  </Badge>

                  {/* 影響力 */}
                  <span className="text-xs text-muted-foreground shrink-0 w-8 text-right">
                    {v.influenceScore}
                  </span>

                  {/* 最近接觸 */}
                  <div className="text-xs text-muted-foreground shrink-0 w-24 text-right hidden sm:block">
                    {v.lastContactAt ? (
                      formatRelativeTime(v.lastContactAt)
                    ) : (
                      <span className="text-yellow-600">尚未接觸</span>
                    )}
                  </div>
                </Link>
              ))}

              {/* 查看全部按鈕 */}
              {totalCount > 10 && (
                <div className="pt-2 border-t mt-2">
                  <Link href={viewAllUrl}>
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      查看全部 {totalCount} 位同區選民
                    </Button>
                  </Link>
                </div>
              )}

              {totalCount <= 10 && totalCount > 0 && (
                <div className="pt-2 border-t mt-2">
                  <Link href={viewAllUrl}>
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      在選民列表中查看此區域
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
