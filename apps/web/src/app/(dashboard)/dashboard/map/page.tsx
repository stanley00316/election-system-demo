'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCampaignStore } from '@/stores/campaign';
import { votersApi } from '@/lib/api';
import { VoterMap, HeatmapLayer } from '@/components/map';
import { getStanceLabel, getStanceColor } from '@/lib/utils';
import { MapPin, Flame, Navigation, Users } from 'lucide-react';
import Link from 'next/link';

export default function MapPage() {
  const { currentCampaign } = useCampaignStore();
  const campaignId = currentCampaign?.id;
  const [selectedVoter, setSelectedVoter] = useState<any>(null);

  const { data: votersData, isLoading } = useQuery({
    queryKey: ['voters', campaignId, 'map'],
    queryFn: () =>
      votersApi.getAll({
        campaignId,
        limit: 100, // API 最大限制為 100
      }),
    enabled: !!campaignId,
  });

  const voters = votersData?.data?.filter(
    (v: any) => v.latitude && v.longitude
  ) || [];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">地圖檢視</h1>
          <p className="text-muted-foreground">
            顯示 {voters.length} 位有地址資料的選民
          </p>
        </div>
      </div>

      <Tabs defaultValue="markers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="markers" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            選民分布
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            熱區圖
          </TabsTrigger>
        </TabsList>

        <TabsContent value="markers">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Map */}
            <Card className="lg:col-span-3">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="h-[600px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : voters.length === 0 ? (
                  <div className="h-[600px] flex flex-col items-center justify-center text-muted-foreground">
                    <MapPin className="h-12 w-12 mb-4" />
                    <p>沒有選民有地理座標資料</p>
                    <p className="text-sm">請確保選民資料有填寫地址</p>
                  </div>
                ) : (
                  <VoterMap
                    voters={voters}
                    className="h-[600px] rounded-lg overflow-hidden"
                    onVoterClick={setSelectedVoter}
                  />
                )}
              </CardContent>
            </Card>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Legend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">圖例說明</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    'STRONG_SUPPORT',
                    'SUPPORT',
                    'LEAN_SUPPORT',
                    'NEUTRAL',
                    'UNDECIDED',
                    'LEAN_OPPOSE',
                    'OPPOSE',
                    'STRONG_OPPOSE',
                  ].map((stance) => (
                    <div key={stance} className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${getStanceColor(stance).split(' ')[0]}`}
                      />
                      <span className="text-sm">{getStanceLabel(stance)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">統計</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">有座標選民</span>
                    <span className="font-medium">{voters.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">無座標選民</span>
                    <span className="font-medium">
                      {(votersData?.pagination?.total || 0) - voters.length}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Selected Voter */}
              {selectedVoter && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">選取的選民</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{selectedVoter.name}</span>
                        <Badge className={getStanceColor(selectedVoter.stance)}>
                          {getStanceLabel(selectedVoter.stance)}
                        </Badge>
                      </div>
                      {selectedVoter.address && (
                        <p className="text-sm text-muted-foreground">
                          {selectedVoter.address}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Link href={`/dashboard/voters/${selectedVoter.id}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full">
                            詳情
                          </Button>
                        </Link>
                        <Link href={`/dashboard/contacts/new?voterId=${selectedVoter.id}`} className="flex-1">
                          <Button size="sm" className="w-full">
                            記錄
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle>票源熱區圖</CardTitle>
              <CardDescription>
                依據選民支持度與影響力加權顯示
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <HeatmapLayer className="h-[600px] rounded-b-lg overflow-hidden" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
