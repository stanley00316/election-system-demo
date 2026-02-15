'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { contactsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface DeleteContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any | null;
  voterId: string;
}

export function DeleteContactDialog({
  open,
  onOpenChange,
  contact,
  voterId,
}: DeleteContactDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: () => contactsApi.delete(contact!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voter', voterId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: '成功', description: '接觸紀錄已刪除' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '刪除失敗',
        variant: 'destructive',
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定要刪除這筆接觸紀錄嗎？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作無法復原。刪除後將永久移除這筆接觸紀錄及其所有相關資料。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            確定刪除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
