'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Calendar,
  MapPin,
  Map,
  BarChart3,
  Settings,
  MoreHorizontal,
  QrCode,
  LucideIcon,
} from 'lucide-react';
import { NavSettingsDialog } from './NavSettingsDialog';

// 所有可用的導航項目
export const ALL_NAV_ITEMS = [
  { name: '總覽', href: '/dashboard', icon: LayoutDashboard },
  { name: '選民管理', href: '/dashboard/voters', icon: Users },
  { name: '掃描 LINE', href: '/dashboard/scan-line', icon: QrCode },
  { name: '接觸紀錄', href: '/dashboard/contacts', icon: MessageSquare },
  { name: '活動管理', href: '/dashboard/events', icon: Calendar },
  { name: '行程規劃', href: '/dashboard/schedules', icon: MapPin },
  { name: '地圖檢視', href: '/dashboard/map', icon: Map },
  { name: '選情分析', href: '/dashboard/analysis', icon: BarChart3},
  { name: '設定', href: '/dashboard/settings', icon: Settings },
] as const;

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

// 預設顯示的項目 (4個 + 更多)
const DEFAULT_NAV_ITEMS = [
  '/dashboard',
  '/dashboard/voters',
  '/dashboard/schedules',
  '/dashboard/map',
];

const STORAGE_KEY = 'bottomNavItems';

interface BottomNavConfig {
  items: string[];
  updatedAt: string;
}

export function BottomNavBar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>(DEFAULT_NAV_ITEMS);
  const [mounted, setMounted] = useState(false);

  // 從 localStorage 載入設定
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const config: BottomNavConfig = JSON.parse(stored);
        if (config.items && config.items.length > 0) {
          setSelectedItems(config.items);
        }
      }
    } catch (e) {
      console.error('Failed to load bottom nav config:', e);
    }
  }, []);

  // 儲存設定到 localStorage
  const handleSaveSettings = (items: string[]) => {
    setSelectedItems(items);
    const config: BottomNavConfig = {
      items,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSettingsOpen(false);
  };

  // 取得要顯示的導航項目
  const displayItems = selectedItems
    .map(href => ALL_NAV_ITEMS.find(item => item.href === href))
    .filter((item): item is NavItem => item !== undefined)
    .slice(0, 4);

  // 檢查當前頁面是否在底部導航中
  const isCurrentPageInNav = displayItems.some(item => pathname === item.href);

  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* 底部導航欄 - 僅行動裝置顯示 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t lg:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {displayItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 px-2 transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                <span className={cn(
                  'text-xs mt-1 truncate max-w-full',
                  isActive && 'font-medium'
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}
          
          {/* 更多按鈕 */}
          <button
            onClick={() => setSettingsOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full py-1 px-2 transition-colors',
              !isCurrentPageInNav
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-xs mt-1">更多</span>
          </button>
        </div>
      </nav>

      {/* 導航設定對話框 */}
      <NavSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        selectedItems={selectedItems}
        onSave={handleSaveSettings}
      />
    </>
  );
}
