'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  QrCode,
} from 'lucide-react';

// 動態載入 html5-qrcode 套件的類型
type Html5QrcodeType = import('html5-qrcode').Html5Qrcode;

/**
 * 等待 DOM 元素就緒的輔助函數
 * 使用 requestAnimationFrame 確保元素已渲染
 */
function waitForElement(id: string, maxAttempts = 20): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const element = document.getElementById(id);
      if (element) {
        resolve(element);
      } else if (attempts >= maxAttempts) {
        reject(new Error('掃描器容器不存在'));
      } else {
        attempts++;
        requestAnimationFrame(check);
      }
    };
    check();
  });
}

interface LineQrScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (result: { lineId?: string; lineUrl: string }) => void;
}

/**
 * 解析 LINE QR Code URL
 * LINE QR Code 格式：
 * - https://line.me/ti/p/~{LINE_ID} - 包含 LINE ID
 * - https://line.me/R/ti/p/{內部ID} - 不含 LINE ID，但可作為連結
 */
function parseLineQrCode(url: string): { lineId?: string; lineUrl: string } | null {
  // 確保是 LINE 連結
  if (!url.includes('line.me')) {
    return null;
  }

  // 格式 1: https://line.me/ti/p/~LINE_ID
  const match1 = url.match(/line\.me\/ti\/p\/~([^\/\?]+)/);
  if (match1) {
    return { lineId: match1[1], lineUrl: url };
  }

  // 格式 2: https://line.me/R/ti/p/xxx 或其他 LINE 連結
  if (url.includes('line.me')) {
    return { lineUrl: url };
  }

  return null;
}

