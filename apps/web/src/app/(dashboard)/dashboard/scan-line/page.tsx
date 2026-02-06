'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCampaignStore } from '@/stores/campaign';
import { votersApi, contactsApi } from '@/lib/api';
import {
  QrCode,
  User,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  ExternalLink,
  UserPlus,
  History,
  Search,
  RefreshCw,
  Tag,
  FileText,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useHydration } from '@/hooks/use-hydration';
import { ContactType, ContactOutcome } from '@shared/types/contact';
import { LineDisplay, LineOpenButton } from '@/components/common/LineDisplay';
import { getContactTypeLabel } from '@/lib/utils';

// 動態匯入 QR 掃描器元件，避免 SSR 錯誤
const LineQrScanner = dynamic(
  () => import('@/components/common/LineQrScanner').then(mod => mod.LineQrScanner),
  { ssr: false }
);

// 動態匯入 LINE 通話記錄對話框
const LineContactDialog = dynamic(
  () => import('@/components/contacts/LineContactDialog').then(mod => mod.LineContactDialog),
  { ssr: false }
);

// 政治立場顏色對應
const stanceColors: Record<string, string> = {
  STRONG_SUPPORT: 'bg-green-500',
  SUPPORT: 'bg-green-400',
  LEAN_SUPPORT: 'bg-green-300',
  NEUTRAL: 'bg-gray-400',
  UNDECIDED: 'bg-yellow-400',
  LEAN_OPPOSE: 'bg-red-300',
  OPPOSE: 'bg-red-400',
  STRONG_OPPOSE: 'bg-red-500',
};

const stanceLabels: Record<string, string> = {
  STRONG_SUPPORT: '強力支持',
  SUPPORT: '支持',
  LEAN_SUPPORT: '傾向支持',
  NEUTRAL: '中立',
  UNDECIDED: '未表態',
  LEAN_OPPOSE: '傾向反對',
  OPPOSE: '反對',
  STRONG_OPPOSE: '強烈反對',
};

interface ScanResult {
  lineId?: string;
  lineUrl: string;
}

