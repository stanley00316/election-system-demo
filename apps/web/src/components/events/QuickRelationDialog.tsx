'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { votersApi } from '@/lib/api';
import { getStanceLabel } from '@/lib/utils';
import {
  Search,
  User,
  Users,
  ArrowRightLeft,
  Check,
  X,
  Loader2,
} from 'lucide-react';

// 關係類型標籤
const RELATION_TYPE_LABELS: Record<string, string> = {
  FAMILY: '家人',
  SPOUSE: '配偶',
  PARENT: '父母',
  CHILD: '子女',
  SIBLING: '兄弟姊妹',
  NEIGHBOR: '鄰居',
  FRIEND: '朋友',
  COLLEAGUE: '同事',
  COMMUNITY: '社區',
  OTHER: '其他',
};

// 快速選擇的關係類型
const QUICK_RELATION_TYPES = [
  'FAMILY',
  'FRIEND',
  'NEIGHBOR',
  'COLLEAGUE',
  'COMMUNITY',
  'OTHER',
] as const;

const STANCE_COLORS: Record<string, string> = {
  STRONG_SUPPORT: 'bg-green-600',
  SUPPORT: 'bg-green-500',
  LEAN_SUPPORT: 'bg-green-300 text-green-900',
  NEUTRAL: 'bg-yellow-500',
  UNDECIDED: 'bg-gray-400',
  LEAN_OPPOSE: 'bg-red-300 text-red-900',
  OPPOSE: 'bg-red-500',
  STRONG_OPPOSE: 'bg-red-600',
};

interface Attendee {
  id: string;
  voter: {
    id: string;
    name: string;
    phone?: string;
    stance?: string;
    address?: string;
  };
  status: string;
}

interface QuickRelationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string;
  eventName?: string;
  attendees?: Attendee[];
  campaignId?: string;
}

function StanceBadge({ stance }: { stance?: string }) {
  if (!stance) return null;
  const colorClass = STANCE_COLORS[stance] || 'bg-gray-400';
  return (
    <Badge className={`${colorClass} text-white text-xs`}>
      {getStanceLabel(stance)}
    </Badge>
  );
}