export function LineQrScanner({ open, onOpenChange, onScan }: LineQrScannerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ lineId?: string; lineUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  
  const html5QrCodeRef = useRef<Html5QrcodeType | null>(null);
  const scannerContainerId = 'line-qr-scanner';
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 追蹤元件是否已掛載，防止卸載後更新狀態
  const mountedRef = useRef(true);
  // 追蹤是否正在啟動掃描器，防止重複啟動
  const isStartingRef = useRef(false);
  // 追蹤重試次數
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;

  // 清理掃描器 - 使用 useCallback 確保函數引用穩定
  const cleanupScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        if (state === 2) { // SCANNING
          await html5QrCodeRef.current.stop();
        }
      } catch (e) {
        // 忽略錯誤，掃描器可能已經停止
        console.debug('Scanner cleanup error (can be ignored):', e);
      }
      html5QrCodeRef.current = null;
    }
  }, []);

  // 處理掃描成功 - 使用 useCallback 並正確處理非同步清理
  const handleScanSuccess = useCallback(async (decodedText: string) => {
    // 檢查元件是否已卸載
    if (!mountedRef.current) return;
    
    const result = parseLineQrCode(decodedText);
    if (result) {
      // 先清理掃描器（等待完成）
      await cleanupScanner();
      
      // 再次檢查元件是否已卸載（清理過程中可能卸載）
      if (!mountedRef.current) return;
      
      setScanResult(result);
      setError(null);
      setIsScanning(false);
      
      // 顯示成功訊息
      toast({
        title: '掃描成功',
        description: result.lineId ? `LINE ID: ${result.lineId}` : 'LINE 連結已識別',
      });
    } else {
      setError('這不是有效的 LINE QR Code');
    }
  }, [cleanupScanner, toast]);

  // 啟動相機掃描 - 使用 useCallback 並加入安全檢查
  const startCameraScanning = useCallback(async (isRetry = false) => {
    // 防止重複啟動
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    
    // 如果不是重試，重置重試計數
    if (!isRetry) {
      retryCountRef.current = 0;
    }
    
    // 檢查元件是否已卸載
    if (!mountedRef.current) {
      isStartingRef.current = false;
      return;
    }
    
    setError(null);
    setScanResult(null);
    setIsScanning(true);
    setCameraPermissionDenied(false);

    try {
      // 等待容器元素就緒（使用 requestAnimationFrame 確保 DOM 已渲染）
      const container = await waitForElement(scannerContainerId);
      
      // 再次檢查元件是否已卸載
      if (!mountedRef.current) {
        isStartingRef.current = false;
        return;
      }

      // 清理之前的掃描器
      await cleanupScanner();
      
      // 再次檢查元件是否已卸載
      if (!mountedRef.current) {
        isStartingRef.current = false;
        return;
      }

      // 動態載入 html5-qrcode
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      
      // 再次檢查元件是否已卸載
      if (!mountedRef.current) {
        isStartingRef.current = false;
        return;
      }

      // 再次確認容器仍然存在
      const containerCheck = document.getElementById(scannerContainerId);
      if (!containerCheck) {
        throw new Error('掃描器容器不存在');
      }

      // 建立新的掃描器
      html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      // 取得可用的相機
      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length === 0) {
        throw new Error('找不到可用的相機');
      }

      // 優先使用後置相機
      const backCamera = cameras.find(c => 
        c.label.toLowerCase().includes('back') || 
        c.label.toLowerCase().includes('rear') ||
        c.label.toLowerCase().includes('後')
      );
      const cameraId = backCamera?.id || cameras[0].id;
      
      // 再次檢查元件是否已卸載
      if (!mountedRef.current) {
        await cleanupScanner();
        isStartingRef.current = false;
        return;
      }

      // 開始掃描
      await html5QrCodeRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        handleScanSuccess,
        () => {} // 忽略掃描失敗（持續掃描）
      );
      
      // 成功啟動，重置重試計數
      retryCountRef.current = 0;
    } catch (err: any) {
      console.error('Camera error:', err);
      
      // 檢查元件是否已卸載
      if (!mountedRef.current) {
        isStartingRef.current = false;
        return;
      }
      
      // NotFoundError 處理 - 自動重試
      if (err.name === 'NotFoundError' && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        console.log(`NotFoundError detected, retrying (${retryCountRef.current}/${MAX_RETRIES})...`);
        isStartingRef.current = false;
        
        // 等待一段時間後重試
        setTimeout(() => {
          if (mountedRef.current) {
            startCameraScanning(true);
          }
        }, 500);
        return;
      }
      
      setIsScanning(false);
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        setCameraPermissionDenied(true);
        setError('請允許存取相機權限');
      } else if (err.name === 'NotFoundError') {
        setError('相機初始化失敗，請重試');
      } else if (err.message?.includes('找不到')) {
        setError('找不到可用的相機');
      } else {
        setError('無法啟動相機：' + (err.message || '未知錯誤'));
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [cleanupScanner, handleScanSuccess]);

  // 處理圖片上傳
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setScanResult(null);
    setIsScanning(true);

    try {
      // 清理之前的掃描器
      await cleanupScanner();

      // 動態載入 html5-qrcode
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      // 建立掃描器
      const html5QrCode = new Html5Qrcode('temp-scanner-' + Date.now(), {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      // 掃描圖片
      const result = await html5QrCode.scanFile(file, true);
      
      // 解析結果
      const parsed = parseLineQrCode(result);
      if (parsed) {
        setScanResult(parsed);
        toast({
          title: '識別成功',
          description: parsed.lineId ? `LINE ID: ${parsed.lineId}` : 'LINE 連結已識別',
        });
      } else {
        setError('圖片中的 QR Code 不是有效的 LINE QR Code');
      }
    } catch (err: any) {
      console.error('Image scan error:', err);
      if (err.message?.includes('No QR code found') || err.message?.includes('QR code parse')) {
        setError('圖片中找不到 QR Code');
      } else {
        setError('無法識別圖片：' + (err.message || '請確認圖片包含清晰的 QR Code'));
      }
    } finally {
      setIsScanning(false);
      // 清空 file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 確認並回傳結果
  const handleConfirm = () => {
    if (scanResult) {
      onScan(scanResult);
      handleClose();
    }
  };

  // 關閉對話框
  const handleClose = () => {
    cleanupScanner();
    setIsScanning(false);
    setScanResult(null);
    setError(null);
    setCameraPermissionDenied(false);
    onOpenChange(false);
  };

  // Tab 切換時處理
  const handleTabChange = (value: string) => {
    cleanupScanner();
    setIsScanning(false);
    setScanResult(null);
    setError(null);
    setActiveTab(value as 'camera' | 'upload');
  };

  // 追蹤元件的掛載狀態
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 對話框關閉時清理
  useEffect(() => {
    if (!open) {
      cleanupScanner();
    }
  }, [open, cleanupScanner]);

  // 切換到相機 Tab 時自動開始掃描
  useEffect(() => {
    // 只有在對話框開啟、相機 Tab 啟用、未掃描中、無掃描結果時才啟動
    if (open && activeTab === 'camera' && !isScanning && !scanResult) {
      // 延遲啟動以確保 DOM 已準備好
      const timer = setTimeout(() => {
        // 再次檢查狀態，避免競態條件
        if (mountedRef.current) {
          startCameraScanning();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, activeTab, isScanning, scanResult, startCameraScanning]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            掃描 LINE QR Code
          </DialogTitle>
          <DialogDescription>
            使用相機掃描或上傳圖片識別 LINE QR Code
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              相機掃描
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              上傳圖片
            </TabsTrigger>
          </TabsList>

          <TabsContent 
            value="camera" 
            className={cn("mt-4", activeTab !== 'camera' && 'hidden')} 
            forceMount
          >
            {/* 掃描結果顯示 */}
            {scanResult ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                  <div className="text-center">
                    <p className="font-medium text-green-800 dark:text-green-200">掃描成功！</p>
                    {scanResult.lineId && (
                      <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                        LINE ID: {scanResult.lineId}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 break-all">
                      {scanResult.lineUrl}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => {
                    setScanResult(null);
                    startCameraScanning();
                  }}>
                    重新掃描
                  </Button>
                  <Button className="flex-1" onClick={handleConfirm}>
                    確認使用
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 相機權限被拒絕 */}
                {cameraPermissionDenied ? (
                  <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                    <XCircle className="h-12 w-12 text-yellow-600" />
                    <div className="text-center">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">無法存取相機</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        請在瀏覽器設定中允許相機權限
                      </p>
                    </div>
                    <Button onClick={startCameraScanning}>
                      重試
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* 相機預覽區域 */}
                    <div 
                      id={scannerContainerId}
                      className="relative aspect-square w-full rounded-lg overflow-hidden bg-black"
                    >
                      {isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-white text-sm">啟動相機中...</div>
                        </div>
                      )}
                    </div>

                    {/* 錯誤訊息 */}
                    {error && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                        <XCircle className="h-4 w-4 shrink-0" />
                        {error}
                      </div>
                    )}

                    <p className="text-center text-sm text-muted-foreground">
                      將 LINE QR Code 對準畫面中央即可自動識別
                    </p>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            {/* 掃描結果顯示 */}
            {scanResult ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                  <div className="text-center">
                    <p className="font-medium text-green-800 dark:text-green-200">識別成功！</p>
                    {scanResult.lineId && (
                      <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                        LINE ID: {scanResult.lineId}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 break-all">
                      {scanResult.lineUrl}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => {
                    setScanResult(null);
                    fileInputRef.current?.click();
                  }}>
                    選擇其他圖片
                  </Button>
                  <Button className="flex-1" onClick={handleConfirm}>
                    確認使用
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 上傳區域 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isScanning ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">正在識別 QR Code...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <p className="font-medium">點擊選擇圖片</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          支援名片照片或 LINE QR Code 截圖
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 錯誤訊息 */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
