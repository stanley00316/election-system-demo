'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
import { votersApi, contactsApi } from '@/lib/api';
import { useCampaignStore } from '@/stores/campaign';
import { useToast } from '@/hooks/use-toast';
import {
  formatDate,
  formatRelativeTime,
  getStanceColor,
  getStanceLabel,
  getContactTypeLabel,
  getContactOutcomeLabel,
  getRelationTypeLabel,
} from '@/lib/utils';
import {
  RELATION_TYPE_LABELS,
} from '@/shared';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  MessageSquare,
  Users,
  TrendingUp,
  Plus,
  ExternalLink,
  Search,
  Loader2,
  CalendarDays,
  ArrowRightLeft,
  CalendarPlus,
  MessageCircle,
} from 'lucide-react';
import { AddToScheduleDialog } from '@/components/voters/AddToScheduleDialog';
import { VoterAttachments } from '@/components/voters/VoterAttachments';
import dynamic from 'next/dynamic';

// 動態匯入 LINE 通話記錄對話框
const LineContactDialog = dynamic(
  () => import('@/components/contacts/LineContactDialog').then(mod => mod.LineContactDialog),
  { ssr: false }
);

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  INVITED: '已邀請',
  CONFIRMED: '已確認',
  ATTENDED: '已出席',
  NO_SHOW: '缺席',
  CANCELLED: '取消',
};

