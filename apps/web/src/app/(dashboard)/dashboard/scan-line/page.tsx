'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  UserPlus,
  History,
  Search,
  RefreshCw,
  Tag,
  FileText,
  Clock,
  AlertTriangle,
  Loader2,
  Navigation,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useHydration } from '@/hooks/use-hydration';
import { useAutoContact } from '@/hooks/use-auto-contact';
import { LineDisplay, LineOpenButton } from '@/components/common/LineDisplay';
import { getContactTypeLabel } from '@/lib/utils';
import { VoterAreaCard } from '@/components/voters/VoterAreaCard';
import { SameAreaVoters } from '@/components/voters/SameAreaVoters';

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
  const { recordContact, gpsData, gpsLoading, getLocationText } = useAutoContact();
  
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState<any>(null);

  // 快速新增表單狀態
  const [quickName, setQuickName] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickAddSuccess, setQuickAddSuccess] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 自動記錄接觸的追蹤（避免重複觸發）
  const autoContactRecorded = useRef<string | null>(null);

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

  // 取得找到選民的第一位（用於區域查詢）
  const foundVoter = searchResult?.found && searchResult.voters.length > 0
    ? searchResult.voters[0]
    : null;

  // 找到現有選民時自動建立接觸紀錄
  useEffect(() => {
    if (foundVoter && autoContactRecorded.current !== foundVoter.id) {
      autoContactRecorded.current = foundVoter.id;
      recordContact({
        voterId: foundVoter.id,
        type: 'LINE_CALL',
        notes: 'LINE QR 掃描接觸',
        silent: false,
      });
    }
  }, [foundVoter, recordContact]);

  // 查詢同區域選民（用於 VoterAreaCard 統計 + SameAreaVoters 列表）
  const { data: areaVotersResult, isLoading: isLoadingAreaVoters } = useQuery({
    queryKey: [
      'voters',
      'same-area',
      currentCampaign?.id,
      foundVoter?.districtName,
      foundVoter?.id,
    ],
    queryFn: () =>
      votersApi.getAll({
        campaignId: currentCampaign!.id,
        district: foundVoter!.districtName,
        limit: 100,
        page: 1,
      }),
    enabled: !!foundVoter?.districtName && !!currentCampaign,
  });

  const areaVoters = areaVotersResult?.data || [];

  // 處理掃描結果
  const handleScanResult = (result: ScanResult) => {
    setScanResult(result);
    setQrScannerOpen(false);
    setQuickAddSuccess(null);
    autoContactRecorded.current = null;
    toast({
      title: '掃描成功',
      description: '正在搜尋選民資料...',
    });
  };

  // 快速新增選民 + 自動建立接觸紀錄
  const handleQuickAdd = useCallback(async () => {
    if (!scanResult || !currentCampaign || !quickName.trim()) return;

    setIsQuickAdding(true);
    try {
      // 防重複：先再查一次
      const recheck = await votersApi.searchByLine({
        campaignId: currentCampaign.id,
        lineId: scanResult.lineId,
        lineUrl: scanResult.lineUrl,
      });

      if (recheck?.found && recheck.voters.length > 0) {
        toast({
          title: '選民已存在',
          description: `此選民已由 ${recheck.voters[0].creator?.name || '其他團隊成員'} 建立`,
        });
        queryClient.invalidateQueries({ queryKey: ['voters', 'search-by-line'] });
        refetchSearch();
        setIsQuickAdding(false);
        return;
      }

      // 建立選民（最少資料）
      const voterData: Record<string, unknown> = {
        name: quickName.trim(),
        campaignId: currentCampaign.id,
        lineUrl: scanResult.lineUrl,
        stance: 'UNDECIDED',
      };
      if (scanResult.lineId) voterData.lineId = scanResult.lineId;
      if (gpsData?.city) voterData.city = gpsData.city;
      if (gpsData?.district) voterData.districtName = gpsData.district;
      if (gpsData?.lat) voterData.latitude = gpsData.lat;
      if (gpsData?.lng) voterData.longitude = gpsData.lng;

      const newVoter = await votersApi.create(voterData);

      if (newVoter._alreadyExists) {
        toast({
          title: '選民已存在',
          description: `${newVoter.name} 已在系統中`,
        });
        queryClient.invalidateQueries({ queryKey: ['voters', 'search-by-line'] });
        refetchSearch();
        setIsQuickAdding(false);
        return;
      }

      // 自動建立初次接觸紀錄
      await recordContact({
        voterId: newVoter.id,
        type: 'LINE_CALL',
        notes: '透過 LINE QR 掃描首次接觸',
        outcome: 'NEUTRAL',
        silent: true,
      });

      // 成功提示
      const savedName = quickName.trim();
      toast({
        title: '快速新增成功',
        description: `已新增 ${savedName}，含接觸紀錄`,
      });

      // 重置狀態，準備下一次掃描
      setQuickAddSuccess(savedName);
      setQuickName('');
      setScanResult(null);
      autoContactRecorded.current = null;

      // 無效化查詢快取
      queryClient.invalidateQueries({ queryKey: ['voters'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });

      // 2 秒後清除成功訊息
      setTimeout(() => setQuickAddSuccess(null), 3000);
    } catch (error: any) {
      toast({
        title: '新增失敗',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsQuickAdding(false);
    }
  }, [scanResult, currentCampaign, quickName, gpsData, recordContact, toast, queryClient, refetchSearch]);

  // 名稱欄位聚焦（掃描後未找到時自動聚焦）
  useEffect(() => {
    if (scanResult && searchResult && !searchResult.found && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [scanResult, searchResult]);

  // 記錄 LINE 通話
  const handleRecordLineCall = (voter: any) => {
    setSelectedVoter(voter);
    setContactDialogOpen(true);
  };

  // 重新掃描
  const handleRescan = () => {
    setScanResult(null);
    setQuickName('');
    setQuickAddSuccess(null);
    autoContactRecorded.current = null;
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
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-5 w-5 lg:h-6 lg:w-6" />
            掃描 LINE
          </h1>
          <p className="text-sm text-muted-foreground">掃描 LINE QR Code 來搜尋或新增選民</p>
        </div>
        {scanResult && (
          <Button variant="outline" size="sm" onClick={handleRescan}>
            <RefreshCw className="h-4 w-4 mr-2" />
            重新掃描
          </Button>
        )}
      </div>

      {/* 快速新增成功提示 */}
      {quickAddSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              已成功新增 {quickAddSuccess}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              接觸紀錄與 GPS 位置已自動記錄
            </p>
          </div>
        </div>
      )}

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

              {/* GPS 狀態提示 */}
              {gpsLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  正在取得您的位置...
                </div>
              )}
              {gpsData?.city && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Navigation className="h-3 w-3" />
                  目前位置：{getLocationText()}
                </div>
              )}
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
            <Badge variant="secondary" className="text-xs">已自動記錄接觸</Badge>
          </div>

          {searchResult.voters.map((voter: any) => {
            // 計算重複接觸警告
            const latestContact = voter.contacts?.[0];
            const isRecentlyContacted =
              latestContact &&
              Date.now() - new Date(latestContact.contactDate).getTime() <
                48 * 60 * 60 * 1000;

            return (
              <div key={voter.id} className="space-y-4">
                {/* 重複接觸警告橫幅 */}
                {isRecentlyContacted && latestContact && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 sticky top-0 z-10">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        此選民近期已被接觸
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                        {latestContact.user?.name || '團隊成員'} 於{' '}
                        {new Date(latestContact.contactDate).toLocaleDateString('zh-TW')}{' '}
                        已接觸（{getContactTypeLabel(latestContact.type)}）
                      </p>
                    </div>
                  </div>
                )}

                {/* 選民基本資訊 */}
                <Card>
                  <CardHeader className="pb-3">
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
                </Card>

                {/* 區域定位卡片 */}
                <VoterAreaCard
                  voter={voter}
                  areaVoters={areaVoters}
                  isLoadingAreaVoters={isLoadingAreaVoters}
                />

                {/* 聯絡資訊 + 詳細資料 */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
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
                      {/* LINE 資訊 */}
                      <LineDisplay
                        lineId={voter.lineId}
                        lineUrl={voter.lineUrl}
                        variant="inline"
                        showAddButton={true}
                      />
                      {voter.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{voter.address}</span>
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

                    {/* 最近接觸紀錄 */}
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

                {/* 同區域選民列表（可收合） */}
                <SameAreaVoters
                  currentVoterId={voter.id}
                  district={voter.districtName}
                  village={voter.village}
                  campaignId={currentCampaign.id}
                  areaVoters={areaVoters}
                  isLoading={isLoadingAreaVoters}
                />
              </div>
            );
          })}
        </div>
      ) : (
        // 未找到選民 — 快速新增模式
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center space-y-5">
              <div className="p-4 rounded-full bg-primary/10">
                <Zap className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold">快速新增選民</h2>
                <p className="text-sm text-muted-foreground">
                  輸入姓名即可快速建立，其餘資料行程後再補填
                </p>
              </div>

              {/* 掃描到的 LINE 資訊（唯讀） */}
              <div className="w-full max-w-sm space-y-3">
                {scanResult?.lineId && (
                  <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-muted/50">
                    <MessageCircle className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="text-muted-foreground">LINE ID:</span>
                    <span className="font-medium truncate">{scanResult.lineId}</span>
                  </div>
                )}

                {/* GPS 位置提示 */}
                {gpsData?.city && (
                  <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-900/20">
                    <Navigation className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-blue-700 dark:text-blue-300">
                      {getLocationText()}
                    </span>
                  </div>
                )}
                {gpsLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-3">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    正在偵測位置...
                  </div>
                )}

                {/* 姓名輸入欄位 */}
                <div className="space-y-2">
                  <Input
                    ref={nameInputRef}
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="輸入選民姓名"
                    className="text-center text-lg h-12"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && quickName.trim()) {
                        e.preventDefault();
                        handleQuickAdd();
                      }
                    }}
                    autoFocus
                  />
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleRescan}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重新掃描
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleQuickAdd}
                    disabled={!quickName.trim() || isQuickAdding}
                  >
                    {isQuickAdding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        新增中...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        快速新增
                      </>
                    )}
                  </Button>
                </div>

                {/* 完整表單連結 */}
                <div className="text-center">
                  <Link
                    href={`/dashboard/voters/new?${new URLSearchParams({
                      ...(scanResult?.lineId ? { lineId: scanResult.lineId } : {}),
                      lineUrl: scanResult?.lineUrl || '',
                      ...(gpsData?.city ? { city: gpsData.city } : {}),
                      ...(gpsData?.district ? { district: gpsData.district } : {}),
                      ...(gpsData?.lat ? { lat: String(gpsData.lat) } : {}),
                      ...(gpsData?.lng ? { lng: String(gpsData.lng) } : {}),
                    }).toString()}`}
                    className="text-xs text-muted-foreground hover:text-primary underline"
                  >
                    需要填寫更多資料？使用完整表單
                  </Link>
                </div>
              </div>

              {/* 防重複提示 */}
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                系統會自動檢查重複、記錄接觸紀錄及 GPS 位置
              </p>
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
          locationLat={gpsData?.lat}
          locationLng={gpsData?.lng}
          location={getLocationText()}
          onSuccess={() => {
            refetchSearch();
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
          }}
        />
      )}
    </div>
  );
}
