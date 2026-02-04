'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { contactsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Loader2 } from 'lucide-react';
import { ContactType, ContactOutcome } from '@/shared/types/contact';

interface LineContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voter: {
    id: string;
    name: string;
    lineId?: string;
    lineUrl?: string;
  };
  campaignId: string;
  onSuccess?: () => void;
}

const outcomeOptions = [
  { value: 'POSITIVE', label: '正面', description: '對話順利，態度良好' },
  { value: 'NEUTRAL', label: '中立', description: '態度一般，無明顯傾向' },
  { value: 'NEGATIVE', label: '負面', description: '態度不佳，可能需要跟進' },
  { value: 'NO_RESPONSE', label: '無回應', description: '未接聽或未讀訊息' },
];

export function LineContactDialog({
  open,
  onOpenChange,
  voter,
  campaignId,
  onSuccess,
}: LineContactDialogProps) {
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<ContactOutcome>(ContactOutcome.NEUTRAL);
  const [notes, setNotes] = useState('');

  const createContactMutation = useMutation({
    mutationFn: (data: any) => contactsApi.create(data),
    onSuccess: () => {
      toast({
        title: '成功',
        description: 'LINE 通話已記錄',
      });
      onOpenChange(false);
      setOutcome(ContactOutcome.NEUTRAL);
      setNotes('');
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '記錄失敗',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    createContactMutation.mutate({
      voterId: voter.id,
      campaignId,
      type: ContactType.LINE_CALL,
      outcome,
      notes: notes.trim() || undefined,
      contactDate: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            記錄 LINE 通話
          </DialogTitle>
          <DialogDescription>
            記錄與 <span className="font-medium">{voter.name}</span> 的 LINE 通話
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 通話結果 */}
          <div className="space-y-3">
            <Label>通話結果</Label>
            <RadioGroup
              value={outcome}
              onValueChange={(value) => setOutcome(value as ContactOutcome)}
              className="grid gap-3"
            >
              {outcomeOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label
                    htmlFor={option.value}
                    className="flex flex-col cursor-pointer"
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 備註 */}
          <div className="space-y-2">
            <Label htmlFor="notes">備註（選填）</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="輸入通話內容摘要或其他備註..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createContactMutation.isPending}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createContactMutation.isPending}
          >
            {createContactMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                記錄中...
              </>
            ) : (
              '確認記錄'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
