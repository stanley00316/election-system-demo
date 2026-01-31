'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCampaignStore } from '@/stores/campaign';
import { eventsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Plus, Calendar, MapPin, Users, Clock } from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';

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

export default function EventsPage() {
  const { currentCampaign } = useCampaignStore();
  const campaignId = currentCampaign?.id;
  const { canCreateEvent } = usePermissions();

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', campaignId],
    queryFn: () => eventsApi.getAll(campaignId!),
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

  // 分類活動
  const upcomingEvents = events?.filter(
    (e: any) => new Date(e.startTime) > new Date() && e.status !== 'CANCELLED'
  ) || [];
  const pastEvents = events?.filter(
    (e: any) => new Date(e.startTime) <= new Date() || e.status === 'COMPLETED'
  ) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">活動管理</h1>
          <p className="text-muted-foreground">
            管理客廳會、公祭、競選活動等
          </p>
        </div>
        {canCreateEvent && (
          <Link href="/dashboard/events/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新增活動
            </Button>
          </Link>
        )}
      </div>

      {/* Upcoming Events */}
      <div>
        <h2 className="text-lg font-semibold mb-4">即將舉行</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : upcomingEvents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              沒有即將舉行的活動
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event: any) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Past Events */}
      <div>
        <h2 className="text-lg font-semibold mb-4">已結束</h2>
        {pastEvents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              沒有已結束的活動
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pastEvents.slice(0, 6).map((event: any) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  return (
    <Link href={`/dashboard/events/${event.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="outline" className="mb-2">
                {EVENT_TYPE_LABELS[event.type] || event.type}
              </Badge>
              <CardTitle className="text-lg">{event.name}</CardTitle>
            </div>
            <Badge className={STATUS_STYLES[event.status]}>
              {STATUS_LABELS[event.status] || event.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(event.startTime, {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {formatDate(event.startTime, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {event.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{event.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>
                {event._count?.attendees || 0} / {event.expectedAttendees || '-'} 人
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
