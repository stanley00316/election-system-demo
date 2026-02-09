'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LucideIcon, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface SimpleNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface SimpleBottomNavBarProps {
  items: SimpleNavItem[];
  /** 超過此數量時顯示「更多」按鈕，預設 4 */
  maxVisible?: number;
  /** 自訂背景樣式 */
  className?: string;
}

/**
 * 通用底部導航欄，用於推廣者與管理後台等介面
 * 僅行動裝置 (< lg) 顯示
 */
export function SimpleBottomNavBar({
  items,
  maxVisible = 4,
  className,
}: SimpleBottomNavBarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const needsMore = items.length > maxVisible;
  const visibleItems = needsMore ? items.slice(0, maxVisible) : items;
  const overflowItems = needsMore ? items.slice(maxVisible) : [];

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href + '/'));

  const isOverflowActive = overflowItems.some((item) => isActive(item.href));

  return (
    <>
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 border-t lg:hidden',
          'bg-card',
          className
        )}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 px-2 transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                <span
                  className={cn(
                    'text-xs mt-1 truncate max-w-full',
                    active && 'font-medium'
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}

          {needsMore && (
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 px-2 transition-colors',
                isOverflowActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs mt-1">更多</span>
            </button>
          )}
        </div>
      </nav>

      {/* 更多選單 Dialog */}
      {needsMore && (
        <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>更多功能</DialogTitle>
            </DialogHeader>
            <div className="space-y-1">
              {overflowItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors',
                      active
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
