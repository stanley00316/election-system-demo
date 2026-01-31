'use client';

import { useRouter } from 'next/navigation';
import { Zap, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  currentLimit?: string;
}

export function UpgradeModal({
  open,
  onOpenChange,
  feature = '此功能',
  currentLimit,
}: UpgradeModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">升級以使用更多功能</DialogTitle>
          <DialogDescription className="text-center">
            {currentLimit
              ? `您已達到目前方案的${currentLimit}上限`
              : `${feature}需要升級方案才能使用`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-3">升級後您可以：</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                管理無限數量的選民資料
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                邀請更多團隊成員協作
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                使用進階分析與報表功能
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                優先客服支援
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleUpgrade} className="w-full">
              查看方案與價格
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              稍後再說
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
