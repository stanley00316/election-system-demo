'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { useCampaignStore } from '@/stores/campaign';
import { schedulesApi, analysisApi } from '@/lib/api';
import { formatDate, formatPercent } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { scheduleToCSV, downloadCSV, scheduleToICS, downloadICS } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  User,
  Calendar,
  Navigation,
  Locate,
  CheckCircle2,
  Users,
  Download,
  Loader2,
  FileSpreadsheet,
  CalendarDays,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// 動態載入 LiveSchedule 元件（避免 SSR 問題）
const LiveSchedule = dynamic(
  () => import('@/components/schedules/LiveSchedule'),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )}
);

export default function SchedulesPage() {
  const router = useRouter();
  const { currentCampaign } = useCampaignStore();
  const { toast } = useToast();
  const campaignId = currentCampaign?.id;

  const [activeTab, setActiveTab] = useState('planned');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  
  // 匯出相關狀態
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportMonth, setExportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [exportFormat, setExportFormat] = useState<'csv' | 'ics'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  // 處理匯出
  const handleExport = async () => {
    if (!campaignId) return;
    
    setIsExporting(true);
    try {
      // 解析月份
      const [year, month] = exportMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // 最後一天
      
      const schedules = await schedulesApi.exportByDateRange(
        campaignId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      if (schedules.length === 0) {
        toast({
          title: '無資料',
          description: '選定月份沒有行程資料',
          variant: 'destructive',
        });
        return;
      }
      
      const monthName = `${year}年${month}月`;
      
      if (exportFormat === 'csv') {
        const csv = scheduleToCSV(schedules);
        downloadCSV(csv, `行程匯出_${monthName}.csv`);
      } else {
        const ics = scheduleToICS(schedules);
        downloadICS(ics, `行程匯出_${monthName}.ics`);
      }
      
      toast({
        title: '匯出成功',
        description: `已下載 ${monthName} 的行程資料`,
      });
      setExportDialogOpen(false);
    } catch (error: any) {
      toast({
        title: '匯出失敗',
        description: error.message || '發生錯誤',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 生成月份選項（過去12個月到未來3個月）
  const monthOptions = (() => {
    const options = [];
    const now = new Date();
    for (let i = -12; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      options.push({ value, label });
    }
    return options;
  })();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules', campaignId, selectedDate],
    queryFn: () => schedulesApi.getByDate(campaignId!, selectedDate),
    enabled: !!campaignId,
  });

  const { data: visitStats } = useQuery({
    queryKey: ['analysis', 'visit-stats', campaignId],
    queryFn: () => analysisApi.getVisitStats(campaignId!),
    enabled: !!campaignId,
  });

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  if (!currentCampaign) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">請先選擇選舉活動</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">行程規劃</h1>
          <p className="text-muted-foreground">規劃與即時調整拜訪行程</p>
        </div>
        <div className="flex gap-2">
          {/* 匯出按鈕 */}
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                匯出行程
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>匯出行程資料</DialogTitle>
                <DialogDescription>
                  選擇月份和格式，下載整月的行程資料
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>選擇月份</Label>
                  <Select value={exportMonth} onValueChange={setExportMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>匯出格式</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                        exportFormat === 'csv'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setExportFormat('csv')}
                    >
                      <FileSpreadsheet className="h-8 w-8 text-green-600" />
                      <div className="text-center">
                        <p className="font-medium">Excel / CSV</p>
                        <p className="text-xs text-muted-foreground">適合報表分析</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                        exportFormat === 'ics'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setExportFormat('ics')}
                    >
                      <CalendarDays className="h-8 w-8 text-blue-600" />
                      <div className="text-center">
                        <p className="font-medium">行事曆 (ICS)</p>
                        <p className="text-xs text-muted-foreground">匯入 Google Calendar</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setExportDialogOpen(false)}
                  disabled={isExporting}
                >
                  取消
                </Button>
                <Button onClick={handleExport} disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      匯出中...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      下載
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {activeTab === 'planned' && (
            <Link href="/dashboard/schedules/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新增行程
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 拜訪統計摘要 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">今日完成</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{visitStats?.todayCompleted || 0}</span>
                  <span className="text-sm text-muted-foreground">/ {visitStats?.todayPlanned || 0} 計畫</span>
                </div>
              </div>
            </div>
            <Progress 
              value={(visitStats?.todayCompletionRate || 0) * 100} 
              className="mt-3 h-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              完成率 {formatPercent(visitStats?.todayCompletionRate || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">本週完成</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{visitStats?.weekCompleted || 0}</span>
                  <span className="text-sm text-muted-foreground">/ {visitStats?.weekPlanned || 0} 計畫</span>
                </div>
              </div>
            </div>
            <Progress 
              value={(visitStats?.weekCompletionRate || 0) * 100} 
              className="mt-3 h-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              完成率 {formatPercent(visitStats?.weekCompletionRate || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">已接觸選民</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{visitStats?.uniqueContacted || 0}</span>
                  <span className="text-sm text-muted-foreground">/ {visitStats?.totalVoters || 0} 總計</span>
                </div>
              </div>
            </div>
            <Progress 
              value={(visitStats?.contactedRate || 0) * 100} 
              className="mt-3 h-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              接觸率 {formatPercent(visitStats?.contactedRate || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="planned" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            計畫行程
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Locate className="h-4 w-4" />
            即時行程
          </TabsTrigger>
        </TabsList>

        {/* 計畫行程 Tab */}
        <TabsContent value="planned" className="mt-6 space-y-4">
          {/* Date Selector */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {formatDate(selectedDate, {
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedDate, { weekday: 'long' })}
                  </p>
                </div>
                <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Schedules */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : schedules?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">當天沒有行程</p>
                <Link href="/dashboard/schedules/new">
                  <Button>建立行程</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {schedules?.map((schedule: any) => (
                <Card key={schedule.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CardTitle className="text-lg truncate">{schedule.title}</CardTitle>
                        <Badge
                          variant={
                            schedule.status === 'COMPLETED'
                              ? 'success'
                              : schedule.status === 'IN_PROGRESS'
                              ? 'warning'
                              : 'secondary'
                          }
                          className="shrink-0"
                        >
                          {schedule.status === 'DRAFT' ? '草稿' :
                           schedule.status === 'PLANNED' ? '已規劃' :
                           schedule.status === 'IN_PROGRESS' ? '進行中' :
                           schedule.status === 'COMPLETED' ? '已完成' :
                           schedule.status === 'CANCELLED' ? '已取消' : schedule.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link href={`/dashboard/schedules/${schedule.id}`}>
                          <Button variant="outline" size="sm">查看詳情</Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/schedules/${schedule.id}?openRouteMap=true`)}
                          disabled={!schedule.items?.length}
                        >
                          <Navigation className="h-4 w-4 mr-1" />
                          優化路線
                        </Button>
                      </div>
                    </div>
                    {schedule.description && (
                      <p className="text-sm text-muted-foreground">
                        {schedule.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {schedule.items?.map((item: any, index: number) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-4 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            {index < schedule.items.length - 1 && (
                              <div className="w-0.5 h-8 bg-border mt-2" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">
                                {item.voter ? (
                                  <Link href={`/dashboard/voters/${item.voter.id}`} className="text-primary hover:underline">
                                    {item.voter.name}
                                  </Link>
                                ) : (item.event?.name || item.address || '未命名')}
                              </p>
                              <Badge
                                variant={
                                  item.status === 'COMPLETED'
                                    ? 'success'
                                    : item.status === 'IN_PROGRESS'
                                    ? 'warning'
                                    : item.status === 'SKIPPED'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {item.status === 'PENDING' ? '待執行' :
                                 item.status === 'IN_PROGRESS' ? '進行中' :
                                 item.status === 'COMPLETED' ? '已完成' :
                                 item.status === 'SKIPPED' ? '已跳過' : item.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                              {item.plannedTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(item.plannedTime, {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                              {item.address && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {item.address}
                                </span>
                              )}
                              {item.voter && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <Link href={`/dashboard/voters/${item.voter.id}`} className="text-primary hover:underline">
                                    {item.voter.name}
                                  </Link>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {schedule.items?.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        尚未加入行程項目
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 即時行程 Tab */}
        <TabsContent value="live" className="mt-6">
          <LiveSchedule campaignId={campaignId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