function VoterCard({
  voter,
  selected,
  onClick,
}: {
  voter: { id: string; name: string; phone?: string; stance?: string; address?: string };
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-transparent bg-muted/50 hover:bg-muted'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'
        }`}>
          {selected ? <Check className="h-4 w-4" /> : voter.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{voter.name}</span>
            <StanceBadge stance={voter.stance} />
          </div>
          {voter.phone && (
            <p className="text-xs text-muted-foreground">{voter.phone}</p>
          )}
        </div>
      </div>
    </button>
  );
}

export function QuickRelationDialog({
  open,
  onOpenChange,
  eventId,
  eventName,
  attendees = [],
  campaignId,
}: QuickRelationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 選擇狀態
  const [voterA, setVoterA] = useState<Attendee['voter'] | null>(null);
  const [voterB, setVoterB] = useState<Attendee['voter'] | null>(null);
  const [relationType, setRelationType] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [recordCount, setRecordCount] = useState(0);

  // 篩選參與者列表
  const filteredAttendeesA = useMemo(() => {
    return attendees.filter(a => 
      a.voter.id !== voterB?.id &&
      (searchA === '' || 
        a.voter.name.toLowerCase().includes(searchA.toLowerCase()) ||
        a.voter.phone?.includes(searchA))
    );
  }, [attendees, voterB, searchA]);

  const filteredAttendeesB = useMemo(() => {
    return attendees.filter(a => 
      a.voter.id !== voterA?.id &&
      (searchB === '' || 
        a.voter.name.toLowerCase().includes(searchB.toLowerCase()) ||
        a.voter.phone?.includes(searchB))
    );
  }, [attendees, voterA, searchB]);

  // 記錄見面 mutation
  const recordMeetingMutation = useMutation({
    mutationFn: votersApi.recordMeeting,
    onSuccess: () => {
      setRecordCount(prev => prev + 1);
      toast({
        title: '記錄成功',
        description: `已記錄 ${voterA?.name} 與 ${voterB?.name} 的關係`,
      });
      // 重置選擇
      setVoterA(null);
      setVoterB(null);
      setRelationType(null);
      setNotes('');
      setSearchA('');
      setSearchB('');
      // 刷新相關資料
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: ['event-relationships', eventId] });
      }
    },
    onError: (error: any) => {
      toast({
        title: '記錄失敗',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });
    },
  });

  // 提交記錄
  const handleSubmit = (continueRecording: boolean) => {
    if (!voterA || !voterB || !relationType) {
      toast({
        title: '請完成選擇',
        description: '請選擇兩位選民和關係類型',
        variant: 'destructive',
      });
      return;
    }

    recordMeetingMutation.mutate({
      voterAId: voterA.id,
      voterBId: voterB.id,
      relationType,
      eventId,
      notes: notes || undefined,
    });

    if (!continueRecording) {
      onOpenChange(false);
    }
  };

  // 重置狀態
  useEffect(() => {
    if (!open) {
      setVoterA(null);
      setVoterB(null);
      setRelationType(null);
      setNotes('');
      setSearchA('');
      setSearchB('');
      setRecordCount(0);
    }
  }, [open]);

  const canSubmit = voterA && voterB && relationType && !recordMeetingMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            快速記錄關係
            {eventName && (
              <Badge variant="outline" className="ml-2 font-normal">
                {eventName}
              </Badge>
            )}
          </DialogTitle>
          {recordCount > 0 && (
            <p className="text-sm text-muted-foreground">
              本次已記錄 <span className="font-semibold text-primary">{recordCount}</span> 組關係
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-4">
          {/* 選民選擇區域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 選民 A */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                選民 A
              </label>
              {voterA ? (
                <div className="p-3 rounded-lg bg-primary/10 border-2 border-primary">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {voterA.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{voterA.name}</span>
                          <StanceBadge stance={voterA.stance} />
                        </div>
                        {voterA.phone && (
                          <p className="text-xs text-muted-foreground">{voterA.phone}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setVoterA(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜尋選民..."
                      value={searchA}
                      onChange={(e) => setSearchA(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <ScrollArea className="h-40 rounded-lg border">
                    <div className="p-2 space-y-1">
                      {filteredAttendeesA.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          無符合的選民
                        </p>
                      ) : (
                        filteredAttendeesA.map((attendee) => (
                          <VoterCard
                            key={attendee.voter.id}
                            voter={attendee.voter}
                            selected={false}
                            onClick={() => setVoterA(attendee.voter)}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>

            {/* 選民 B */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                選民 B
              </label>
              {voterB ? (
                <div className="p-3 rounded-lg bg-primary/10 border-2 border-primary">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {voterB.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{voterB.name}</span>
                          <StanceBadge stance={voterB.stance} />
                        </div>
                        {voterB.phone && (
                          <p className="text-xs text-muted-foreground">{voterB.phone}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setVoterB(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜尋選民..."
                      value={searchB}
                      onChange={(e) => setSearchB(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <ScrollArea className="h-40 rounded-lg border">
                    <div className="p-2 space-y-1">
                      {filteredAttendeesB.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          無符合的選民
                        </p>
                      ) : (
                        filteredAttendeesB.map((attendee) => (
                          <VoterCard
                            key={attendee.voter.id}
                            voter={attendee.voter}
                            selected={false}
                            onClick={() => setVoterB(attendee.voter)}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </div>

          {/* 關係連結指示器 */}
          {voterA && voterB && (
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted">
                <span className="font-medium">{voterA.name}</span>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{voterB.name}</span>
              </div>
            </div>
          )}

          {/* 關係類型選擇 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">關係類型</label>
            <div className="flex flex-wrap gap-2">
              {QUICK_RELATION_TYPES.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={relationType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRelationType(type)}
                  className="min-w-[70px]"
                >
                  {RELATION_TYPE_LABELS[type]}
                </Button>
              ))}
            </div>
          </div>

          {/* 備註 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">備註（選填）</label>
            <Textarea
              placeholder="補充說明..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            完成
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={!canSubmit}
          >
            {recordMeetingMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            儲存並繼續
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
