'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Download,
  Loader2,
  ChevronDown,
  ChevronRight,
  Users,
  BarChart3,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminAnalyticsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { getStanceLabel } from '@/lib/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const STANCE_COLORS: Record<string, string> = {
  STRONG_SUPPORT: '#15803d', SUPPORT: '#22c55e', LEAN_SUPPORT: '#86efac',
  NEUTRAL: '#9ca3af', UNDECIDED: '#d1d5db',
  LEAN_OPPOSE: '#fca5a5', OPPOSE: '#ef4444', STRONG_OPPOSE: '#991b1b',
};

const ELECTION_TYPE_LABELS: Record<string, string> = {
  VILLAGE_CHIEF: '里長',
  TOWNSHIP_REP: '鄉鎮市民代表',
  CITY_COUNCILOR: '縣市議員',
  LEGISLATOR: '立法委員',
  MAYOR: '縣市首長',
  PRESIDENT: '總統',
};

const CITIES = [
  '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
  '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣',
  '南投縣', '雲林縣', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
  '台東縣', '澎湖縣', '金門縣', '連江縣',
];

export default function AdminRegionsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Filters
  const [cityFilter, setCityFilter] = useState('all');
  const [electionTypeFilter, setElectionTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [cityFilter, electionTypeFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await adminAnalyticsApi.getRegionalOverview(
        cityFilter !== 'all' ? cityFilter : undefined,
        electionTypeFilter !== 'all' ? electionTypeFilter : undefined,
      );
      setData(result);
      // 如果篩選了單一城市，自動展開
      if (cityFilter !== 'all' && result.regions?.length === 1) {
        setExpandedCities(new Set([result.regions[0].city]));
      }
    } catch (error) {
      console.error('載入地區資料失敗:', error);
      toast({ title: '載入失敗', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCity = (city: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city);
      else next.add(city);
      return next;
    });
  };

  const toggleUser = (key: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = () => {
    const isDemoMode = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
    if (isDemoMode) {
      toast({ title: '示範模式不支援匯出', description: '請連接後端後使用匯出功能' });
      return;
    }
    const params = new URLSearchParams();
    if (cityFilter !== 'all') params.set('city', cityFilter);
    if (electionTypeFilter !== 'all') params.set('electionType', electionTypeFilter);
    window.open(`/api/v1/admin/analytics/regional-overview/export?${params.toString()}`, '_blank');
  };

  // 計算整體統計
  const totalStats = data?.regions?.reduce(
    (acc: any, r: any) => ({
      regions: acc.regions + 1,
      users: acc.users + r.summary.totalUsers,
      voters: acc.voters + r.summary.totalVoters,
      campaigns: acc.campaigns + r.summary.totalCampaigns,
    }),
    { regions: 0, users: 0, voters: 0, campaigns: 0 }
  ) || { regions: 0, users: 0, voters: 0, campaigns: 0 };

  // 過濾搜尋
  const filteredRegions = data?.regions?.filter((region: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return region.users.some((u: any) =>
      u.userName.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">地區總覽</h1>
          <p className="text-gray-500">各地區所有使用者的選情數據一覽</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          匯出報表
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">地區數</p>
            <p className="text-2xl font-bold">{totalStats.regions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">候選人總數</p>
            <p className="text-2xl font-bold text-blue-600">{totalStats.users}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">選民總計</p>
            <p className="text-2xl font-bold text-green-600">{totalStats.voters}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">活動總數</p>
            <p className="text-2xl font-bold text-purple-600">{totalStats.campaigns}</p>
          </CardContent>
        </Card>
      </div>

      {/* 篩選器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="搜尋使用者名稱..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="縣市" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部縣市</SelectItem>
                {CITIES.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={electionTypeFilter} onValueChange={setElectionTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="選舉類型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部類型</SelectItem>
                {Object.entries(ELECTION_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 地區列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredRegions.length > 0 ? (
        <div className="space-y-3">
          {filteredRegions.map((region: any) => (
            <Card key={region.city}>
              {/* 地區標題（可展開） */}
              <button
                className="w-full text-left"
                onClick={() => toggleCity(region.city)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedCities.has(region.city) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <span className="font-bold text-lg">{region.city}</span>
                        <span className="text-sm text-gray-500 ml-3">
                          {region.summary.totalUsers} 位候選人 · {region.summary.totalVoters} 選民
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-sm text-gray-500">支持率</span>
                        <p className={`font-bold ${region.summary.overallSupportRate >= 40 ? 'text-green-600' : region.summary.overallSupportRate >= 25 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {region.summary.overallSupportRate}%
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">接觸率</span>
                        <p className="font-bold text-blue-600">{region.summary.overallContactRate}%</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </button>

              {/* 展開內容：使用者表格 */}
              {expandedCities.has(region.city) && (
                <CardContent className="pt-0 pb-4">
                  <div className="border-t pt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2"></th>
                            <th className="text-left p-2">使用者</th>
                            <th className="text-left p-2">活動名稱</th>
                            <th className="text-left p-2">選舉類型</th>
                            <th className="text-left p-2">區域</th>
                            <th className="text-right p-2">選民數</th>
                            <th className="text-right p-2">支持率</th>
                            <th className="text-right p-2">接觸率</th>
                            <th className="text-left p-2">訂閱</th>
                          </tr>
                        </thead>
                        <tbody>
                          {region.users.map((user: any) =>
                            user.campaigns.map((campaign: any, idx: number) => {
                              const userCampaignKey = `${user.userId}-${campaign.campaignId}`;
                              return (
                                <React.Fragment key={userCampaignKey}>
                                  <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => toggleUser(userCampaignKey)}>
                                    <td className="p-2">
                                      {expandedUsers.has(userCampaignKey) ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                      )}
                                    </td>
                                    <td className="p-2">
                                      {idx === 0 ? (
                                        <Link href={`/admin/users/${user.userId}`} className="font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                                          {user.userName}
                                        </Link>
                                      ) : (
                                        <span className="text-gray-400">↳</span>
                                      )}
                                    </td>
                                    <td className="p-2">{campaign.campaignName}</td>
                                    <td className="p-2">
                                      <Badge variant="outline">
                                        {ELECTION_TYPE_LABELS[campaign.electionType] || campaign.electionType}
                                      </Badge>
                                    </td>
                                    <td className="p-2 text-gray-500">
                                      {campaign.district || ''}{campaign.village ? ` · ${campaign.village}` : ''}
                                    </td>
                                    <td className="p-2 text-right font-medium">{campaign.voterCount}</td>
                                    <td className="p-2 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                          <div
                                            className="h-full rounded-full"
                                            style={{
                                              width: `${Math.min(campaign.supportRate, 100)}%`,
                                              backgroundColor: campaign.supportRate >= 40 ? '#22c55e' : campaign.supportRate >= 25 ? '#eab308' : '#ef4444',
                                            }}
                                          />
                                        </div>
                                        <span className="font-medium text-xs w-10 text-right">
                                          {campaign.supportRate}%
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${Math.min(campaign.contactRate, 100)}%` }}
                                          />
                                        </div>
                                        <span className="text-xs w-10 text-right text-gray-500">
                                          {campaign.contactRate}%
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-2">
                                      {idx === 0 && (
                                        <Badge variant={user.subscriptionStatus === 'ACTIVE' ? 'default' : user.subscriptionStatus === 'TRIAL' ? 'secondary' : 'outline'}>
                                          {user.subscriptionStatus === 'ACTIVE' ? '訂閱中' : user.subscriptionStatus === 'TRIAL' ? '試用' : user.subscriptionStatus}
                                        </Badge>
                                      )}
                                    </td>
                                  </tr>
                                  {/* 展開：支持度分佈迷你圓餅圖 */}
                                  {expandedUsers.has(userCampaignKey) && campaign.stanceDistribution && (
                                    <tr>
                                      <td colSpan={9} className="p-4 bg-gray-50">
                                        <div className="flex items-center gap-8">
                                          <div className="w-48 h-48">
                                            <ResponsiveContainer width="100%" height="100%">
                                              <PieChart>
                                                <Pie
                                                  data={Object.entries(campaign.stanceDistribution)
                                                    .filter(([, v]) => (v as number) > 0)
                                                    .map(([key, value]) => ({
                                                      name: getStanceLabel(key),
                                                      value: value as number,
                                                    }))}
                                                  cx="50%" cy="50%" outerRadius={70} dataKey="value"
                                                >
                                                  {Object.entries(campaign.stanceDistribution)
                                                    .filter(([, v]) => (v as number) > 0)
                                                    .map(([key]) => (
                                                      <Cell key={key} fill={STANCE_COLORS[key] || '#9ca3af'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                              </PieChart>
                                            </ResponsiveContainer>
                                          </div>
                                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                            {Object.entries(campaign.stanceDistribution).map(([key, value]) => (
                                              <div key={key} className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STANCE_COLORS[key] || '#9ca3af' }} />
                                                <span className="text-gray-600">{getStanceLabel(key)}</span>
                                                <span className="font-medium">{value as number}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {data?.regions?.length === 0 ? '尚無選舉活動資料' : '沒有符合條件的資料'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
