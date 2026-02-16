'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCampaignStore } from '@/stores/campaign';
import { contactsApi } from '@/lib/api';
import { formatDate, formatRelativeTime, getContactTypeLabel, getContactOutcomeLabel } from '@/lib/utils';
import {
  Search,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Phone,
  Home,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TIME_RANGE_OPTIONS = [
  { value: 'today', label: '本日' },
  { value: 'week', label: '本週' },
  { value: 'month', label: '本月' },
];

const CONTACT_TYPE_OPTIONS = [
  { value: 'HOME_VISIT', label: '家訪' },
  { value: 'PHONE_CALL', label: '電訪' },
  { value: 'LIVING_ROOM', label: '客廳會' },
  { value: 'EVENT', label: '活動' },
  { value: 'OTHER', label: '其他' },
];

const OUTCOME_OPTIONS = [
  { value: 'POSITIVE', label: '正面' },
  { value: 'NEUTRAL', label: '中立' },
  { value: 'NEGATIVE', label: '負面' },
  { value: 'NO_RESPONSE', label: '無回應' },
  { value: 'NOT_HOME', label: '不在家' },
];

const CONTACT_TYPE_ICONS: Record<string, React.ElementType> = {
  HOME_VISIT: Home,
  PHONE_CALL: Phone,
  LIVING_ROOM: Users,
  default: MessageSquare,
};

const OUTCOME_STYLES: Record<string, string> = {
  POSITIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  NEUTRAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  NEGATIVE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  NO_RESPONSE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  NOT_HOME: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export default function ContactsPage() {
  const router = useRouter();
  const { currentCampaign } = useCampaignStore();
  const campaignId = currentCampaign?.id;
  const { canCreateContact } = usePermissions();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [filterOpen, setFilterOpen] = useState(false);

  // 計算已啟用的篩選數量
  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

  const handleFilterChange = (key: string, value: string | undefined) => {
    const newFilters = { ...filters };
    if (value === '' || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setFilters(newFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', campaignId, page, search, filters],
    queryFn: () =>
      contactsApi.getAll({
        campaignId,
        page,
        limit: 20,
        ...filters,
      }),
    enabled: !!campaignId,
  });

  const { data: summary } = useQuery({
    queryKey: ['contacts', 'summary', campaignId],
    queryFn: () => contactsApi.getSummary(campaignId!),
    enabled: !!campaignId,
  });

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
          <h1 className="text-2xl font-bold">接觸紀錄</h1>
          <p className="text-muted-foreground">
            共 {data?.pagination?.total || 0} 筆紀錄
          </p>
        </div>
        {canCreateContact && (
          <Link href="/dashboard/contacts/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新增紀錄
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">今日接觸</p>
            <p className="text-2xl font-bold">{summary?.todayContacts || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">本週接觸</p>
            <p className="text-2xl font-bold">{summary?.weekContacts || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">正面回應</p>
            <p className="text-2xl font-bold text-green-600">
              {summary?.byOutcome?.POSITIVE || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">總接觸數</p>
            <p className="text-2xl font-bold">{summary?.totalContacts || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋..."
                className="pl-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  篩選
                  {activeFilterCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">篩選條件</h4>
                    {activeFilterCount > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearFilters}
                        className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        清除全部
                      </Button>
                    )}
                  </div>
                  
                  {/* 時間範圍篩選 */}
                  <div className="space-y-2">
                    <Label>時間範圍</Label>
                    <Select
                      value={filters.timeRange || '__all__'}
                      onValueChange={(value) => handleFilterChange('timeRange', value === '__all__' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="全部" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">全部</SelectItem>
                        {TIME_RANGE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 接觸類型篩選 */}
                  <div className="space-y-2">
                    <Label>接觸類型</Label>
                    <Select
                      value={filters.type || '__all__'}
                      onValueChange={(value) => handleFilterChange('type', value === '__all__' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="全部" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">全部</SelectItem>
                        {CONTACT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 接觸結果篩選 */}
                  <div className="space-y-2">
                    <Label>接觸結果</Label>
                    <Select
                      value={filters.outcome || '__all__'}
                      onValueChange={(value) => handleFilterChange('outcome', value === '__all__' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="全部" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">全部</SelectItem>
                        {OUTCOME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => setFilterOpen(false)}
                  >
                    套用篩選
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              沒有找到接觸紀錄
            </div>
          ) : (
            <div className="divide-y">
              {data?.data?.map((contact: any) => {
                const Icon = CONTACT_TYPE_ICONS[contact.type] || CONTACT_TYPE_ICONS.default;
                return (
                  <div
                    key={contact.id}
                    className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-primary">
                          {contact.voter?.name}
                        </span>
                        <Badge className={OUTCOME_STYLES[contact.outcome]}>
                          {getContactOutcomeLabel(contact.outcome)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getContactTypeLabel(contact.type)} · {contact.user?.name}
                      </p>
                      {contact.notes && (
                        <p className="text-sm mt-2 line-clamp-2">{contact.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-muted-foreground">
                        {formatRelativeTime(contact.contactDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(contact.contactDate, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                第 {page} 頁，共 {data.pagination.totalPages} 頁
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage(Math.min(data.pagination.totalPages, page + 1))
                  }
                  disabled={page >= data.pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
