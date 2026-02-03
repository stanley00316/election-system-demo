'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  QrCode,
  ImageIcon,
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
 * 
 * @updated 2026-02-04 - 移除相機掃描，僅保留圖片上傳
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
  const [scanResult, setScanResult] = useState<{ lineId?: string; lineUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setIsProcessing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            識別 LINE QR Code
          </DialogTitle>
          <DialogDescription>
            上傳 LINE QR Code 圖片或截圖來識別
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
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => {
                  setScanResult(null);
                  setError(null);
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
