'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCampaignStore } from '@/stores/campaign';
import { analysisApi, contactsApi } from '@/lib/api';
import { formatNumber, formatPercent, getStanceLabel, getStanceColor, getContactTypeLabel, getContactOutcomeLabel } from '@/lib/utils';
import {
  Users,
  MessageSquare,
  TrendingUp,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import Link from 'next/link';
import { chartTooltipStyle, chartAxisStyle, STANCE_COLORS } from '@/lib/chart-styles';

export default function DashboardPage() {
  const { currentCampaign } = useCampaignStore();
  const campaignId = currentCampaign?.id;

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analysis', 'overview', campaignId],
    queryFn: () => analysisApi.getOverview(campaignId!),
    enabled: !!campaignId,
  });

  const { data: winProbability } = useQuery({
    queryKey: ['analysis', 'win-probability', campaignId],
    queryFn: () => analysisApi.getWinProbability(campaignId!),
    enabled: !!campaignId,
  });

  const { data: contactSummary } = useQuery({
    queryKey: ['contacts', 'summary', campaignId],
    queryFn: () => contactsApi.getSummary(campaignId!),
    enabled: !!campaignId,
  });

  const { data: visitStats } = useQuery({
    queryKey: ['analysis', 'visit-stats', campaignId],
    queryFn: () => analysisApi.getVisitStats(campaignId!),
    enabled: !!campaignId,
  });

  if (!currentCampaign) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-xl font-semibold mb-2">尚未選擇選舉活動</h2>
            <p className="text-muted-foreground mb-4">
              請先建立或選擇一個選舉活動
            </p>
            <Link href="/dashboard/settings/campaigns">
              <Button>管理選舉活動</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stanceData = overview?.stanceDistribution
    ? Object.entries(overview.stanceDistribution).map(([key, value]) => ({
        name: getStanceLabel(key),
        value: value as number,
        color: STANCE_COLORS[key as keyof typeof STANCE_COLORS],
      }))
    : [];

  const supportCount = (overview?.stanceDistribution?.STRONG_SUPPORT || 0) +
    (overview?.stanceDistribution?.SUPPORT || 0) +
    (overview?.stanceDistribution?.LEAN_SUPPORT || 0);

  const opposeCount = (overview?.stanceDistribution?.LEAN_OPPOSE || 0) +
    (overview?.stanceDistribution?.OPPOSE || 0) +
    (overview?.stanceDistribution?.STRONG_OPPOSE || 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{currentCampaign.name}</h1>
          <p className="text-muted-foreground">
            {currentCampaign.city}
            {currentCampaign.district && ` ${currentCampaign.district}`}
            {currentCampaign.village && ` ${currentCampaign.village}`}
          </p>
        </div>
        <Badge variant={winProbability?.scenario === 'STRONG_WIN' ? 'success' : 'secondary'}>
          勝選機率: {winProbability ? formatPercent(winProbability.probability) : '-'}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="選民總數"
          value={formatNumber(overview?.voterStats?.totalVoters || 0)}
          icon={Users}
          description={`高影響力: ${overview?.voterStats?.highInfluenceCount || 0} 位`}
        />
        <StatsCard
          title="接觸次數"
          value={formatNumber(contactSummary?.totalContacts || 0)}
          icon={MessageSquare}
          description={`今日: ${contactSummary?.todayContacts || 0} 次`}
          trend={contactSummary?.weekContacts > 0 ? 'up' : undefined}
        />
        <StatsCard
          title="今日拜訪"
          value={formatNumber(visitStats?.todayCompleted || 0)}
          icon={MapPin}
          description={`計畫: ${visitStats?.todayPlanned || 0} / 本週: ${visitStats?.weekCompleted || 0}`}
          trend={visitStats?.todayCompleted && visitStats.todayCompleted > 0 ? 'up' : undefined}
        />
        <StatsCard
          title="支持率"
          value={formatPercent(
            overview?.voterStats?.totalVoters
              ? supportCount / overview.voterStats.totalVoters
              : 0
          )}
          icon={TrendingUp}
          description={`支持: ${supportCount} / 反對: ${opposeCount}`}
          trend={supportCount > opposeCount ? 'up' : 'down'}
        />
        <StatsCard
          title="接觸率"
          value={formatPercent(overview?.contactStats?.contactRate || 0)}
          icon={Target}
          description={`已接觸: ${overview?.contactStats?.uniqueVotersContacted || 0} 位`}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>政治傾向分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                    }
                  >
                    {stanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Contact by Type */}
        <Card>
          <CardHeader>
            <CardTitle>接觸類型統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={
                    contactSummary?.byType
                      ? Object.entries(contactSummary.byType).map(([key, value]) => ({
                          name: getContactTypeLabel(key),
                          count: value,
                        }))
                      : []
                  }
                  layout="vertical"
                  margin={{ left: 80 }}
                >
                  <XAxis
                    type="number"
                    tick={chartAxisStyle.tick}
                    stroke={chartAxisStyle.stroke}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={chartAxisStyle.tick}
                    stroke={chartAxisStyle.stroke}
                  />
                  <Tooltip {...chartTooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>最近接觸紀錄</CardTitle>
          <Link href="/dashboard/contacts">
            <Button variant="ghost" size="sm">
              查看全部
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contactSummary?.recentContacts?.slice(0, 5).map((contact: any) => (
              <div
                key={contact.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {contact.voter?.name?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <Link href={`/dashboard/voters/${contact.voter?.id}`} className="font-medium text-primary hover:underline">
                      {contact.voter?.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {getContactTypeLabel(contact.type)} · {contact.user?.name}
                    </p>
                  </div>
                </div>
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
            ))}
            {(!contactSummary?.recentContacts || contactSummary.recentContacts.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                尚無接觸紀錄
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
  trend?: 'up' | 'down';
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="flex flex-col items-end">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            {trend && (
              <div
                className={cn(
                  'flex items-center text-xs mt-2',
                  trend === 'up' ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
