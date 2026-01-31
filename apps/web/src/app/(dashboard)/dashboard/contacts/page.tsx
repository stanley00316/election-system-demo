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
import { usePermissions } from '@/hooks/use-permissions';

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
  const { currentCampaign } = useCampaignStore();
  const campaignId = currentCampaign?.id;
  const { canCreateContact } = usePermissions();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', campaignId, page, search],
    queryFn: () =>
      contactsApi.getAll({
        campaignId,
        page,
        limit: 20,
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
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              篩選
            </Button>
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
                    className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/dashboard/voters/${contact.voter?.id}`}
                          className="font-medium hover:underline"
                        >
                          {contact.voter?.name}
                        </Link>
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
