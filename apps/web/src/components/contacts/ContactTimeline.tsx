'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatDate,
  formatRelativeTime,
  getContactTypeLabel,
  getContactOutcomeLabel,
} from '@/lib/utils';
import {
  MapPin,
  Pencil,
  Trash2,
  Loader2,
  MessageSquare,
} from 'lucide-react';

const OUTCOME_DOT_COLORS: Record<string, string> = {
  POSITIVE: 'bg-green-500',
  NEUTRAL: 'bg-yellow-400',
  NEGATIVE: 'bg-red-500',
  NO_RESPONSE: 'bg-gray-400',
  NOT_HOME: 'bg-gray-400',
};

const OUTCOME_BADGE_STYLES: Record<string, string> = {
  POSITIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  NEUTRAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  NEGATIVE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  NO_RESPONSE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  NOT_HOME: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

interface ContactTimelineProps {
  contacts: any[];
  filterType?: string;
  onEdit: (contact: any) => void;
  onDelete: (contact: any) => void;
  isLoading?: boolean;
}

/** 依日期分群，降序排列 */
function groupByDate(contacts: any[]): { date: string; label: string; items: any[] }[] {
  const sorted = [...contacts].sort(
    (a, b) => new Date(b.contactDate).getTime() - new Date(a.contactDate).getTime(),
  );

  const groups: Map<string, any[]> = new Map();
  for (const c of sorted) {
    const d = new Date(c.contactDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  return Array.from(groups.entries()).map(([key, items]) => {
    const d = new Date(key + 'T00:00:00');
    const weekday = d.toLocaleDateString('zh-TW', { weekday: 'short', timeZone: 'Asia/Taipei' });
    const label = `${formatDate(d, { year: 'numeric', month: '2-digit', day: '2-digit' })} ${weekday}`;
    return { date: key, label, items };
  });
}

export function ContactTimeline({
  contacts,
  filterType,
  onEdit,
  onDelete,
  isLoading,
}: ContactTimelineProps) {
  const filtered = useMemo(() => {
    if (!filterType) return contacts;
    return contacts.filter((c: any) => c.type === filterType);
  }, [contacts, filterType]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
        <p>{filterType ? '此類型尚無接觸紀錄' : '尚無接觸紀錄'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.date}>
          {/* 日期群組標題 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-muted-foreground">{group.label}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* 時間軸 */}
          <div className="relative pl-6">
            {/* 垂直連接線 */}
            <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-border" />

            <div className="space-y-4">
              {group.items.map((contact: any, idx: number) => (
                <div key={contact.id} className="relative">
                  {/* 時間軸圓點 */}
                  <div
                    className={`absolute -left-6 top-2.5 h-[18px] w-[18px] rounded-full border-2 border-background ${OUTCOME_DOT_COLORS[contact.outcome] || 'bg-gray-400'}`}
                  />

                  {/* 卡片 */}
                  <div className="rounded-lg border bg-card p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">
                          {getContactTypeLabel(contact.type)}
                        </Badge>
                        <Badge className={OUTCOME_BADGE_STYLES[contact.outcome] || ''}>
                          {getContactOutcomeLabel(contact.outcome)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEdit(contact)}
                          title="編輯"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDelete(contact)}
                          title="刪除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* 備註 */}
                    {contact.notes && (
                      <p className="text-sm mt-2 line-clamp-2">{contact.notes}</p>
                    )}

                    {/* 主題標籤 */}
                    {contact.topics?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {contact.topics.map((topic: string, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 地點 */}
                    {contact.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <MapPin className="h-3 w-3" />
                        <span>{contact.location}</span>
                      </div>
                    )}

                    {/* 記錄者與時間 */}
                    <p className="text-xs text-muted-foreground mt-2">
                      {contact.user?.name || '未知'} · {formatRelativeTime(contact.contactDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
