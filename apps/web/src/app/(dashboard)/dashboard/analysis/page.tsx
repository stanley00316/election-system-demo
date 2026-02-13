'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCampaignStore } from '@/stores/campaign';
import { analysisApi } from '@/lib/api';
import { formatNumber, formatPercent, getStanceLabel } from '@/lib/utils';
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
  LineChart,
  Line,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import {
  chartTooltipStyle,
  chartAxisStyle,
  chartGridStyle,
  chartLegendStyle,
  STANCE_COLORS,
} from '@/lib/chart-styles';

export default function AnalysisPage() {
  const { currentCampaign } = useCampaignStore();
  const campaignId = currentCampaign?.id;

  const { data: overview } = useQuery({
    queryKey: ['analysis', 'overview', campaignId],
    queryFn: () => analysisApi.getOverview(campaignId!),
    enabled: !!campaignId,
  });

  const { data: winProbability } = useQuery({
    queryKey: ['analysis', 'win-probability', campaignId],
    queryFn: () => analysisApi.getWinProbability(campaignId!),
    enabled: !!campaignId,
  });

  const { data: districtAnalysis } = useQuery({
    queryKey: ['analysis', 'district', campaignId],
    queryFn: () => analysisApi.getDistrict(campaignId!),
    enabled: !!campaignId,
  });


  const { data: trend } = useQuery({
    queryKey: ['analysis', 'trend', campaignId],
    queryFn: () => analysisApi.getTrend(campaignId!, 30),
    enabled: !!campaignId,
  });

  const { data: influence } = useQuery({
    queryKey: ['analysis', 'influence', campaignId],
    queryFn: () => analysisApi.getInfluence(campaignId!),
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

  const stanceData = overview?.stanceDistribution
    ? Object.entries(overview.stanceDistribution)
        .map(([key, value]) => ({
          name: getStanceLabel(key),
          value: value as number,
          color: STANCE_COLORS[key as keyof typeof STANCE_COLORS],
        }))
        .filter(d => d.value > 0)
    : [];

  const getScenarioInfo = (scenario: string) => {
    const info: Record<string, { label: string; color: string; icon: React.ElementType }> = {
      STRONG_WIN: { label: '穩贏', color: 'bg-green-500', icon: CheckCircle },
      LIKELY_WIN: { label: '可能贏', color: 'bg-green-400', icon: TrendingUp },
      TOSS_UP: { label: '五五波', color: 'bg-yellow-500', icon: Minus },
      LIKELY_LOSE: { label: '可能輸', color: 'bg-red-400', icon: TrendingDown },
      STRONG_LOSE: { label: '穩輸', color: 'bg-red-500', icon: XCircle },
    };
    return info[scenario] || { label: '未知', color: 'bg-gray-500', icon: AlertTriangle };
  };

  const scenarioInfo = getScenarioInfo(winProbability?.scenario || '');
  const ScenarioIcon = scenarioInfo.icon;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">選情分析</h1>
        <p className="text-muted-foreground">
          {currentCampaign.name} 的選情數據分析
        </p>
      </div>

      {/* Win Probability Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">勝選機率評估</p>
              <div className="flex items-center gap-4">
                <span className="text-5xl font-bold">
                  {winProbability ? formatPercent(winProbability.probability) : '-'}
                </span>
                <Badge className={`${scenarioInfo.color} text-white`}>
                  <ScenarioIcon className="h-4 w-4 mr-1" />
                  {scenarioInfo.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                信心度: {winProbability ? formatPercent(winProbability.confidence) : '-'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(
                    (overview?.stanceDistribution?.STRONG_SUPPORT || 0) +
                    (overview?.stanceDistribution?.SUPPORT || 0) +
                    (overview?.stanceDistribution?.LEAN_SUPPORT || 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">支持票</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatNumber(
                    (overview?.stanceDistribution?.NEUTRAL || 0) +
                    (overview?.stanceDistribution?.UNDECIDED || 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">中立票</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {formatNumber(
                    (overview?.stanceDistribution?.LEAN_OPPOSE || 0) +
                    (overview?.stanceDistribution?.OPPOSE || 0) +
                    (overview?.stanceDistribution?.STRONG_OPPOSE || 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">反對票</p>
              </div>
            </div>
          </div>

          {/* Factors */}
          {winProbability?.factors && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm font-medium mb-3">影響因素</p>
              <div className="flex flex-wrap gap-2">
                {winProbability.factors.map((factor: any, idx: number) => (
                  <Badge
                    key={idx}
                    variant={factor.impact > 0 ? 'success' : factor.impact < 0 ? 'destructive' : 'secondary'}
                  >
                    {factor.name}: {factor.impact > 0 ? '+' : ''}{factor.impact}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>政治傾向分布</CardTitle>
            <CardDescription>選民支持度結構分析</CardDescription>
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
                      percent > 0.05 ? `${name}` : ''
                    }
                  >
                    {stanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatNumber(value), '人數']}
                    {...chartTooltipStyle}
                  />
                  <Legend {...chartLegendStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* District Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>區域支持度</CardTitle>
            <CardDescription>
              {districtAnalysis?.filter?.district
                ? `${districtAnalysis.filter.district}各里支持率`
                : districtAnalysis?.filter?.city
                  ? `${districtAnalysis.filter.city}各區支持率`
                  : '各區域支持率比較'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={districtAnalysis?.byDistrict?.slice(0, 10) || []}
                  layout="vertical"
                  margin={{ left: 80 }}
                >
                  <CartesianGrid {...chartGridStyle} />
                  <XAxis
                    type="number"
                    domain={[0, 1]}
                    tickFormatter={(v) => formatPercent(v)}
                    tick={chartAxisStyle.tick}
                    stroke={chartAxisStyle.stroke}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={70}
                    tick={chartAxisStyle.tick}
                    stroke={chartAxisStyle.stroke}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatPercent(value), '支持率']}
                    {...chartTooltipStyle}
                  />
                  <Bar dataKey="supportRate" fill="#22c55e" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>趨勢分析</CardTitle>
            <CardDescription>過去 30 天接觸與新增選民趨勢</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend?.dailyContacts || []}>
                  <CartesianGrid {...chartGridStyle} />
                  <XAxis
                    dataKey="date"
                    tick={chartAxisStyle.tick}
                    stroke={chartAxisStyle.stroke}
                  />
                  <YAxis
                    tick={chartAxisStyle.tick}
                    stroke={chartAxisStyle.stroke}
                  />
                  <Tooltip {...chartTooltipStyle} />
                  <Legend {...chartLegendStyle} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="接觸次數"
                    stroke="#3b82f6"
                    fill="#3b82f680"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Influencers */}
      <Card>
        <CardHeader>
          <CardTitle>關鍵人物</CardTitle>
          <CardDescription>高影響力選民名單</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {influence?.topInfluencers?.slice(0, 6).map((person: any) => (
              <Link
                key={person.voterId}
                href={`/dashboard/voters/${person.voterId}`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {person.influenceScore}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{person.voterName}</p>
                  <p className="text-sm text-muted-foreground">
                    {getStanceLabel(person.stance)} · {person.connections} 連結
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {(!influence?.topInfluencers || influence.topInfluencers.length === 0) && (
            <p className="text-center text-muted-foreground py-8">
              尚無足夠數據分析關鍵人物
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
