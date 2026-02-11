'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  DollarSign,
  Users,
  Package,
  Filter,
  Percent,
  Search,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { adminPlansApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import SuperAdminGuard from '@/components/guards/SuperAdminGuard';

interface Plan {
  id: string;
  name: string;
  code: string;
  price: number;
  interval: string;
  voterLimit: number | null;
  teamLimit: number | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  city: string | null;
  category: string | null;
  regionLevel: number | null;
  basePrice: number | null;
  description: string | null;
  _count: {
    subscriptions: number;
  };
}

const intervalLabels: Record<string, string> = {
  MONTH: '月',
  YEAR: '年',
  LIFETIME: '終身',
};

const categoryLabels: Record<string, string> = {
  VILLAGE_CHIEF: '里長',
  REPRESENTATIVE: '民代',
  COUNCILOR: '議員',
  MAYOR: '市長',
  LEGISLATOR: '立委',
};

const regionLevelLabels: Record<number, string> = {
  1: '一級戰區',
  2: '二級戰區',
  3: '三級戰區',
  4: '四級戰區',
  5: '五級戰區',
};

const regionLevelColors: Record<number, string> = {
  1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  2: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  4: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  5: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
};

export default function AdminPlansPage() {
  return (
    <SuperAdminGuard>
      <AdminPlansContent />
    </SuperAdminGuard>
  );
}

function AdminPlansContent() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 篩選狀態
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRegionLevel, setFilterRegionLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 對話框狀態
  const [editDialog, setEditDialog] = useState<{ open: boolean; plan: Plan | null }>({
    open: false,
    plan: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; plan: Plan | null }>({
    open: false,
    plan: null,
  });
  const [batchAdjustDialog, setBatchAdjustDialog] = useState(false);
  const [batchAdjustData, setBatchAdjustData] = useState({
    regionLevel: '',
    category: '',
    adjustType: 'percent', // 'percent' or 'fixed'
    adjustValue: 0,
  });
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    price: 0,
    interval: 'MONTH',
    voterLimit: '',
    teamLimit: '',
    description: '',
    isActive: true,
    sortOrder: 0,
    city: '',
    category: '',
    regionLevel: '',
    basePrice: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await adminPlansApi.getPlans();
      setPlans(data);
    } catch (error: any) {
      toast({
        title: '載入失敗',
        description: error.message || '無法載入方案資料',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 取得可用的縣市列表
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    plans.forEach((plan) => {
      if (plan.city) cities.add(plan.city);
    });
    return Array.from(cities).sort();
  }, [plans]);

  // 篩選後的方案
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // 搜尋過濾
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !plan.name.toLowerCase().includes(query) &&
          !plan.code.toLowerCase().includes(query) &&
          !(plan.city && plan.city.toLowerCase().includes(query))
        ) {
          return false;
        }
      }

      // 縣市過濾
      if (filterCity !== 'all' && plan.city !== filterCity) {
        return false;
      }

      // 類別過濾
      if (filterCategory !== 'all' && plan.category !== filterCategory) {
        return false;
      }

      // 戰區等級過濾
      if (filterRegionLevel !== 'all' && plan.regionLevel !== parseInt(filterRegionLevel)) {
        return false;
      }

      return true;
    });
  }, [plans, filterCity, filterCategory, filterRegionLevel, searchQuery]);

  // 統計數據
  const stats = useMemo(() => {
    const cityCount = new Set(plans.filter(p => p.city).map(p => p.city)).size;
    const activeCount = plans.filter(p => p.isActive).length;
    const totalSubscriptions = plans.reduce((sum, p) => sum + (p._count?.subscriptions ?? 0), 0);
    return { cityCount, activeCount, totalSubscriptions };
  }, [plans]);

  const openEditDialog = (plan: Plan | null) => {
    if (plan) {
      setFormData({
        name: plan.name,
        code: plan.code,
        price: plan.price,
        interval: plan.interval,
        voterLimit: plan.voterLimit?.toString() || '',
        teamLimit: plan.teamLimit?.toString() || '',
        description: plan.description || '',
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
        city: plan.city || '',
        category: plan.category || '',
        regionLevel: plan.regionLevel?.toString() || '',
        basePrice: plan.basePrice?.toString() || '',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        price: 0,
        interval: 'MONTH',
        voterLimit: '',
        teamLimit: '',
        description: '',
        isActive: true,
        sortOrder: 0,
        city: '',
        category: '',
        regionLevel: '',
        basePrice: '',
      });
    }
    setEditDialog({ open: true, plan });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = {
        name: formData.name,
        code: formData.code,
        price: formData.price,
        interval: formData.interval,
        voterLimit: formData.voterLimit ? parseInt(formData.voterLimit) : null,
        teamLimit: formData.teamLimit ? parseInt(formData.teamLimit) : null,
        description: formData.description || null,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
        city: formData.city || null,
        category: formData.category || null,
        regionLevel: formData.regionLevel ? parseInt(formData.regionLevel) : null,
        basePrice: formData.basePrice ? parseInt(formData.basePrice) : null,
      };

      if (editDialog.plan) {
        await adminPlansApi.updatePlan(editDialog.plan.id, data);
        toast({ title: '更新成功', description: '方案已更新' });
      } else {
        await adminPlansApi.createPlan(data);
        toast({ title: '建立成功', description: '新方案已建立' });
      }

      setEditDialog({ open: false, plan: null });
      loadPlans();
    } catch (error: any) {
      toast({
        title: '儲存失敗',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deleteDialog.plan) return;

    try {
      await adminPlansApi.deactivatePlan(deleteDialog.plan.id);
      toast({ title: '停用成功', description: '方案已停用' });
      setDeleteDialog({ open: false, plan: null });
      loadPlans();
    } catch (error: any) {
      toast({
        title: '停用失敗',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });
    }
  };

  const handleBatchAdjust = async () => {
    setIsSaving(true);
    try {
      // 找出符合條件的方案
      const targetPlans = plans.filter((plan) => {
        if (batchAdjustData.regionLevel && plan.regionLevel !== parseInt(batchAdjustData.regionLevel)) {
          return false;
        }
        if (batchAdjustData.category && plan.category !== batchAdjustData.category) {
          return false;
        }
        return plan.city && plan.isActive; // 只調整有縣市的分級方案
      });

      if (targetPlans.length === 0) {
        toast({
          title: '無符合條件的方案',
          description: '請調整篩選條件',
          variant: 'destructive',
        });
        return;
      }

      // 批次更新價格
      let updatedCount = 0;
      for (const plan of targetPlans) {
        let newPrice = plan.price;
        if (batchAdjustData.adjustType === 'percent') {
          newPrice = Math.round(plan.price * (1 + batchAdjustData.adjustValue / 100));
        } else {
          newPrice = plan.price + batchAdjustData.adjustValue;
        }

        if (newPrice > 0 && newPrice !== plan.price) {
          await adminPlansApi.updatePlan(plan.id, { price: newPrice, basePrice: newPrice });
          updatedCount++;
        }
      }

      toast({
        title: '批次調整完成',
        description: `已更新 ${updatedCount} 筆方案價格`,
      });

      setBatchAdjustDialog(false);
      setBatchAdjustData({
        regionLevel: '',
        category: '',
        adjustType: 'percent',
        adjustValue: 0,
      });
      loadPlans();
    } catch (error: any) {
      toast({
        title: '批次調整失敗',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">方案管理</h1>
          <p className="text-gray-500">管理訂閱方案與分級定價（僅超級管理者可編輯）</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBatchAdjustDialog(true)}>
            <Percent className="h-4 w-4 mr-2" />
            批次調整價格
          </Button>
          <Button onClick={() => openEditDialog(null)}>
            <Plus className="h-4 w-4 mr-2" />
            新增方案
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">總方案數</p>
                <p className="text-2xl font-bold">{plans.length}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">縣市數</p>
                <p className="text-2xl font-bold">{stats.cityCount}</p>
              </div>
              <MapPin className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">啟用中</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeCount}</p>
              </div>
              <Check className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">總訂閱數</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalSubscriptions}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            篩選條件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>搜尋</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="搜尋方案名稱、代碼..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>縣市</Label>
              <Select value={filterCity} onValueChange={setFilterCity}>
                <SelectTrigger>
                  <SelectValue placeholder="全部縣市" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部縣市</SelectItem>
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>選舉類型</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="全部類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部類型</SelectItem>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>戰區等級</Label>
              <Select value={filterRegionLevel} onValueChange={setFilterRegionLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="全部等級" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部等級</SelectItem>
                  {Object.entries(regionLevelLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>方案列表</CardTitle>
          <CardDescription>
            顯示 {filteredPlans.length} 筆方案（共 {plans.length} 筆）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>方案名稱</TableHead>
                  <TableHead>縣市</TableHead>
                  <TableHead>類型</TableHead>
                  <TableHead>戰區</TableHead>
                  <TableHead>價格</TableHead>
                  <TableHead>限制</TableHead>
                  <TableHead>訂閱數</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        <code className="text-xs text-gray-400">{plan.code}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      {plan.city || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {plan.category ? (
                        <Badge variant="outline">{categoryLabels[plan.category] || plan.category}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {plan.regionLevel ? (
                        <Badge className={regionLevelColors[plan.regionLevel]}>
                          {plan.regionLevel}級
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                        {plan.price.toLocaleString()} / {intervalLabels[plan.interval] || plan.interval}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>選民: {plan.voterLimit ? `${plan.voterLimit}` : '無限'}</div>
                        <div>團隊: {plan.teamLimit ? `${plan.teamLimit}` : '無限'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{plan._count?.subscriptions ?? 0}</TableCell>
                    <TableCell>
                      <Badge className={plan.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}>
                        {plan.isActive ? '啟用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(plan)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {plan.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            onClick={() => setDeleteDialog({ open: true, plan })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, plan: editDialog.plan })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDialog.plan ? '編輯方案' : '新增方案'}</DialogTitle>
            <DialogDescription>
              {editDialog.plan ? '修改方案內容' : '建立新的訂閱方案'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>方案名稱</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>方案代碼</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={!!editDialog.plan}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>縣市</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="例如：台北市"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>價格 (NT$)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>計費週期</Label>
                <Select
                  value={formData.interval}
                  onValueChange={(v) => setFormData({ ...formData, interval: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTH">月</SelectItem>
                    <SelectItem value="YEAR">年</SelectItem>
                    <SelectItem value="LIFETIME">終身</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>選民上限（空白為無限）</Label>
                <Input
                  type="number"
                  value={formData.voterLimit}
                  onChange={(e) => setFormData({ ...formData, voterLimit: e.target.value })}
                  placeholder="無限制"
                />
              </div>
              <div className="space-y-2">
                <Label>團隊上限（空白為無限）</Label>
                <Input
                  type="number"
                  value={formData.teamLimit}
                  onChange={(e) => setFormData({ ...formData, teamLimit: e.target.value })}
                  placeholder="無限制"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>方案類別</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇類別" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">無</SelectItem>
                    <SelectItem value="VILLAGE_CHIEF">里長</SelectItem>
                    <SelectItem value="REPRESENTATIVE">民代</SelectItem>
                    <SelectItem value="COUNCILOR">議員</SelectItem>
                    <SelectItem value="MAYOR">市長</SelectItem>
                    <SelectItem value="LEGISLATOR">立委</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>戰區等級 (1-5)</Label>
                <Select
                  value={formData.regionLevel}
                  onValueChange={(v) => setFormData({ ...formData, regionLevel: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇等級" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">無</SelectItem>
                    <SelectItem value="1">一級戰區（六都）</SelectItem>
                    <SelectItem value="2">二級戰區</SelectItem>
                    <SelectItem value="3">三級戰區（基準）</SelectItem>
                    <SelectItem value="4">四級戰區</SelectItem>
                    <SelectItem value="5">五級戰區（離島）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, plan: null })}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Adjust Dialog */}
      <Dialog open={batchAdjustDialog} onOpenChange={setBatchAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批次調整價格</DialogTitle>
            <DialogDescription>
              根據條件批次調整符合的方案價格
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>戰區等級（可選）</Label>
                <Select
                  value={batchAdjustData.regionLevel}
                  onValueChange={(v) => setBatchAdjustData({ ...batchAdjustData, regionLevel: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部等級" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部等級</SelectItem>
                    <SelectItem value="1">一級戰區</SelectItem>
                    <SelectItem value="2">二級戰區</SelectItem>
                    <SelectItem value="3">三級戰區</SelectItem>
                    <SelectItem value="4">四級戰區</SelectItem>
                    <SelectItem value="5">五級戰區</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>選舉類型（可選）</Label>
                <Select
                  value={batchAdjustData.category}
                  onValueChange={(v) => setBatchAdjustData({ ...batchAdjustData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部類型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部類型</SelectItem>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>調整方式</Label>
                <Select
                  value={batchAdjustData.adjustType}
                  onValueChange={(v) => setBatchAdjustData({ ...batchAdjustData, adjustType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">百分比調整</SelectItem>
                    <SelectItem value="fixed">固定金額調整</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  調整值 {batchAdjustData.adjustType === 'percent' ? '(%)' : '(NT$)'}
                </Label>
                <Input
                  type="number"
                  value={batchAdjustData.adjustValue}
                  onChange={(e) => setBatchAdjustData({ ...batchAdjustData, adjustValue: parseFloat(e.target.value) || 0 })}
                  placeholder={batchAdjustData.adjustType === 'percent' ? '例如：10 表示漲價 10%' : '例如：1000 表示漲價 1000 元'}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              提示：輸入負數可以降價。例如：-10% 表示降價 10%。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchAdjustDialog(false)}>
              取消
            </Button>
            <Button onClick={handleBatchAdjust} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              執行調整
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, plan: deleteDialog.plan })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要停用此方案嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              停用後，現有訂閱者仍可使用此方案直到到期，但新用戶將無法選擇此方案。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-red-600 hover:bg-red-700">
              停用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