export default function VoterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentCampaign } = useCampaignStore();
  const { toast } = useToast();
  const voterId = params.id as string;
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addRelationDialogOpen, setAddRelationDialogOpen] = useState(false);
  const [recordMeetingDialogOpen, setRecordMeetingDialogOpen] = useState(false);
  const [addToScheduleOpen, setAddToScheduleOpen] = useState(false);
  const [lineContactDialogOpen, setLineContactDialogOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<any>(null);
  const [relationSearch, setRelationSearch] = useState('');
  const [selectedRelationVoter, setSelectedRelationVoter] = useState<any>(null);
  const [relationType, setRelationType] = useState<string>('');
  const [influenceWeight, setInfluenceWeight] = useState(50);
  const [relationNotes, setRelationNotes] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');

  const { data: voter, isLoading, error } = useQuery({
    queryKey: ['voter', voterId],
    queryFn: () => votersApi.getById(voterId),
    enabled: !!voterId,
  });

  // 搜尋選民（用於新增關係）
  const { data: relationSearchResults, isLoading: isSearching } = useQuery({
    queryKey: ['voters', 'relation-search', relationSearch, currentCampaign?.id],
    queryFn: () =>
      votersApi.getAll({
        campaignId: currentCampaign?.id,
        search: relationSearch,
        limit: 10,
      }),
    enabled: !!relationSearch && relationSearch.length >= 2 && !!currentCampaign?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => votersApi.delete(voterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voters'] });
      router.push('/dashboard/voters');
    },
  });

  // 新增關係 mutation
  const createRelationshipMutation = useMutation({
    mutationFn: (data: {
      sourceVoterId: string;
      targetVoterId: string;
      relationType: string;
      influenceWeight: number;
      notes?: string;
    }) => votersApi.createRelationship(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voter', voterId] });
      setAddRelationDialogOpen(false);
      resetRelationForm();
      toast({
        title: '成功',
        description: '已新增關係',
      });
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '新增關係失敗',
        variant: 'destructive',
      });
    },
  });

  // 記錄見面 mutation
  const recordMeetingMutation = useMutation({
    mutationFn: (data: {
      voterAId: string;
      voterBId: string;
      relationType: string;
      notes?: string;
    }) => votersApi.recordMeeting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voter', voterId] });
      setRecordMeetingDialogOpen(false);
      setSelectedRelationship(null);
      setMeetingNotes('');
      toast({
        title: '成功',
        description: '已記錄見面',
      });
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '記錄見面失敗',
        variant: 'destructive',
      });
    },
  });

  const handleRecordMeeting = () => {
    if (!selectedRelationship) return;
    
    const relatedVoterId = selectedRelationship.direction === 'from'
      ? selectedRelationship.targetVoterId
      : selectedRelationship.sourceVoterId;

    recordMeetingMutation.mutate({
      voterAId: voterId,
      voterBId: relatedVoterId,
      relationType: selectedRelationship.relationType,
      notes: meetingNotes || undefined,
    });
  };

  const resetRelationForm = () => {
    setRelationSearch('');
    setSelectedRelationVoter(null);
    setRelationType('');
    setInfluenceWeight(50);
    setRelationNotes('');
  };

  const handleAddRelationship = () => {
    if (!selectedRelationVoter || !relationType) return;
    
    createRelationshipMutation.mutate({
      sourceVoterId: voterId,
      targetVoterId: selectedRelationVoter.id,
      relationType,
      influenceWeight,
      notes: relationNotes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !voter) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">選民資料不存在</p>
            <Link href="/dashboard/voters">
              <Button variant="outline" className="mt-4">
                返回選民列表
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const relationships = [
    ...(voter.relationshipsFrom || []).map((r: any) => ({
      ...r,
      relatedVoter: r.targetVoter,
      direction: 'from',
    })),
    ...(voter.relationshipsTo || []).map((r: any) => ({
      ...r,
      relatedVoter: r.sourceVoter,
      direction: 'to',
    })),
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/voters">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{voter.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStanceColor(voter.stance)}>
                {getStanceLabel(voter.stance)}
              </Badge>
              {voter.politicalParty && (
                <Badge variant="outline">{voter.politicalParty}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* LINE 按鈕 - 當選民有 LINE 資訊時顯示 */}
          {(voter.lineId || voter.lineUrl) && (
            <>
              <Button
                variant="outline"
                className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                onClick={() => {
                  const lineUrl = voter.lineUrl || (voter.lineId ? `https://line.me/ti/p/~${voter.lineId}` : null);
                  if (lineUrl) {
                    window.open(lineUrl, '_blank');
                  }
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                開啟 LINE
              </Button>
              <Button
                variant="outline"
                onClick={() => setLineContactDialogOpen(true)}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                記錄 LINE 通話
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setAddToScheduleOpen(true)}>
            <CalendarPlus className="h-4 w-4 mr-2" />
            加入行程
          </Button>
          <Link href={`/dashboard/voters/${voterId}/edit`}>
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
                  確定要刪除選民「{voter.name}」嗎？此操作無法復原。
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本資料</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {voter.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">電話</p>
                    <p className="font-medium">{voter.phone}</p>
                  </div>
                </div>
              )}
              {voter.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{voter.email}</p>
                  </div>
                </div>
              )}
              {(voter.lineId || voter.lineUrl) && (
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">LINE</p>
                    {voter.lineUrl ? (
                      <a
                        href={voter.lineUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-green-600 hover:underline flex items-center gap-1"
                      >
                        {voter.lineId || '開啟 LINE'}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="font-medium">{voter.lineId}</p>
                    )}
                  </div>
                </div>
              )}
              {voter.address && (
                <div className="flex items-center gap-3 md:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">地址</p>
                    <p className="font-medium">{voter.address}</p>
                  </div>
                </div>
              )}
              {voter.age && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">年齡</p>
                    <p className="font-medium">{voter.age} 歲</p>
                  </div>
                </div>
              )}
              {voter.occupation && (
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">職業</p>
                    <p className="font-medium">{voter.occupation}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="contacts">
            <TabsList>
              <TabsTrigger value="contacts">
                接觸紀錄 ({voter.contacts?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="relationships">
                關係網絡 ({relationships.length})
              </TabsTrigger>
              <TabsTrigger value="events">
                活動紀錄 ({voter.eventAttendances?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">接觸紀錄</CardTitle>
                  <Link href={`/dashboard/contacts/new?voterId=${voterId}`}>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      新增紀錄
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {voter.contacts?.length > 0 ? (
                    <div className="space-y-4">
                      {voter.contacts.map((contact: any) => (
                        <div
                          key={contact.id}
                          className="flex items-start gap-4 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {getContactTypeLabel(contact.type)}
                              </Badge>
                              <Badge
                                variant={
                                  contact.outcome === 'POSITIVE'
                                    ? 'success'
                                    : contact.outcome === 'NEGATIVE'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {getContactOutcomeLabel(contact.outcome)}
                              </Badge>
                            </div>
                            {contact.notes && (
                              <p className="text-sm mt-2">{contact.notes}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {contact.user?.name} · {formatRelativeTime(contact.contactDate)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      尚無接觸紀錄
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="relationships" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">關係網絡</CardTitle>
                  <Dialog open={addRelationDialogOpen} onOpenChange={(open) => {
                    setAddRelationDialogOpen(open);
                    if (!open) resetRelationForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        新增關係
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>新增關係</DialogTitle>
                        <DialogDescription>
                          建立 {voter.name} 與其他選民的關係
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {/* 選擇選民 */}
                        <div className="space-y-2">
                          <Label>選擇選民</Label>
                          {selectedRelationVoter ? (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="font-medium">
                                    {selectedRelationVoter.name?.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{selectedRelationVoter.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {selectedRelationVoter.address || '無地址'}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRelationVoter(null)}
                              >
                                更換
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="搜尋選民姓名..."
                                  className="pl-10"
                                  value={relationSearch}
                                  onChange={(e) => setRelationSearch(e.target.value)}
                                />
                              </div>
                              {isSearching && (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                              )}
                              {relationSearchResults?.data?.length > 0 && (
                                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                                  {relationSearchResults.data
                                    .filter((v: any) => v.id !== voterId) // 排除自己
                                    .map((v: any) => (
                                      <button
                                        key={v.id}
                                        type="button"
                                        className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left"
                                        onClick={() => {
                                          setSelectedRelationVoter(v);
                                          setRelationSearch('');
                                        }}
                                      >
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                          <span className="text-sm">{v.name?.charAt(0)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium truncate">{v.name}</p>
                                          <p className="text-sm text-muted-foreground truncate">
                                            {v.address || '無地址'}
                                          </p>
                                        </div>
                                        <Badge className={`text-xs shrink-0 ${getStanceColor(v.stance)}`}>
                                          {getStanceLabel(v.stance)}
                                        </Badge>
                                      </button>
                                    ))}
                                </div>
                              )}
                              {relationSearch.length >= 2 && !isSearching && relationSearchResults?.data?.filter((v: any) => v.id !== voterId).length === 0 && (
                                <p className="text-center text-sm text-muted-foreground py-4">
                                  找不到符合的選民
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 關係類型 */}
                        <div className="space-y-2">
                          <Label>關係類型</Label>
                          <Select value={relationType} onValueChange={setRelationType}>
                            <SelectTrigger>
                              <SelectValue placeholder="選擇關係類型" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(RELATION_TYPE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 影響力權重 */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>影響力權重</Label>
                            <span className="text-sm text-muted-foreground">{influenceWeight}%</span>
                          </div>
                          <Slider
                            value={[influenceWeight]}
                            onValueChange={(value) => setInfluenceWeight(value[0])}
                            min={0}
                            max={100}
                            step={5}
                          />
                          <p className="text-xs text-muted-foreground">
                            代表此關係對選民決策的影響程度
                          </p>
                        </div>

                        {/* 備註 */}
                        <div className="space-y-2">
                          <Label>備註（選填）</Label>
                          <Textarea
                            placeholder="輸入關係備註..."
                            value={relationNotes}
                            onChange={(e) => setRelationNotes(e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAddRelationDialogOpen(false);
                            resetRelationForm();
                          }}
                        >
                          取消
                        </Button>
                        <Button
                          onClick={handleAddRelationship}
                          disabled={!selectedRelationVoter || !relationType || createRelationshipMutation.isPending}
                        >
                          {createRelationshipMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              新增中...
                            </>
                          ) : (
                            '新增'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {relationships.length > 0 ? (
                    <div className="space-y-3">
                      {relationships.map((rel: any) => (
                        <div
                          key={rel.id}
                          className="p-4 rounded-lg bg-muted/50 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {rel.relatedVoter?.name?.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <Link
                                  href={`/dashboard/voters/${rel.relatedVoter?.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {rel.relatedVoter?.name}
                                </Link>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="outline" className="text-xs">
                                    {getRelationTypeLabel(rel.relationType)}
                                  </Badge>
                                  <Badge
                                    className={`text-xs ${getStanceColor(rel.relatedVoter?.stance)}`}
                                  >
                                    {getStanceLabel(rel.relatedVoter?.stance)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRelationship(rel);
                                setRecordMeetingDialogOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              記錄見面
                            </Button>
                          </div>
                          
                          {/* 見面資訊 */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pl-13">
                            <div className="flex items-center gap-1">
                              <ArrowRightLeft className="h-3 w-3" />
                              <span>見面 {rel.meetingCount || 1} 次</span>
                            </div>
                            {rel.firstMetEvent && (
                              <div className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                <span>
                                  首次見於{' '}
                                  <Link
                                    href={`/dashboard/events/${rel.firstMetEvent.id}`}
                                    className="text-primary hover:underline"
                                  >
                                    {rel.firstMetEvent.name}
                                  </Link>
                                </span>
                              </div>
                            )}
                            {rel.lastMetAt && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>最近見面: {formatRelativeTime(rel.lastMetAt)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              <span>影響力: {rel.influenceWeight}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      尚無關係資料
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* 記錄見面 Dialog */}
              <Dialog open={recordMeetingDialogOpen} onOpenChange={(open) => {
                setRecordMeetingDialogOpen(open);
                if (!open) {
                  setSelectedRelationship(null);
                  setMeetingNotes('');
                }
              }}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>記錄見面</DialogTitle>
                    <DialogDescription>
                      記錄與 {selectedRelationship?.relatedVoter?.name} 的見面
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {selectedRelationship && (
                      <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-muted">
                        <div className="text-center">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
                            <span className="font-medium text-primary">
                              {voter.name?.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm font-medium">{voter.name}</span>
                        </div>
                        <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                        <div className="text-center">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
                            <span className="font-medium text-primary">
                              {selectedRelationship.relatedVoter?.name?.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm font-medium">{selectedRelationship.relatedVoter?.name}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label>備註（選填）</Label>
                      <Textarea
                        placeholder="見面情況、談話內容等..."
                        value={meetingNotes}
                        onChange={(e) => setMeetingNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRecordMeetingDialogOpen(false);
                        setSelectedRelationship(null);
                        setMeetingNotes('');
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleRecordMeeting}
                      disabled={recordMeetingMutation.isPending}
                    >
                      {recordMeetingMutation.isPending ? (
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
            </TabsContent>

            <TabsContent value="events" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">活動紀錄</CardTitle>
                </CardHeader>
                <CardContent>
                  {voter.eventAttendances?.length > 0 ? (
                    <div className="space-y-3">
                      {voter.eventAttendances.map((attendance: any) => (
                        <div
                          key={attendance.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium">{attendance.event?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(attendance.event?.startTime, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                          <Badge>{ATTENDANCE_STATUS_LABELS[attendance.status] || attendance.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      尚無活動紀錄
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>統計資料</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">影響力分數</span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xl">{voter.influenceScore}</span>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">接觸次數</span>
                <span className="font-medium">{voter.contactCount} 次</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">最後接觸</span>
                <span className="font-medium">
                  {voter.lastContactAt
                    ? formatRelativeTime(voter.lastContactAt)
                    : '尚未接觸'}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">建立時間</span>
                <span className="text-sm">
                  {formatDate(voter.createdAt, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {voter.tags?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>標籤</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {voter.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {voter.notes && (
            <Card>
              <CardHeader>
                <CardTitle>備註</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{voter.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          <VoterAttachments voterId={voterId} />

          {/* Location */}
          {voter.latitude && voter.longitude && (
            <Card>
              <CardHeader>
                <CardTitle>位置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <a
                    href={`https://www.google.com/maps?q=${voter.latitude},${voter.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    在 Google Maps 中查看
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 加入行程對話框 */}
      <AddToScheduleDialog
        voters={voter ? [{
          id: voter.id,
          name: voter.name,
          address: voter.address,
          latitude: voter.latitude,
          longitude: voter.longitude,
        }] : []}
        open={addToScheduleOpen}
        onOpenChange={setAddToScheduleOpen}
      />

      {/* LINE 通話記錄對話框 */}
      {lineContactDialogOpen && voter && currentCampaign && (
        <LineContactDialog
          open={lineContactDialogOpen}
          onOpenChange={setLineContactDialogOpen}
          voter={{
            id: voter.id,
            name: voter.name,
            lineId: voter.lineId,
            lineUrl: voter.lineUrl,
          }}
          campaignId={currentCampaign.id}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['voter', voterId] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
          }}
        />
      )}
    </div>
  );
}
