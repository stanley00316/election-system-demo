'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { contactsApi } from '@/lib/api';
import { useCampaignStore } from '@/stores/campaign';
import { useToast } from '@/hooks/use-toast';

interface GpsData {
  lat: number;
  lng: number;
  city?: string;
  district?: string;
}

interface RecordContactOptions {
  voterId: string;
  type: string; // ContactType enum value (e.g. 'LINE_CALL', 'PHONE_CALL', 'OTHER')
  notes?: string;
  outcome?: string; // ContactOutcome value, defaults to 'NEUTRAL'
  silent?: boolean; // If true, don't show toast
}

const DEDUP_KEY = 'auto-contact-dedup';
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 分鐘防重複窗口

function getDedupKey(voterId: string, type: string): string {
  return `${voterId}:${type}`;
}

function isDuplicate(voterId: string, type: string): boolean {
  try {
    const stored = sessionStorage.getItem(DEDUP_KEY);
    if (!stored) return false;
    const records: Record<string, number> = JSON.parse(stored);
    const key = getDedupKey(voterId, type);
    const lastTime = records[key];
    if (!lastTime) return false;
    return Date.now() - lastTime < DEDUP_WINDOW_MS;
  } catch {
    return false;
  }
}

function markRecorded(voterId: string, type: string): void {
  try {
    const stored = sessionStorage.getItem(DEDUP_KEY);
    const records: Record<string, number> = stored ? JSON.parse(stored) : {};
    records[getDedupKey(voterId, type)] = Date.now();
    // 清除過期記錄
    const now = Date.now();
    for (const key of Object.keys(records)) {
      if (now - records[key] > DEDUP_WINDOW_MS) {
        delete records[key];
      }
    }
    sessionStorage.setItem(DEDUP_KEY, JSON.stringify(records));
  } catch {
    // 忽略 storage 錯誤
  }
}

export function useAutoContact() {
  const { currentCampaign } = useCampaignStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // GPS 狀態
  const [gpsData, setGpsData] = useState<GpsData | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const gpsInitialized = useRef(false);

  // 初始化 GPS（僅執行一次）
  useEffect(() => {
    if (gpsInitialized.current || typeof window === 'undefined' || !navigator.geolocation) return;
    gpsInitialized.current = true;
    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: GpsData = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsData(loc);
        setGpsLoading(false);

        // 反向地理編碼取得城市與區域
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&accept-language=zh-TW`
        )
          .then((res) => res.json())
          .then((data) => {
            if (data?.address) {
              setGpsData((prev) =>
                prev
                  ? {
                      ...prev,
                      city: data.address.city || data.address.county || '',
                      district:
                        data.address.suburb ||
                        data.address.district ||
                        data.address.town ||
                        '',
                    }
                  : null
              );
            }
          })
          .catch(() => {});
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // 自動建立接觸紀錄（含防重複）
  const recordContact = useCallback(
    async (options: RecordContactOptions) => {
      const { voterId, type, notes, outcome = 'NEUTRAL', silent = false } = options;

      if (!currentCampaign?.id) return null;

      // 防重複檢查
      if (isDuplicate(voterId, type)) {
        return null;
      }

      try {
        const contactData: Record<string, unknown> = {
          voterId,
          campaignId: currentCampaign.id,
          type,
          outcome,
          notes,
          contactDate: new Date().toISOString(),
        };

        // 帶入 GPS 資料
        if (gpsData) {
          contactData.locationLat = gpsData.lat;
          contactData.locationLng = gpsData.lng;
          if (gpsData.city || gpsData.district) {
            contactData.location = [gpsData.city, gpsData.district]
              .filter(Boolean)
              .join('');
          }
        }

        const result = await contactsApi.create(contactData);
        markRecorded(voterId, type);

        // 更新相關查詢快取
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['voter', voterId] });

        if (!silent) {
          toast({
            title: '已自動記錄接觸',
            description: notes || '接觸紀錄已建立',
          });
        }

        return result;
      } catch (error) {
        // 不阻斷使用者流程
        console.debug('Auto-contact record failed:', error);
        return null;
      }
    },
    [currentCampaign?.id, gpsData, toast, queryClient]
  );

  // 取得 GPS 位置文字（如「台北市信義區」）
  const getLocationText = useCallback((): string => {
    if (!gpsData?.city && !gpsData?.district) return '';
    return [gpsData.city, gpsData.district].filter(Boolean).join('');
  }, [gpsData]);

  return {
    recordContact,
    gpsData,
    gpsLoading,
    getLocationText,
  };
}
