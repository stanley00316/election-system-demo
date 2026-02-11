'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  Database,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { adminDataRetentionApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Campaign {
  id: string;
  name: string;
  isActive: boolean;
  gracePeriodEndsAt: string | null;
  markedForDeletion: boolean;
  deletedAt: string | null;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  _count: {
    voters: number;
    contacts: number;
    events: number;
  };
}

interface Stats {
  pendingDeletion: number;
  deleted: number;
  inGracePeriod: number;
  totalCampaigns: number;
  active: number;
}

export default function AdminDataRetentionPage() {
  return (
    <SuperAdminGuard>
      <AdminDataRetentionContent />
    </SuperAdminGuard>
  );
}

function AdminDataRetentionContent() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingCampaigns, setPendingCampaigns] = useState<Campaign[]>([]);
  const [deletedCampaigns, setDeletedCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Dialogs
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    campaign: Campaign | null;
    isBatch: boolean;
    isHard: boolean;
  }>({
    open: false,
    campaign: null,
    isBatch: false,
    isHard: false,
  });
  const [restoreDialog, setRestoreDialog] = useState<{
    open: boolean;
    campaign: Campaign | null;
  }>({
    open: false,
    campaign: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, pending, deleted] = await Promise.all([
        adminDataRetentionApi.getStats(),
        adminDataRetentionApi.getPendingCampaigns(),
        adminDataRetentionApi.getDeletedCampaigns(),
      ]);
      setStats(statsData);
      setPendingCampaigns(pending);
      setDeletedCampaigns(deleted);
    } catch (error: any) {
      toast({
        title: '載入失敗',
        description: error.message || '無法載入資料',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreDialog.campaign) return;
    setIsProcessing(true);

    try {
      await adminDataRetentionApi.restoreCampaign(restoreDialog.campaign.id);
      toast({
        title: '恢復成功',
        description: `競選活動「${restoreDialog.campaign.name}」已恢復`,
      });
      setRestoreDialog({ open: false, campaign: null });
      loadData();
    } catch (error: any) {
      toast({
        title: '恢復失敗',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);

    try {
      if (deleteDialog.isBatch) {
        // 批量刪除
        await adminDataRetentionApi.batchDelete(selectedCampaigns);
        toast({
          title: '批量刪除成功',
          description: `已刪除 ${selectedCampaigns.length} 個競選活動`,
        });
        setSelectedCampaigns([]);
      } else if (deleteDialog.isHard) {
        // 硬刪除
        await adminDataRetentionApi.hardDelete(deleteDialog.campaign!.id);
        toast({
          title: '永久刪除成功',
          description: `競選活動「${deleteDialog.campaign!.name}」已永久刪除`,
        });
      } else {
        // 單個軟刪除
        await adminDataRetentionApi.deleteCampaign(deleteDialog.campaign!.id);
        toast({
          title: '刪除成功',
          description: `競選活動「${deleteDialog.campaign!.name}」已刪除`,
        });
      }

      setDeleteDialog({ open: false, campaign: null, isBatch: false, isHard: false });
      loadData();
    } catch (error: any) {
      toast({
        title: '刪除失敗',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelectAll = (campaigns: Campaign[]) => {
    if (selectedCampaigns.length === campaigns.length) {
      setSelectedCampaigns([]);
    } else {
      setSelectedCampaigns(campaigns.map((c) => c.id));
    }
  };

  const toggleSelect = (campaignId: string) => {
    setSelectedCampaigns((prev) =>
      prev.includes(campaignId)
        ? prev.filter((id) => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">資料保留管理</h1>
        <p className="text-gray-500">
          管理未付款的競選活動資料庫，由超級管理者決定是否刪除或恢復
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">總競選活動</p>
                <p className="text-2xl font-bold">{stats?.totalCampaigns || 0}</p>
              </div>
              <Database className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">正常使用中</p>
                <p className="text-2xl font-bold text-green-600">{stats?.active || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">緩衝期中</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.inGracePeriod || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">待刪除</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.pendingDeletion || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已刪除</p>
                <p className="text-2xl font-bold text-red-600">{stats?.deleted || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            待刪除 ({pendingCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="deleted">
            已刪除 ({deletedCampaigns.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Deletion Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>待刪除的競選活動</CardTitle>
                <CardDescription>
                  這些競選活動的緩衝期已結束，等待您的最終決定
                </CardDescription>
              </div>
              {selectedCampaigns.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialog({
                    open: true,
                    campaign: null,
                    isBatch: true,
                    isHard: false,
                  })}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  批量刪除 ({selectedCampaigns.length})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {pendingCampaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>目前沒有待刪除的競選活動</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedCampaigns.length === pendingCampaigns.length}
                          onCheckedChange={() => toggleSelectAll(pendingCampaigns)}
                        />
                      </TableHead>
                      <TableHead>競選活動</TableHead>
                      <TableHead>擁有者</TableHead>
                      <TableHead>資料量</TableHead>
                      <TableHead>緩衝期結束</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCampaigns.includes(campaign.id)}
                            onCheckedChange={() => toggleSelect(campaign.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-xs text-gray-500">
                              建立於 {format(new Date(campaign.createdAt), 'yyyy/MM/dd', { locale: zhTW })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.owner.name}</p>
                            <p className="text-xs text-gray-500">{campaign.owner.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-3 text-sm">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {campaign._count.voters}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {campaign._count.contacts}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {campaign._count.events}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {campaign.gracePeriodEndsAt && (
                            <Badge variant="outline" className="text-orange-600">
                              {format(new Date(campaign.gracePeriodEndsAt), 'yyyy/MM/dd', { locale: zhTW })}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRestoreDialog({ open: true, campaign })}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              恢復
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteDialog({
                                open: true,
                                campaign,
                                isBatch: false,
                                isHard: false,
                              })}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              刪除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deleted Tab */}
        <TabsContent value="deleted">
          <Card>
            <CardHeader>
              <CardTitle>已刪除的競選活動</CardTitle>
              <CardDescription>
                這些競選活動已被軟刪除，如需永久移除請使用「永久刪除」功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deletedCampaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>目前沒有已刪除的競選活動</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>競選活動</TableHead>
                      <TableHead>擁有者</TableHead>
                      <TableHead>資料量</TableHead>
                      <TableHead>刪除時間</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedCampaigns.map((campaign) => (
                      <TableRow key={campaign.id} className="opacity-60">
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-xs text-gray-500">
                              建立於 {format(new Date(campaign.createdAt), 'yyyy/MM/dd', { locale: zhTW })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.owner.name}</p>
                            <p className="text-xs text-gray-500">{campaign.owner.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-3 text-sm">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {campaign._count.voters}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {campaign._count.contacts}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {campaign._count.events}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {campaign.deletedAt && (
                            <Badge variant="outline" className="text-red-600">
                              {format(new Date(campaign.deletedAt), 'yyyy/MM/dd HH:mm', { locale: zhTW })}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeleteDialog({
                              open: true,
                              campaign,
                              isBatch: false,
                              isHard: true,
                            })}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            永久刪除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Restore Dialog */}
      <AlertDialog
        open={restoreDialog.open}
        onOpenChange={(open) => setRestoreDialog({ open, campaign: restoreDialog.campaign })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要恢復此競選活動嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              競選活動「{restoreDialog.campaign?.name}」將被恢復，緩衝期將被重置。
              擁有者需要重新訂閱才能繼續使用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              恢復
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              {deleteDialog.isHard ? '⚠️ 永久刪除警告' : 
               deleteDialog.isBatch ? '確定要批量刪除嗎？' : '確定要刪除此競選活動嗎？'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.isHard ? (
                <>
                  <p className="text-red-600 font-medium mb-2">
                    此操作無法復原！所有資料將被永久刪除。
                  </p>
                  <p>
                    競選活動「{deleteDialog.campaign?.name}」及其所有選民、接觸紀錄、活動等資料將被永久移除。
                  </p>
                </>
              ) : deleteDialog.isBatch ? (
                <p>
                  將刪除 {selectedCampaigns.length} 個競選活動。刪除後，資料仍會保留但標記為已刪除狀態。
                </p>
              ) : (
                <p>
                  競選活動「{deleteDialog.campaign?.name}」將被標記為已刪除。
                  資料會保留但不再顯示，之後可使用永久刪除功能完全移除。
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {deleteDialog.isHard ? '永久刪除' : '刪除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
