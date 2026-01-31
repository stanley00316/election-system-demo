'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ALL_NAV_ITEMS, NavItem } from './BottomNavBar';
import { cn } from '@/lib/utils';
import { GripVertical, RotateCcw } from 'lucide-react';

// 預設項目
const DEFAULT_ITEMS = [
  '/dashboard',
  '/dashboard/voters',
  '/dashboard/schedules',
  '/dashboard/map',
];

const MAX_ITEMS = 4;

interface NavSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: string[];
  onSave: (items: string[]) => void;
}

export function NavSettingsDialog({
  open,
  onOpenChange,
  selectedItems,
  onSave,
}: NavSettingsDialogProps) {
  const { toast } = useToast();
  const [localSelected, setLocalSelected] = useState<string[]>(selectedItems);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // 當對話框開啟時，同步外部的選擇狀態
  useEffect(() => {
    if (open) {
      setLocalSelected(selectedItems);
    }
  }, [open, selectedItems]);

  // 切換選擇狀態
  const toggleItem = (href: string) => {
    if (localSelected.includes(href)) {
      // 移除
      setLocalSelected(prev => prev.filter(h => h !== href));
    } else {
      // 新增（檢查數量限制）
      if (localSelected.length >= MAX_ITEMS) {
        toast({
          title: '已達上限',
          description: `最多只能選擇 ${MAX_ITEMS} 個項目`,
          variant: 'destructive',
        });
        return;
      }
      setLocalSelected(prev => [...prev, href]);
    }
  };

  // 拖曳開始
  const handleDragStart = (e: React.DragEvent, href: string) => {
    setDraggedItem(href);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 拖曳結束
  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // 拖曳經過
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 放置
  const handleDrop = (e: React.DragEvent, targetHref: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetHref) return;

    // 只能在已選擇的項目間重新排序
    if (!localSelected.includes(draggedItem) || !localSelected.includes(targetHref)) {
      return;
    }

    const newSelected = [...localSelected];
    const fromIndex = newSelected.indexOf(draggedItem);
    const toIndex = newSelected.indexOf(targetHref);

    newSelected.splice(fromIndex, 1);
    newSelected.splice(toIndex, 0, draggedItem);

    setLocalSelected(newSelected);
    setDraggedItem(null);
  };

  // 重置為預設
  const handleReset = () => {
    setLocalSelected(DEFAULT_ITEMS);
    toast({
      title: '已重置',
      description: '導航欄已恢復預設設定',
    });
  };

  // 儲存
  const handleSave = () => {
    if (localSelected.length === 0) {
      toast({
        title: '請選擇項目',
        description: '至少選擇一個導航項目',
        variant: 'destructive',
      });
      return;
    }
    onSave(localSelected);
    toast({
      title: '已儲存',
      description: '導航欄設定已更新',
    });
  };

  // 取得項目的排序索引（如果已選擇）
  const getItemIndex = (href: string) => {
    const index = localSelected.indexOf(href);
    return index >= 0 ? index + 1 : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>自訂導航欄</DialogTitle>
          <DialogDescription>
            選擇要在底部導航欄顯示的功能（最多 {MAX_ITEMS} 個）
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-2">
            {ALL_NAV_ITEMS.map((item) => {
              const isSelected = localSelected.includes(item.href);
              const itemIndex = getItemIndex(item.href);
              const Icon = item.icon;

              return (
                <div
                  key={item.href}
                  draggable={isSelected}
                  onDragStart={(e) => handleDragStart(e, item.href)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item.href)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all',
                    isSelected
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-muted/30 border-transparent hover:bg-muted/50',
                    draggedItem === item.href && 'opacity-50',
                    isSelected && 'cursor-move'
                  )}
                >
                  {/* 拖曳把手 */}
                  <div className={cn(
                    'text-muted-foreground',
                    !isSelected && 'opacity-0'
                  )}>
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Checkbox */}
                  <Checkbox
                    id={item.href}
                    checked={isSelected}
                    onCheckedChange={() => toggleItem(item.href)}
                  />

                  {/* 圖示 */}
                  <Icon className={cn(
                    'h-5 w-5',
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  )} />

                  {/* 名稱 */}
                  <label
                    htmlFor={item.href}
                    className={cn(
                      'flex-1 text-sm cursor-pointer',
                      isSelected && 'font-medium'
                    )}
                  >
                    {item.name}
                  </label>

                  {/* 排序編號 */}
                  {itemIndex && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {itemIndex}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="text-sm text-muted-foreground text-center">
          已選擇 {localSelected.length} / {MAX_ITEMS} 個項目
          {localSelected.length > 0 && '（可拖曳調整順序）'}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            重置預設
          </Button>
          <Button onClick={handleSave}>
            儲存設定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
