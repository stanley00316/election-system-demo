'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isDemoMode, getProductionUrl } from '@/lib/api';
import { X, Lightbulb, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/** 每個路由的提示訊息 */
const TIPS: Record<string, { text: string; detail?: string }> = {
  '/dashboard': {
    text: '這裡是選情總覽儀表板',
    detail: '即時掌握選民總數、接觸率、支持度等關鍵數據，以及政治傾向分佈圖表。',
  },
  '/dashboard/voters': {
    text: '選民管理列表',
    detail: '支援搜尋、篩選、批次匯入 Excel，快速建立與維護選民資料庫。',
  },
  '/dashboard/contacts': {
    text: '接觸紀錄管理',
    detail: '記錄每次拜訪、電話、LINE 等接觸方式，追蹤選民互動歷程。',
  },
  '/dashboard/map': {
    text: '地圖熱力圖',
    detail: '視覺化選民分佈，一眼掌握重點村里與空白區域。',
  },
  '/dashboard/analysis': {
    text: '選情分析',
    detail: '支持度趨勢、接觸成效統計、行政區比較，數據驅動的選戰策略。',
  },
  '/dashboard/schedules': {
    text: '行程規劃',
    detail: '候選人行程管理、活動安排，團隊成員共享日曆。',
  },
  '/dashboard/events': {
    text: '活動管理',
    detail: '建立選民活動、追蹤出席，提升選民參與度。',
  },
  '/promoter/dashboard': {
    text: '推廣人員儀表板',
    detail: '追蹤推薦成效、管理分享連結，查看佣金報表。',
  },
  '/admin': {
    text: '管理員後台總覽',
    detail: '使用者管理、訂閱管理、營收數據、系統分析一覽無遺。',
  },
};

/** 根據路徑找到最匹配的提示 */
function findTip(pathname: string) {
  // 精確匹配優先
  if (TIPS[pathname]) return TIPS[pathname];
  // 前綴匹配（取最長前綴）
  const keys = Object.keys(TIPS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (pathname.startsWith(key + '/')) return TIPS[key];
  }
  return null;
}

const STORAGE_KEY = 'demo-dismissed-tips';

function getDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function setDismissed(dismissed: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
}

export function DemoTip() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState<{ text: string; detail?: string } | null>(null);

  useEffect(() => {
    if (!isDemoMode) return;
    const tip = findTip(pathname);
    if (!tip) {
      setVisible(false);
      return;
    }
    const dismissed = getDismissed();
    if (dismissed.has(pathname)) {
      setVisible(false);
      return;
    }
    setCurrentTip(tip);
    setVisible(true);
  }, [pathname]);

  if (!isDemoMode || !visible || !currentTip) return null;

  const handleDismiss = () => {
    setVisible(false);
    const dismissed = getDismissed();
    dismissed.add(pathname);
    setDismissed(dismissed);
  };

  return (
    <div className="relative mx-auto max-w-5xl px-4 pt-3">
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 p-3 text-sm shadow-sm">
        <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
        <div className="flex-1 min-w-0">
          <span className="font-medium text-blue-800 dark:text-blue-200">{currentTip.text}</span>
          {currentTip.detail && (
            <span className="text-blue-600 dark:text-blue-300"> — {currentTip.detail}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href={getProductionUrl()} target="_blank" rel="noopener noreferrer">
            <Button variant="default" size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white">
              正式使用
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </a>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100">
              展示首頁
            </Button>
          </Link>
          <button
            onClick={handleDismiss}
            className="rounded p-0.5 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors"
            aria-label="關閉提示"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
