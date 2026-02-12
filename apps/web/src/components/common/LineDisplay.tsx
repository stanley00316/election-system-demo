'use client';

import { ExternalLink, UserPlus, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LineDisplayProps {
  /** LINE ID（如 @abc123） */
  lineId?: string | null;
  /** LINE 連結 URL */
  lineUrl?: string | null;
  /** 顯示模式：compact 只顯示圖示，full 顯示完整資訊 */
  variant?: 'compact' | 'full' | 'inline';
  /** 是否顯示加入好友按鈕 */
  showAddButton?: boolean;
  /** 自訂樣式 */
  className?: string;
}

/**
 * LINE 資訊顯示元件
 * 
 * 統一處理 LINE ID 和 LINE URL 的顯示邏輯：
 * - 有 LINE ID 時：顯示 LINE ID + 加入好友按鈕
 * - 只有 LINE URL 時：顯示「點擊加入好友」按鈕（不顯示原始 URL）
 * - 兩者都沒有時：不顯示任何內容
 */
export function LineDisplay({
  lineId,
  lineUrl,
  variant = 'full',
  showAddButton = true,
  className,
}: LineDisplayProps) {
  // 如果沒有 LINE 資訊，不顯示
  if (!lineId && !lineUrl) {
    return null;
  }

  // 產生加入好友的連結
  const addFriendUrl = lineUrl || (lineId ? `https://line.me/ti/p/~${lineId}` : null);

  // 開啟加入好友連結
  const handleAddFriend = () => {
    if (addFriendUrl) {
      window.open(addFriendUrl, '_blank');
    }
  };

  // 精簡模式 - 只顯示圖示
  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('text-green-600 hover:text-green-700 hover:bg-green-50', className)}
        onClick={handleAddFriend}
        title={lineId ? `LINE: ${lineId}` : '開啟 LINE 加入好友'}
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    );
  }

  // 行內模式 - 用於列表中顯示
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <MessageCircle className="h-4 w-4 text-green-600" />
        {lineId ? (
          <span className="text-sm font-medium text-green-600">{lineId}</span>
        ) : (
          <span className="text-sm text-muted-foreground">已連結 LINE</span>
        )}
        {showAddButton && addFriendUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={handleAddFriend}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            加好友
          </Button>
        )}
      </div>
    );
  }

  // 完整模式 - 用於詳情頁
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">LINE</p>
        <div className="flex items-center gap-2 flex-wrap">
          {lineId ? (
            <span className="font-medium text-green-600">{lineId}</span>
          ) : (
            <span className="text-sm text-muted-foreground">（無法取得 LINE ID）</span>
          )}
          {showAddButton && addFriendUrl && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
              onClick={handleAddFriend}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              加入好友
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * LINE 加入好友按鈕
 * 
 * 獨立的按鈕元件，用於需要單獨顯示加好友按鈕的場景
 */
export function LineAddFriendButton({
  lineId,
  lineUrl,
  className,
  size = 'default',
}: {
  lineId?: string | null;
  lineUrl?: string | null;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}) {
  const addFriendUrl = lineUrl || (lineId ? `https://line.me/ti/p/~${lineId}` : null);

  if (!addFriendUrl) {
    return null;
  }

  const handleClick = () => {
    window.open(addFriendUrl, '_blank');
  };

  return (
    <Button
      variant="outline"
      size={size}
      className={cn(
        'border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700',
        className
      )}
      onClick={handleClick}
    >
      <UserPlus className="h-4 w-4 mr-2" />
      加入好友
    </Button>
  );
}

/**
 * LINE 開啟按鈕
 * 
 * 用於開啟與選民的 LINE 對話
 */
export function LineOpenButton({
  lineId,
  lineUrl,
  className,
  size = 'default',
  onBeforeOpen,
}: {
  lineId?: string | null;
  lineUrl?: string | null;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onBeforeOpen?: () => void;
}) {
  const openUrl = lineUrl || (lineId ? `https://line.me/ti/p/~${lineId}` : null);

  if (!openUrl) {
    return null;
  }

  const handleClick = () => {
    onBeforeOpen?.();
    window.open(openUrl, '_blank');
  };

  return (
    <Button
      variant="default"
      size={size}
      className={cn('bg-green-600 hover:bg-green-700', className)}
      onClick={handleClick}
    >
      <ExternalLink className="h-4 w-4 mr-2" />
      開啟 LINE
    </Button>
  );
}