export default function ScanLinePage() {
  const hydrated = useHydration();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentCampaign } = useCampaignStore();
  const { toast } = useToast();
  
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState<any>(null);

  // 搜尋選民
  const { data: searchResult, isLoading: isSearching, refetch: refetchSearch } = useQuery({
    queryKey: ['voters', 'search-by-line', scanResult?.lineId, scanResult?.lineUrl, currentCampaign?.id],
    queryFn: () => votersApi.searchByLine({
      campaignId: currentCampaign!.id,
      lineId: scanResult?.lineId,
      lineUrl: scanResult?.lineUrl,
    }),
    enabled: !!scanResult && !!currentCampaign,
  });

  // 處理掃描結果
  const handleScanResult = (result: ScanResult) => {
    setScanResult(result);
    setQrScannerOpen(false);
    toast({
      title: '掃描成功',
      description: '正在搜尋選民資料...',
    });
  };

  // 開啟新增選民頁面並帶入 LINE 資訊
  const handleAddVoter = () => {
    if (!scanResult) return;
    
    const params = new URLSearchParams();
    if (scanResult.lineId) {
      params.set('lineId', scanResult.lineId);
    }
    params.set('lineUrl', scanResult.lineUrl);
    
    router.push(`/dashboard/voters/new?${params.toString()}`);
  };

  // 記錄 LINE 通話
  const handleRecordLineCall = (voter: any) => {
    setSelectedVoter(voter);
    setContactDialogOpen(true);
  };

  // 重新掃描
  const handleRescan = () => {
    setScanResult(null);
    setQrScannerOpen(true);
  };

  // 水合完成前顯示載入狀態
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            掃描 LINE
          </h1>
          <p className="text-muted-foreground">掃描 LINE QR Code 來搜尋或新增選民</p>
        </div>
        {scanResult && (
          <Button variant="outline" onClick={handleRescan}>
            <RefreshCw className="h-4 w-4 mr-2" />
            重新掃描
          </Button>
        )}
      </div>

      {/* 主要內容 */}
      {!scanResult ? (
        // 初始狀態 - 顯示掃描按鈕
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="p-6 rounded-full bg-primary/10">
                <QrCode className="h-16 w-16 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">開始掃描 LINE QR Code</h2>
                <p className="text-muted-foreground max-w-md">
                  點擊下方按鈕開始掃描選民的 LINE QR Code，
                  系統將自動搜尋是否已有此選民的資料
                </p>
              </div>
              <Button size="lg" onClick={() => setQrScannerOpen(true)}>
                <QrCode className="h-5 w-5 mr-2" />
                開始掃描
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : isSearching ? (
        // 搜尋中
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">正在搜尋選民資料...</p>
            </div>
          </CardContent>
        </Card>
      ) : searchResult?.found && searchResult.voters.length > 0 ? (
        // 找到選民
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <Search className="h-5 w-5" />
            <span className="font-medium">找到 {searchResult.voters.length} 位選民</span>
          </div>

          {searchResult.voters.map((voter: any) => (
            <Card key={voter.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{voter.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="secondary"
                          className={`${stanceColors[voter.stance]} text-white`}
                        >
                          {stanceLabels[voter.stance] || voter.stance}
                        </Badge>
                        {voter.influenceScore > 0 && (
                          <Badge variant="outline">
                            影響力 {voter.influenceScore}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link href={`/dashboard/voters/${voter.id}`}>
                    <Button variant="ghost" size="sm">
                      查看詳情
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 聯絡資訊 */}
                <div className="grid gap-3 text-sm">
                  {voter.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{voter.phone}</span>
                    </div>
                  )}
                  {voter.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{voter.email}</span>
                    </div>
                  )}
                  {/* LINE 資訊 - 使用 LineDisplay 元件 */}
                  <LineDisplay
                    lineId={voter.lineId}
                    lineUrl={voter.lineUrl}
                    variant="inline"
                    showAddButton={true}
                  />
                  {voter.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{voter.address}</span>
                    </div>
                  )}
                </div>

                {/* 標籤 */}
                {voter.tags && voter.tags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">標籤</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {voter.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 備註 */}
                {voter.notes && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">備註</span>
                      </div>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                        {voter.notes}
                      </p>
                    </div>
                  </>
                )}

                {/* 最近接觸紀錄（增強版：顯示接觸內容） */}
                {voter.contacts && voter.contacts.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">最近接觸</span>
                      </div>
                      <div className="space-y-3">
                        {voter.contacts.slice(0, 3).map((contact: any) => (
                          <div key={contact.id} className="border-l-2 border-muted pl-3 py-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {new Date(contact.contactDate).toLocaleDateString('zh-TW')}
                                {contact.user?.name && ` - ${contact.user.name}`}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {getContactTypeLabel(contact.type)}
                              </Badge>
                            </div>
                            {/* 顯示接觸內容/備註 */}
                            {(contact.notes || contact.summary) && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {contact.notes || contact.summary}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        總共接觸 {voter._count?.contacts || voter.contactCount || 0} 次
                      </p>
                    </div>
                  </>
                )}

                {/* 建立資訊 */}
                {voter.creator && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        由 {voter.creator.name} 於 {new Date(voter.createdAt).toLocaleDateString('zh-TW')} 建立
                      </span>
                    </div>
                  </>
                )}

                <Separator />

                {/* 操作按鈕 */}
                <div className="flex flex-wrap gap-2">
                  <LineOpenButton
                    lineId={voter.lineId}
                    lineUrl={voter.lineUrl}
                  />
                  <Button variant="outline" onClick={() => handleRecordLineCall(voter)}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    記錄 LINE 通話
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // 未找到選民
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="p-6 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <UserPlus className="h-16 w-16 text-yellow-600" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">未找到選民</h2>
                <p className="text-muted-foreground max-w-md">
                  系統中沒有此 LINE 帳號的選民資料。
                  您可以新增此選民，LINE 資訊將自動填入。
                </p>
                {scanResult.lineId && (
                  <p className="text-sm">
                    LINE ID: <span className="font-medium">{scanResult.lineId}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleRescan}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重新掃描
                </Button>
                <Button onClick={handleAddVoter}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  新增選民
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LINE QR Scanner Dialog */}
      {qrScannerOpen && (
        <LineQrScanner
          open={qrScannerOpen}
          onOpenChange={setQrScannerOpen}
          onScan={handleScanResult}
        />
      )}

      {/* LINE Contact Dialog */}
      {contactDialogOpen && selectedVoter && (
        <LineContactDialog
          open={contactDialogOpen}
          onOpenChange={setContactDialogOpen}
          voter={selectedVoter}
          campaignId={currentCampaign.id}
          onSuccess={() => {
            refetchSearch();
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
          }}
        />
      )}
    </div>
  );
}
