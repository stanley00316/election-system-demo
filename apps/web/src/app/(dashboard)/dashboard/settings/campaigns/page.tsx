'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth';
import { useCampaignStore } from '@/stores/campaign';
import { authApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Plus, Settings, Users, Check, Building, ArrowLeft } from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';

const ELECTION_TYPE_LABELS: Record<string, string> = {
  VILLAGE_CHIEF: '村里長',
  TOWNSHIP_REP: '鄉鎮市民代表',
  CITY_COUNCILOR: '縣市議員',
  LEGISLATOR: '立法委員',
  MAYOR: '縣市長',
  PRESIDENT: '總統',
};

export default function CampaignsPage() {
  const { user } = useAuthStore();
  const { currentCampaign, setCurrentCampaign } = useCampaignStore();

  const { data: userData, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.getMe(),
    enabled: !!user,
  });

  const ownedCampaigns = userData?.campaigns || [];
  const memberCampaigns = userData?.teamMembers?.map((tm: any) => ({
    ...tm.campaign,
    role: tm.role,
  })) || [];

  const allCampaigns = [
    ...ownedCampaigns.map((c: any) => ({ ...c, role: 'OWNER' })),
    ...memberCampaigns.filter((c: any) => !ownedCampaigns.find((o: any) => o.id === c.id)),
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton href="/dashboard/settings" />
          <div>
            <h1 className="text-2xl font-bold">選舉活動管理</h1>
            <p className="text-muted-foreground">管理您的選舉活動</p>
          </div>
        </div>
        <Link href="/dashboard/settings/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            建立新活動
          </Button>
        </Link>
      </div>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : allCampaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">您還沒有任何選舉活動</p>
            <Link href="/dashboard/settings/campaigns/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                建立第一個活動
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allCampaigns.map((campaign: any) => {
            const isActive = currentCampaign?.id === campaign.id;
            
            return (
              <Card
                key={campaign.id}
                className={`relative cursor-pointer transition-shadow hover:shadow-md ${
                  isActive ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setCurrentCampaign(campaign)}
              >
                {isActive && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-primary">
                      <Check className="h-3 w-3 mr-1" />
                      使用中
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {ELECTION_TYPE_LABELS[campaign.electionType] || campaign.electionType}
                      </Badge>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <CardDescription>
                        {campaign.city}
                        {campaign.district && ` ${campaign.district}`}
                        {campaign.village && ` ${campaign.village}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {campaign.electionDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">選舉日期</span>
                        <span>
                          {formatDate(campaign.electionDate, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">角色</span>
                      <Badge variant="secondary">
                        {campaign.role === 'OWNER' ? '擁有者' :
                         campaign.role === 'ADMIN' ? '管理員' :
                         campaign.role === 'EDITOR' ? '編輯者' : '檢視者'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/dashboard/settings/campaigns/${campaign.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        設定
                      </Button>
                    </Link>
                    <Link href="/dashboard/settings/team" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Users className="h-4 w-4 mr-2" />
                        團隊
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
