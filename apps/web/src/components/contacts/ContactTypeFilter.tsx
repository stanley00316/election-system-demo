'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { CONTACT_TYPE_LABELS } from '@/shared';

interface ContactTypeFilterProps {
  value?: string;
  onChange: (type: string | undefined) => void;
  counts?: Record<string, number>;
}

const ALL_TYPES = Object.entries(CONTACT_TYPE_LABELS) as [string, string][];

export function ContactTypeFilter({ value, onChange, counts }: ContactTypeFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
    >
      {/* 全部 */}
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className={cn(
          'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
          !value
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80',
        )}
      >
        全部
        {counts && (
          <span className="text-xs opacity-70">
            {Object.values(counts).reduce((a, b) => a + b, 0)}
          </span>
        )}
      </button>

      {/* 各接觸類型 */}
      {ALL_TYPES.map(([key, label]) => {
        const count = counts?.[key];
        // 如有 counts 且為 0，仍顯示但降低透明度
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(value === key ? undefined : key)}
            className={cn(
              'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              value === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
              counts && count === 0 && 'opacity-50',
            )}
          >
            {label}
            {count !== undefined && (
              <span className="text-xs opacity-70">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
