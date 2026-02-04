'use client';

import * as React from 'react';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Delete } from 'lucide-react';

export interface NumericKeypadProps {
  value: number | string | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function NumericKeypad({
  value,
  onChange,
  min,
  max,
  placeholder,
  disabled = false,
  className,
}: NumericKeypadProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string>('');

  // 當 popover 開啟時，初始化輸入值
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setInputValue(value !== undefined && value !== '' ? String(value) : '');
    }
    setOpen(isOpen);
  };

  // 處理數字按鈕點擊
  const handleNumberClick = (num: number) => {
    const newValue = inputValue + String(num);
    const numValue = parseInt(newValue, 10);
    
    // 檢查是否超過最大值
    if (max !== undefined && numValue > max) {
      return;
    }
    
    setInputValue(newValue);
    onChange(numValue);
  };

  // 處理清除
  const handleClear = () => {
    setInputValue('');
    onChange(undefined);
  };

  // 處理退格
  const handleBackspace = () => {
    if (inputValue.length > 0) {
      const newValue = inputValue.slice(0, -1);
      setInputValue(newValue);
      onChange(newValue ? parseInt(newValue, 10) : undefined);
    }
  };

  // 處理確認
  const handleConfirm = () => {
    setOpen(false);
  };

  // 顯示值
  const displayValue = value !== undefined && value !== '' ? String(value) : '';

  // 數字按鈕
  const NumberButton = ({ num }: { num: number }) => (
    <Button
      type="button"
      variant="outline"
      className="h-12 w-full text-lg font-medium"
      onClick={() => handleNumberClick(num)}
    >
      {num}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'text-left',
            !displayValue && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          {displayValue || placeholder || '點擊輸入數字'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          {/* 顯示當前值 */}
          <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
            <span className="text-sm text-muted-foreground">當前值</span>
            <span className="text-lg font-semibold">
              {inputValue || '—'}
            </span>
          </div>

          {/* 範圍提示 */}
          {(min !== undefined || max !== undefined) && (
            <p className="text-xs text-muted-foreground text-center">
              範圍：{min ?? 0} - {max ?? '∞'}
            </p>
          )}

          {/* 數字鍵盤 */}
          <div className="grid grid-cols-3 gap-2">
            <NumberButton num={7} />
            <NumberButton num={8} />
            <NumberButton num={9} />
            <NumberButton num={4} />
            <NumberButton num={5} />
            <NumberButton num={6} />
            <NumberButton num={1} />
            <NumberButton num={2} />
            <NumberButton num={3} />
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full text-lg font-medium text-destructive hover:text-destructive"
              onClick={handleClear}
            >
              C
            </Button>
            <NumberButton num={0} />
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full"
              onClick={handleBackspace}
            >
              <Delete className="h-5 w-5" />
            </Button>
          </div>

          {/* 確認按鈕 */}
          <Button
            type="button"
            className="w-full"
            onClick={handleConfirm}
          >
            確認
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
