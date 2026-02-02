'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
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
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  QrCode,
} from 'lucide-react';

// 動態載入 Scanner 元件，避免 SSR 錯誤
const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false, loading: () => <ScannerLoading /> }
);

// 掃描器載入中的佔位元件
function ScannerLoading() {
  return (
    <div className="aspect-square w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
      <div className="text-white text-sm flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span>載入相機中...</span>
      </div>
    </div>
  );
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
  const [scanResult, setScanResult] = useState<{ lineId?: string; lineUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 處理相機掃描結果
  const handleCameraScan = (result: { rawValue: string }[]) => {
    if (result && result.length > 0 && !scanResult) {
      const decodedText = result[0].rawValue;
      const parsed = parseLineQrCode(decodedText);
      
      if (parsed) {
        setScanResult(parsed);
        setError(null);
        toast({
          title: '掃描成功',
          description: parsed.lineId ? `LINE ID: ${parsed.lineId}` : 'LINE 連結已識別',
        });
      } else {
        setError('這不是有效的 LINE QR Code');
      }
    }
  };

  // 處理相機錯誤
  const handleCameraError = (error: unknown) => {
    console.error('Camera error:', error);
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError' || error.message?.includes('Permission')) {
        setCameraError('請允許存取相機權限');
      } else if (error.name === 'NotFoundError') {
        setCameraError('找不到可用的相機');
      } else {
        setCameraError('無法啟動相機：' + error.message);
      }
    } else {
      setCameraError('相機發生未知錯誤');
    }
  };

  // 處理圖片上傳 - 使用 Canvas 和 jsQR 或 BarcodeDetector API
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setScanResult(null);
    setIsProcessing(true);

    try {
      // 讀取圖片
      const imageUrl = URL.createObjectURL(file);
      const img = new Image();
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('無法載入圖片'));
        img.src = imageUrl;
      });

      // 使用 Canvas 獲取圖片資料
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('無法建立 Canvas');
      ctx.drawImage(img, 0, 0);

      // 嘗試使用 BarcodeDetector API（如果支援）
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore - BarcodeDetector 是實驗性 API
          const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await barcodeDetector.detect(canvas);
          
          if (barcodes.length > 0) {
            const parsed = parseLineQrCode(barcodes[0].rawValue);
            if (parsed) {
              setScanResult(parsed);
              toast({
                title: '識別成功',
                description: parsed.lineId ? `LINE ID: ${parsed.lineId}` : 'LINE 連結已識別',
              });
              URL.revokeObjectURL(imageUrl);
              return;
            } else {
              setError('圖片中的 QR Code 不是有效的 LINE QR Code');
              URL.revokeObjectURL(imageUrl);
              return;
            }
          }
        } catch (e) {
          console.debug('BarcodeDetector failed, trying fallback:', e);
        }
      }

      // 如果 BarcodeDetector 不可用或失敗，嘗試動態載入 jsQR
      try {
        const jsQR = (await import('jsqr')).default;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          const parsed = parseLineQrCode(code.data);
          if (parsed) {
            setScanResult(parsed);
            toast({
              title: '識別成功',
              description: parsed.lineId ? `LINE ID: ${parsed.lineId}` : 'LINE 連結已識別',
            });
          } else {
            setError('圖片中的 QR Code 不是有效的 LINE QR Code');
          }
        } else {
          setError('圖片中找不到 QR Code');
        }
      } catch (jsQrError) {
        console.error('jsQR error:', jsQrError);
        setError('圖片中找不到 QR Code，請確認圖片包含清晰的 QR Code');
      }

      URL.revokeObjectURL(imageUrl);
    } catch (err: any) {
      console.error('Image scan error:', err);
      setError('無法識別圖片：' + (err.message || '請確認圖片包含清晰的 QR Code'));
    } finally {
      setIsProcessing(false);
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
    setScanResult(null);
    setError(null);
    setCameraError(null);
    setIsProcessing(false);
    onOpenChange(false);
  };

  // Tab 切換時處理
  const handleTabChange = (value: string) => {
    setScanResult(null);
    setError(null);
    setCameraError(null);
    setActiveTab(value as 'camera' | 'upload');
  };

  // 重新掃描
  const handleRescan = () => {
    setScanResult(null);
    setError(null);
    setCameraError(null);
  };

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

          <TabsContent value="camera" className="mt-4">
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
                  <Button variant="outline" className="flex-1" onClick={handleRescan}>
                    重新掃描
                  </Button>
                  <Button className="flex-1" onClick={handleConfirm}>
                    確認使用
                  </Button>
                </div>
              </div>
            ) : cameraError ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <XCircle className="h-12 w-12 text-yellow-600" />
                  <div className="text-center">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">無法存取相機</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {cameraError}
                    </p>
                  </div>
                  <Button onClick={() => setCameraError(null)}>
                    重試
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 相機預覽區域 - 使用新的 Scanner 元件 */}
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-black">
                  {open && activeTab === 'camera' && (
                    <Scanner
                      onScan={handleCameraScan}
                      onError={handleCameraError}
                      formats={['qr_code']}
                      components={{
                        audio: false,
                        torch: false,
                      }}
                      constraints={{
                        facingMode: 'environment',
                      }}
                      styles={{
                        container: {
                          width: '100%',
                          height: '100%',
                        },
                        video: {
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        },
                      }}
                    />
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
                  {isProcessing ? (
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
