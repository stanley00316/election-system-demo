'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { schedulesApi } from '@/lib/api';
import { useCampaignStore } from '@/stores/campaign';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarPlus,
  Calendar,
  Loader2,
  CheckCircle2,
  MapPin,
  User,
  Plus,
  AlertCircle,
} from 'lucide-react';

interface VoterInfo {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface AddToScheduleDialogProps {
  voters: VoterInfo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddToScheduleDialog({
  voters,
  open,
  onOpenChange,
  onSuccess,
}: AddToScheduleDialogProps) {
  const { currentCampaign } = useCampaignStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newScheduleTitle, setNewScheduleTitle] = useState('');
  const [addingVoters, setAddingVoters] = useState<Set<string>>(new Set());
  const [addedVoters, setAddedVoters] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Fetch schedules for today and recent days
  const { data: todaySchedules, isLoading: loadingToday } = useQuery({
    queryKey: ['schedules', 'date', today, currentCampaign?.id],
    queryFn: () => schedulesApi.getByDate(currentCampaign!.id, today),
    enabled: !!currentCampaign?.id && open,
  });

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedScheduleId(null);
      setShowCreateForm(false);
      setNewScheduleTitle(`${today} 拜訪行程`);
      setAddingVoters(new Set());
      setAddedVoters(new Set());
      setErrors({});
    }
  }, [open, today]);

  // Auto-select today's first schedule if available
  useEffect(() => {
    if (todaySchedules && todaySchedules.length > 0 && !selectedScheduleId) {
      setSelectedScheduleId(todaySchedules[0].id);
    }
  }, [todaySchedules, selectedScheduleId]);

  // Create new schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: (title: string) =>
      schedulesApi.create({
        campaignId: currentCampaign?.id,
        date: today,
        title,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setSelectedScheduleId(data.id);
      setShowCreateForm(false);
      toast({
        title: '成功',
        description: '已建立新行程',
      });
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '建立行程失敗',
        variant: 'destructive',
      });
    },
  });

  // Add voter to schedule mutation
  const addVoterMutation = useMutation({
    mutationFn: async ({ scheduleId, voter }: { scheduleId: string; voter: VoterInfo }) => {
      return schedulesApi.addItem(scheduleId, {
        type: 'VOTER_VISIT',
        voterId: voter.id,
        address: voter.address,
        locationLat: voter.latitude,
        locationLng: voter.longitude,
      });
    },
  });

  const handleAddVoters = async () => {
    if (!selectedScheduleId) {
      toast({
        title: '請選擇行程',
        description: '請先選擇或建立一個行程',
        variant: 'destructive',
      });
      return;
    }

    const newErrors: Record<string, string> = {};
    const newAddedVoters = new Set(addedVoters);

    for (const voter of voters) {
      if (addedVoters.has(voter.id)) continue;

      setAddingVoters((prev) => new Set(prev).add(voter.id));
      
      try {
        await addVoterMutation.mutateAsync({
          scheduleId: selectedScheduleId,
          voter,
        });
        newAddedVoters.add(voter.id);
      } catch (error: any) {
        newErrors[voter.id] = error.message || '加入失敗';
      } finally {
        setAddingVoters((prev) => {
          const next = new Set(prev);
          next.delete(voter.id);
          return next;
        });
      }
    }

    setAddedVoters(newAddedVoters);
    setErrors(newErrors);

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['schedules'] });

    // Check results
    const successCount = newAddedVoters.size - addedVoters.size;
    const errorCount = Object.keys(newErrors).length;

    if (successCount > 0 && errorCount === 0) {
      toast({
        title: '成功',
        description: `已將 ${successCount} 位選民加入行程`,
      });
      onSuccess?.();
      onOpenChange(false);
    } else if (successCount > 0) {
      toast({
        title: '部分成功',
        description: `${successCount} 位成功，${errorCount} 位失敗`,
      });
    } else if (errorCount > 0) {
      toast({
        title: '加入失敗',
        description: '請查看錯誤訊息',
        variant: 'destructive',
      });
    }
  };

  const handleCreateSchedule = () => {
    if (!newScheduleTitle.trim()) {
      toast({
        title: '請輸入行程名稱',
        variant: 'destructive',
      });
      return;
    }
    createScheduleMutation.mutate(newScheduleTitle);
  };

  const isLoading = loadingToday || createScheduleMutation.isPending || addingVoters.size > 0;
  const allAdded = voters.length > 0 && voters.every((v) => addedVoters.has(v.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            加入行程
          </DialogTitle>
          <DialogDescription>
            將選民加入今日拜訪行程，方便規劃路線
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 選擇的選民 */}
          <div>
            <Label className="text-sm font-medium">選擇的選民</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {voters.map((voter) => (
                <Badge
                  key={voter.id}
                  variant={addedVoters.has(voter.id) ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                >
                  {addingVoters.has(voter.id) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : addedVoters.has(voter.id) ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <User className="h-3 w-3" />
                  )}
                  {voter.name}
                </Badge>
              ))}
            </div>
            {voters.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">尚未選擇選民</p>
            )}
          </div>

          {/* 錯誤訊息 */}
          {Object.keys(errors).length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-2">
                <AlertCircle className="h-4 w-4" />
                部分選民加入失敗
              </div>
              <div className="text-xs space-y-1">
                {voters
                  .filter((v) => errors[v.id])
                  .map((v) => (
                    <div key={v.id} className="text-muted-foreground">
                      {v.name}: {errors[v.id]}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 選擇行程 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">選擇行程</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                建立新行程
              </Button>
            </div>

            {showCreateForm && (
              <div className="mb-3 p-3 rounded-lg border bg-muted/30">
                <Label htmlFor="newScheduleTitle" className="text-xs">
                  新行程名稱
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="newScheduleTitle"
                    value={newScheduleTitle}
                    onChange={(e) => setNewScheduleTitle(e.target.value)}
                    placeholder="輸入行程名稱..."
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateSchedule}
                    disabled={createScheduleMutation.isPending}
                    className="h-8"
                  >
                    {createScheduleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      '建立'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {loadingToday ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : todaySchedules && todaySchedules.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {todaySchedules.map((schedule: any) => (
                    <div
                      key={schedule.id}
                      onClick={() => setSelectedScheduleId(schedule.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedScheduleId === schedule.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {schedule.title}
                          </span>
                        </div>
                        {selectedScheduleId === schedule.id && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {schedule.items?.length || 0} 個地點
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {schedule.status === 'DRAFT'
                            ? '草稿'
                            : schedule.status === 'PLANNED'
                            ? '已規劃'
                            : schedule.status === 'IN_PROGRESS'
                            ? '進行中'
                            : schedule.status === 'COMPLETED'
                            ? '已完成'
                            : schedule.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">今日尚無行程</p>
                <p className="text-xs mt-1">請建立新行程</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {allAdded ? '關閉' : '取消'}
          </Button>
          {!allAdded && (
            <Button
              onClick={handleAddVoters}
              disabled={isLoading || voters.length === 0 || !selectedScheduleId}
            >
              {addingVoters.size > 0 ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  加入中...
                </>
              ) : (
                <>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  加入行程
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
