'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  QrCode,
  ImageIcon,
  Camera,
  CameraOff,
} from 'lucide-react';

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

// 檢查瀏覽器是否支援相機
function checkCameraSupport(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

export function LineQrScanner({ open, onOpenChange, onScan }: LineQrScannerProps) {
  const { toast } = useToast();
  
  // 共用狀態
  const [scanResult, setScanResult] = useState<{ lineId?: string; lineUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('camera');
  
  // 相機相關狀態
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // 手動輸入 LINE ID（當 QR Code 不包含 LINE ID 時）
  const [manualLineId, setManualLineId] = useState('');
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const jsQRRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // 檢查相機支援
  useEffect(() => {
    setCameraSupported(checkCameraSupport());
    if (!checkCameraSupport()) {
      setActiveTab('image');
    }
  }, []);

  // 載入 jsQR
  useEffect(() => {
    import('jsqr').then((module) => {
      jsQRRef.current = module.default;
    }).catch((err) => {
      console.error('Failed to load jsQR:', err);
    });
  }, []);

  // 停止相機
  const stopCamera = useCallback(() => {
    // 停止動畫幀
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // 停止所有媒體軌道
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // 清理 video 元素
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraActive(false);
  }, []);

  // 掃描幀
  const scanFrame = useCallback(() => {
    if (!mountedRef.current || !videoRef.current || !canvasRef.current || !jsQRRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    // 設定 canvas 大小
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // 繪製視訊幀到 canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 獲取圖片資料並掃描
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQRRef.current(imageData.data, imageData.width, imageData.height);
    
    if (code) {
      const parsed = parseLineQrCode(code.data);
      if (parsed) {
        // 找到有效的 LINE QR Code
        stopCamera();
        setScanResult(parsed);
        toast({
          title: '掃描成功',
          description: parsed.lineId ? `LINE ID: ${parsed.lineId}` : 'LINE 連結已識別',
        });
        return;
      }
    }
    
    // 繼續掃描
    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera, toast]);

  // 啟動相機
  const startCamera = useCallback(async () => {
    if (!cameraSupported || !mountedRef.current) return;
    
    setCameraError(null);
    setError(null);
    
    try {
      // 取得相機串流
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // 優先使用後置鏡頭
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
        
        // 開始掃描
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      
      let errorMessage = '無法存取相機';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = '請允許存取相機權限';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = '找不到相機裝置';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = '相機正在被其他應用程式使用';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = '相機不支援所需的設定';
      }
      
      setCameraError(errorMessage);
      setIsCameraActive(false);
    }
  }, [cameraSupported, scanFrame]);

  // 處理 Tab 切換
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    setError(null);
    setCameraError(null);
    
    if (value === 'camera') {
      // 切換到相機 Tab 時啟動相機
      if (!scanResult) {
        startCamera();
      }
    } else {
      // 切換到圖片 Tab 時停止相機
      stopCamera();
    }
  }, [startCamera, stopCamera, scanResult]);

  // Dialog 開啟/關閉時的處理
  useEffect(() => {
    mountedRef.current = true;
    
    if (open && activeTab === 'camera' && cameraSupported && !scanResult) {
      // 延遲啟動相機，確保 DOM 已準備好
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      return () => clearTimeout(timer);
    } else if (!open) {
      stopCamera();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [open, activeTab, cameraSupported, scanResult, startCamera, stopCamera]);

  // 清理
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  // 處理圖片上傳
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setScanResult(null);
    setIsProcessing(true);

    try {
      const imageUrl = URL.createObjectURL(file);
      const img = new Image();
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('無法載入圖片'));
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('無法建立 Canvas');
      ctx.drawImage(img, 0, 0);

      // 嘗試使用 BarcodeDetector API
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
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

      // 使用 jsQR 作為後備
      if (jsQRRef.current) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQRRef.current(imageData.data, imageData.width, imageData.height);
        
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
      } else {
        // 動態載入 jsQR
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
      onScan({
        lineId: scanResult.lineId || manualLineId || undefined,
        lineUrl: scanResult.lineUrl,
      });
      handleClose();
    }
  };

  // 關閉對話框
  const handleClose = () => {
    stopCamera();
    setScanResult(null);
    setError(null);
    setCameraError(null);
    setIsProcessing(false);
    setManualLineId('');
    onOpenChange(false);
  };

  // 重新掃描
  const handleRetry = () => {
    setScanResult(null);
    setError(null);
    setCameraError(null);
    setManualLineId('');
    if (activeTab === 'camera') {
      startCamera();
    }
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
            使用相機掃描或上傳圖片來識別 LINE QR Code
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
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
              
              {/* 手動輸入 LINE ID（當 QR Code 不包含 LINE ID 時） */}
              {!scanResult.lineId && (
                <div className="space-y-2">
                  <Label htmlFor="manualLineId">LINE ID（選填）</Label>
                  <Input
                    id="manualLineId"
                    placeholder="請輸入對方的 LINE ID"
                    value={manualLineId}
                    onChange={(e) => setManualLineId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    此 QR Code 連結不包含 LINE ID，如需記錄請手動輸入
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleRetry}>
                  重新掃描
                </Button>
                <Button className="flex-1" onClick={handleConfirm}>
                  確認使用
                </Button>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2">
                {cameraSupported && (
                  <TabsTrigger value="camera" className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    相機掃描
                  </TabsTrigger>
                )}
                <TabsTrigger value="image" className={`flex items-center gap-2 ${!cameraSupported ? 'col-span-2' : ''}`}>
                  <ImageIcon className="h-4 w-4" />
                  上傳圖片
                </TabsTrigger>
              </TabsList>

              {/* 相機掃描 Tab */}
              {cameraSupported && (
                <TabsContent value="camera" className="mt-4">
                  <div className="space-y-4">
                    {/* 相機預覽區域 */}
                    <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover"
                        playsInline
                        muted
                      />
                      <canvas
                        ref={canvasRef}
                        className="hidden"
                      />
                      
                      {/* 掃描框覆蓋層 */}
                      {isCameraActive && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-48 border-2 border-white/70 rounded-lg relative">
                            {/* 四角標記 */}
                            <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl" />
                            <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr" />
                            <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br" />
                          </div>
                        </div>
                      )}
                      
                      {/* 載入中狀態 */}
                      {!isCameraActive && !cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                          <Loader2 className="h-8 w-8 animate-spin mb-2" />
                          <p className="text-sm">正在啟動相機...</p>
                        </div>
                      )}
                      
                      {/* 相機錯誤 */}
                      {cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                          <CameraOff className="h-12 w-12 mb-3 text-red-400" />
                          <p className="text-sm text-center mb-3">{cameraError}</p>
                          <Button size="sm" variant="secondary" onClick={startCamera}>
                            重試
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* 掃描提示 */}
                    <p className="text-sm text-muted-foreground text-center">
                      將 LINE QR Code 對準框框內進行掃描
                    </p>
                  </div>
                </TabsContent>
              )}

              {/* 上傳圖片 Tab */}
              <TabsContent value="image" className="mt-4">
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isProcessing ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">正在識別 QR Code...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                          <Upload className="h-5 w-5 text-primary absolute -bottom-1 -right-1" />
                        </div>
                        <div>
                          <p className="font-medium">點擊選擇圖片</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            支援 LINE QR Code 截圖或照片
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

                  {/* 使用提示 */}
                  <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">如何取得 LINE QR Code：</p>
                    <ol className="list-decimal list-inside space-y-0.5 ml-1">
                      <li>請選民開啟 LINE App 的個人 QR Code</li>
                      <li>截圖或拍照保存</li>
                      <li>在此上傳該圖片</li>
                    </ol>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
