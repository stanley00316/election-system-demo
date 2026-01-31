'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getStanceLabel } from '@/lib/utils';
import { Search, MapPin, User, Users, GripVertical, Navigation, Phone } from 'lucide-react';
import type { ScheduleItem, NearbyVoter } from './RouteMapView';

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

interface VoterSidebarProps {
  items: ScheduleItem[];
  nearbyVoters: NearbyVoter[];
  onRemoveItem: (itemId: string) => void;
  onAddVoter: (voter: NearbyVoter) => void;
  isLoading?: boolean;
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

export function VoterSidebar({
  items,
  nearbyVoters,
  onRemoveItem,
  onAddVoter,
  isLoading = false,
}: VoterSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 過濾附近選民（排除已在行程中的）
  const itemVoterIds = new Set(items.map(item => item.voter?.id).filter(Boolean));
  const availableNearbyVoters = nearbyVoters.filter(voter => 
    !itemVoterIds.has(voter.id) &&
    (searchQuery === '' || 
      voter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voter.address?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 過濾行程中的選民
  const filteredItems = items.filter(item =>
    searchQuery === '' ||
    item.voter?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-background border-r">
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
        {/* 行程中的選民 */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            行程中選民
            <Badge variant="secondary" className="ml-auto">
              {items.length} 個
            </Badge>
          </h3>

          {filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              尚未加入任何選民
            </p>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 pt-0.5">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {item.voter?.name || item.address || '未命名'}
                      </span>
                      <StanceBadge stance={item.voter?.stance} />
                    </div>
                    {item.address && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1 mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Navigation className="h-3 w-3" />
                        {item.address}
                      </a>
                    )}
                    {item.voter?.phone && (
                      <a
                        href={`tel:${item.voter.phone.replace(/[^0-9+]/g, '')}`}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                        {item.voter.phone}
                      </a>
                    )}
                    {/* 顯示關係 */}
                    {item.voter?.relationsInSchedule && item.voter.relationsInSchedule.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                        {item.voter.relationsInSchedule.map((rel: any) => (
                          <Badge key={rel.id} variant="outline" className="text-xs py-0 px-1">
                            {rel.relatedVoter?.name}（{RELATION_TYPE_LABELS[rel.relationType] || rel.relationType}）
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => onRemoveItem(item.id)}
                    className="data-[state=checked]:bg-primary mt-1"
                  />
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
            <Badge variant="outline" className="ml-auto">
              {availableNearbyVoters.length} 個
            </Badge>
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : availableNearbyVoters.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {searchQuery ? '找不到符合的選民' : '附近沒有其他選民'}
            </p>
          ) : (
            <div className="space-y-2">
              {availableNearbyVoters.map((voter) => (
                <div
                  key={voter.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onAddVoter(voter)}
                >
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {voter.name}
                      </span>
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
                        <Navigation className="h-3 w-3" />
                        {voter.address}
                      </a>
                    )}
                    {voter.phone && (
                      <a
                        href={`tel:${voter.phone.replace(/[^0-9+]/g, '')}`}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                        {voter.phone}
                      </a>
                    )}
                  </div>
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => onAddVoter(voter)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
