'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { eventsApi, votersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatDate, getStanceLabel } from '@/lib/utils';
import { QuickRelationDialog } from '@/components/events';
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  Clock,
  Users,
  Plus,
  CheckCircle,
  Link as LinkIcon,
  ArrowRightLeft,
} from 'lucide-react';

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

const EVENT_TYPE_LABELS: Record<string, string> = {
  LIVING_ROOM: '客廳會',
  FUNERAL: '公祭',
  WEDDING: '喜事',
  COMMUNITY: '社區活動',
  TEMPLE: '廟會',
  CAMPAIGN: '競選活動',
  MEETING: '座談會',
  OTHER: '其他',
};

const STATUS_STYLES: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  COMPLETED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: '規劃中',
  CONFIRMED: '已確認',
  IN_PROGRESS: '進行中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const ATTENDEE_STATUS: Record<string, string> = {
  INVITED: '已邀請',
  CONFIRMED: '已確認',
  ATTENDED: '已出席',
  NO_SHOW: '缺席',
  CANCELLED: '取消',
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const eventId = params.id as string;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quickRelationOpen, setQuickRelationOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getById(eventId),
    enabled: !!eventId,
  });

  const { data: attendees } = useQuery({
    queryKey: ['event', eventId, 'attendees'],
    queryFn: () => eventsApi.getAttendees(eventId),
    enabled: !!eventId,
  });

  const { data: eventRelationships } = useQuery({
    queryKey: ['event-relationships', eventId],
    queryFn: () => votersApi.getRelationshipsByEvent(eventId),
    enabled: !!eventId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => eventsApi.delete(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      router.push('/dashboard/events');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) => eventsApi.update(eventId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: '狀態已更新',
        description: '活動狀態已成功更新',
      });
    },
    onError: () => {
      toast({
        title: '更新失敗',
        description: '無法更新活動狀態，請稍後再試',
        variant: 'destructive',
      });
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (newStatus !== event?.status) {
      updateStatusMutation.mutate(newStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">活動不存在</p>
            <Link href="/dashboard/events">
              <Button variant="outline" className="mt-4">
                返回活動列表
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/events">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {EVENT_TYPE_LABELS[event.type] || event.type}
              </Badge>
              <Select 
                value={event.status} 
                onValueChange={handleStatusChange}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className={`w-28 h-6 text-xs font-medium border-0 ${STATUS_STYLES[event.status]}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">規劃中</SelectItem>
                  <SelectItem value="CONFIRMED">已確認</SelectItem>
                  <SelectItem value="IN_PROGRESS">進行中</SelectItem>
                  <SelectItem value="COMPLETED">已完成</SelectItem>
                  <SelectItem value="CANCELLED">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <h1 className="text-2xl font-bold mt-1">{event.name}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/events/${eventId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              編輯
            </Button>
          </Link>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                刪除
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>確認刪除</DialogTitle>
                <DialogDescription>
                  確定要刪除活動「{event.name}」嗎？此操作無法復原。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? '刪除中...' : '確認刪除'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            基本資訊
          </TabsTrigger>
          <TabsTrigger value="attendees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            參與者
            {attendees?.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {attendees.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="relations" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            關係發現
            {eventRelationships?.totalRelationships > 0 && (
              <Badge variant="secondary" className="ml-1">
                {eventRelationships.totalRelationships}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 基本資訊 Tab */}
        <TabsContent value="info" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>活動資訊</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">日期</p>
                        <p className="font-medium">
                          {formatDate(event.startTime, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'long',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">時間</p>
                        <p className="font-medium">
                          {formatDate(event.startTime, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {event.endTime && (
                            <>
                              {' - '}
                              {formatDate(event.endTime, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {event.address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">地點</p>
                        <p className="font-medium">{event.address}</p>
                      </div>
                    </div>
                  )}

                  {event.description && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">活動說明</p>
                        <p className="whitespace-pre-wrap">{event.description}</p>
                      </div>
                    </>
                  )}

                  {event.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">備註</p>
                        <p className="whitespace-pre-wrap">{event.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>統計</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">預期人數</span>
                    <span className="font-medium">{event.expectedAttendees || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">實際人數</span>
                    <span className="font-medium">{event.actualAttendees || '-'}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">已邀請</span>
                    <span className="font-medium">
                      {attendees?.filter((a: any) => a.status === 'INVITED').length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">已確認</span>
                    <span className="font-medium">
                      {attendees?.filter((a: any) => a.status === 'CONFIRMED').length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">已出席</span>
                    <span className="font-medium">
                      {attendees?.filter((a: any) => a.status === 'ATTENDED').length || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Host */}
              {event.host && (
                <Card>
                  <CardHeader>
                    <CardTitle>主辦人</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <span className="font-medium">
                          {event.host.name?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/voters/${event.host.id}`}
                          className="font-medium hover:underline"
                        >
                          {event.host.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {event.host.phone || event.host.address || ''}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Created Info */}
              <Card>
                <CardHeader>
                  <CardTitle>建立資訊</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">建立者</span>
                    <span>{event.creator?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">建立時間</span>
                    <span>
                      {formatDate(event.createdAt, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 參與者 Tab */}
        <TabsContent value="attendees" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>參與者列表</CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                新增參與者
              </Button>
            </CardHeader>
            <CardContent>
              {attendees?.length > 0 ? (
                <div className="space-y-3">
                  {attendees.map((attendee: any) => (
                    <div
                      key={attendee.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {attendee.voter?.name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/voters/${attendee.voter?.id}`}
                            className="font-medium hover:underline"
                          >
                            {attendee.voter?.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {attendee.voter?.phone || '無電話'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {ATTENDEE_STATUS[attendee.status] || attendee.status}
                        </Badge>
                        {attendee.status !== 'ATTENDED' && (
                          <Button size="sm" variant="ghost">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  尚未新增參與者
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 關係發現 Tab */}
        <TabsContent value="relations" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>關係發現</CardTitle>
                <CardDescription>
                  記錄在此活動中發現的選民關係
                </CardDescription>
              </div>
              <Button onClick={() => setQuickRelationOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                快速記錄
              </Button>
            </CardHeader>
            <CardContent>
              {eventRelationships?.firstMetRelationships?.length > 0 ? (
                <div className="space-y-3">
                  {eventRelationships.firstMetRelationships.map((rel: any) => (
                    <div
                      key={rel.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        {/* 選民 A */}
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {rel.sourceVoter?.name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <Link
                              href={`/dashboard/voters/${rel.sourceVoter?.id}`}
                              className="font-medium hover:underline"
                            >
                              {rel.sourceVoter?.name}
                            </Link>
                          </div>
                        </div>

                        {/* 關係指示 */}
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
                          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {RELATION_TYPE_LABELS[rel.relationType] || rel.relationType}
                          </span>
                        </div>

                        {/* 選民 B */}
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {rel.targetVoter?.name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <Link
                              href={`/dashboard/voters/${rel.targetVoter?.id}`}
                              className="font-medium hover:underline"
                            >
                              {rel.targetVoter?.name}
                            </Link>
                          </div>
                        </div>
                      </div>

                      <Badge variant="secondary">
                        見面 {rel.meetingCount} 次
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <LinkIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    尚未在此活動中發現選民關係
                  </p>
                  <Button onClick={() => setQuickRelationOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    開始記錄
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 見面紀錄列表 */}
          {eventRelationships?.meetingsAtEvent?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>見面紀錄</CardTitle>
                <CardDescription>
                  共 {eventRelationships.totalMeetings} 筆紀錄
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {eventRelationships.meetingsAtEvent.map((meeting: any) => (
                    <div
                      key={meeting.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {meeting.relationship?.sourceVoter?.name}
                        </span>
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {meeting.relationship?.targetVoter?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>記錄者: {meeting.recorder?.name}</span>
                        <span>·</span>
                        <span>
                          {formatDate(meeting.createdAt, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Relation Dialog */}
      <QuickRelationDialog
        open={quickRelationOpen}
        onOpenChange={setQuickRelationOpen}
        eventId={eventId}
        eventName={event.name}
        attendees={attendees}
        campaignId={event.campaignId}
      />
    </div>
  );
}
