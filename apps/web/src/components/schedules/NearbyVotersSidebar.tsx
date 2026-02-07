'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getStanceLabel } from '@/lib/utils';
import Link from 'next/link';
import { 
  Search, 
  MapPin, 
  User, 
  Phone,
  Clock,
  Plus,
  X,
  GripVertical,
  Trash2,
  Navigation,
  MessageCircle,
} from 'lucide-react';
import type { NearbyVoter } from './LiveMap';

interface NearbyVotersSidebarProps {
  nearbyVoters: NearbyVoter[];
  selectedVoters: NearbyVoter[];
  onAddVoter: (voter: NearbyVoter) => void;
  onRemoveVoter: (voterId: string) => void;
  onClearAll: () => void;
  isLoading?: boolean;
  radius: number;
}

const STANCE_COLORS: Record<string, string> = {
  STRONG_SUPPORT: 'bg-green-600',
  SUPPORT: 'bg-green-500',
  LEAN_SUPPORT: 'bg-green-300 text-green-900',
  NEUTRAL: 'bg-yellow-500',
  UNDECIDED: 'bg-gray-400',
  LEAN_OPPOSE: 'bg-red-300 text-red-900',
  OPPOSE: 'bg-red-500',
  STRONG_OPPOSE: 'bg-red-600',
};

function StanceBadge({ stance }: { stance?: string }) {
  if (!stance) return null;
  const colorClass = STANCE_COLORS[stance] || 'bg-gray-400';
  return (
    <Badge className={`${colorClass} text-white text-xs`}>
      {getStanceLabel(stance)}
    </Badge>
  );
}

function formatDistance(meters?: number): string {
  if (meters === undefined) return '';
  if (meters < 1000) {
    return `${Math.round(meters)} 公尺`;
  }
  return `${(meters / 1000).toFixed(1)} 公里`;
}

function formatLastContact(dateStr?: string): string {
  if (!dateStr) return '從未接觸';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 週前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 個月前`;
  return `${Math.floor(diffDays / 365)} 年前`;
}

export function NearbyVotersSidebar({
  nearbyVoters,
  selectedVoters,
  onAddVoter,
  onRemoveVoter,
  onClearAll,
  isLoading = false,
  radius,
}: NearbyVotersSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 已選中的 ID 集合
  const selectedIds = new Set(selectedVoters.map(v => v.id));

  // 過濾附近選民（排除已選中的）
  const availableVoters = nearbyVoters.filter(voter => 
    !selectedIds.has(voter.id) &&
    (searchQuery === '' || 
      voter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voter.address?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 過濾已選中的選民
  const filteredSelected = selectedVoters.filter(voter =>
    searchQuery === '' ||
    voter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    voter.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* 搜尋框 */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋選民..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* 臨時拜訪清單 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              臨時拜訪清單
              <Badge variant="secondary" className="ml-1">
                {selectedVoters.length} 人
              </Badge>
            </h3>
            {selectedVoters.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearAll}
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                清空
              </Button>
            )}
          </div>

          {filteredSelected.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-lg bg-muted/30 border border-dashed">
              <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                尚未加入選民
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                點擊下方選民或地圖標記加入
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSelected.map((voter, index) => (
                <div
                  key={voter.id}
                  className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <div className="flex items-center gap-1 pt-0.5">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/voters/${voter.id}`} className="font-medium text-sm truncate text-primary hover:underline">
                        {voter.name}
                      </Link>
                      <StanceBadge stance={voter.stance} />
                    </div>
                    {voter.address && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(voter.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1 mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Navigation className="h-3 w-3 shrink-0" />
                        {voter.address}
                      </a>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {voter.distance !== undefined && (
                        <span>{formatDistance(voter.distance)}</span>
                      )}
                      {voter.phone && (
                        <a
                          href={`tel:${voter.phone.replace(/[^0-9+]/g, '')}`}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3 w-3" />
                          {voter.phone}
                        </a>
                      )}
                      {(voter.lineId || voter.lineUrl) && (
                        <a
                          href={voter.lineUrl || `https://line.me/ti/p/~${voter.lineId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-green-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="h-3 w-3" />
                          LINE
                        </a>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveVoter(voter.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 分隔線 */}
        <div className="px-4">
          <div className="border-t" />
        </div>

        {/* 附近選民 */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            附近選民
            <Badge variant="outline" className="ml-1">
              {formatDistance(radius)} 內 · {availableVoters.length} 人
            </Badge>
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : availableVoters.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              {searchQuery ? (
                <p className="text-sm">找不到符合的選民</p>
              ) : nearbyVoters.length === 0 ? (
                <>
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">附近沒有選民</p>
                  <p className="text-xs mt-1">請嘗試增加搜尋範圍</p>
                </>
              ) : (
                <p className="text-sm">所有附近選民已加入清單</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {availableVoters.map((voter) => (
                <div
                  key={voter.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => onAddVoter(voter)}
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/voters/${voter.id}`} className="font-medium text-sm truncate text-primary hover:underline">
                        {voter.name}
                      </Link>
                      <StanceBadge stance={voter.stance} />
                    </div>
                    {voter.address && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(voter.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1 mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Navigation className="h-3 w-3 shrink-0" />
                        {voter.address}
                      </a>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {voter.distance !== undefined && (
                        <span className="font-medium text-primary">
                          {formatDistance(voter.distance)}
                        </span>
                      )}
                      {voter.lastContactAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatLastContact(voter.lastContactAt)}
                        </span>
                      )}
                      {(voter.lineId || voter.lineUrl) && (
                        <a
                          href={voter.lineUrl || `https://line.me/ti/p/~${voter.lineId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-green-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="h-3 w-3" />
                          LINE
                        </a>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddVoter(voter);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
