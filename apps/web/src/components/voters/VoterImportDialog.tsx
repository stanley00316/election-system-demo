'use client';

import { useState, useRef, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { votersApi } from '@/lib/api';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Info,
  FileWarning,
  Eye,
  DownloadCloud,
  Check,
  X,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ==================== 型別 ====================

interface VoterImportDialogProps {
  campaignId: string;
  trigger?: React.ReactNode;
}

type ImportErrorType = 'HEADER_ERROR' | 'REQUIRED_FIELD' | 'FORMAT_ERROR' | 'DUPLICATE' | 'SYSTEM_ERROR';

interface ImportError {
  row: number;
  column?: string;
  type: ImportErrorType;
  message: string;
  suggestion?: string;
  currentValue?: string;
  acceptedValues?: string[];
}

interface HeaderValidation {
  valid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  unrecognized: Array<{ column: string; suggestion?: string }>;
  mappedColumns: Record<string, string>;
}

interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  totalRows: number;
  errors: ImportError[];
  headerValidation: HeaderValidation;
}

interface ValidateResult {
  headerValidation: HeaderValidation;
  previewRows: Record<string, string>[];
  totalRows: number;
}

type WizardStep = 'upload' | 'validate' | 'preview' | 'importing' | 'result';

// ==================== 元件 ====================

export function VoterImportDialog({ campaignId, trigger }: VoterImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorFilter, setErrorFilter] = useState<ImportErrorType | 'ALL'>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // --- 驗證 mutation ---
  const validateMutation = useMutation({
    mutationFn: (file: File) => votersApi.validateImport(file, campaignId),
    onSuccess: (data: ValidateResult) => {
      setValidateResult(data);
      setStep('validate');
    },
    onError: (error: any) => {
      setValidateResult({
        headerValidation: {
          valid: false,
          missingRequired: [],
          missingOptional: [],
          unrecognized: [],
          mappedColumns: {},
        },
        previewRows: [],
        totalRows: 0,
      });
      setStep('validate');
    },
  });

  // --- 匯入 mutation ---
  const importMutation = useMutation({
    mutationFn: (file: File) => votersApi.importExcel(file, campaignId),
    onSuccess: (data: ImportResult) => {
      setImportResult(data);
      setStep('result');
      queryClient.invalidateQueries({ queryKey: ['voters'] });
    },
    onError: (error: any) => {
      setImportResult({
        success: 0,
        failed: 1,
        duplicates: 0,
        totalRows: 0,
        errors: [{
          row: 0,
          type: 'SYSTEM_ERROR',
          message: error.message || '匯入失敗，請稍後再試',
          suggestion: '請確認網路連線正常，或聯絡系統管理員。',
        }],
        headerValidation: { valid: false, missingRequired: [], missingOptional: [], unrecognized: [], mappedColumns: {} },
      });
      setStep('result');
    },
  });

  // --- 事件處理 ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidateResult(null);
      setImportResult(null);
    }
  };

  const handleValidate = () => {
    if (selectedFile) {
      validateMutation.mutate(selectedFile);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      setStep('importing');
      importMutation.mutate(selectedFile);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep('upload');
    setSelectedFile(null);
    setValidateResult(null);
    setImportResult(null);
    setErrorFilter('ALL');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setValidateResult(null);
    setImportResult(null);
    setErrorFilter('ALL');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- 範例檔案生成 ---
  const generateSampleData = () => {
    const headers = ['姓名', '電話', 'Email', '地址', '縣市', '區', '里', '政黨', '政治傾向', '年齡', '性別', '職業', '標籤', '備註'];
    const surnames = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊'];
    const maleNames = ['志明', '建宏', '俊傑', '文彬', '家豪'];
    const femaleNames = ['淑芬', '美玲', '雅婷', '怡君', '佳蓉'];
    const stances = ['強力支持', '支持', '傾向支持', '中立', '未表態'];
    const parties = ['國民黨', '民進黨', '民眾黨', '無黨籍', ''];
    const sampleRows: string[][] = [];
    for (let i = 0; i < 500; i++) {
      const isMale = Math.random() > 0.5;
      const name = surnames[Math.floor(Math.random() * surnames.length)] + (isMale ? maleNames : femaleNames)[Math.floor(Math.random() * 5)];
      const phone = `09${Math.floor(Math.random() * 100).toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      sampleRows.push([name, phone, '', '台北市中正區中正路1號', '台北市', '中正區', '光復里', parties[Math.floor(Math.random() * parties.length)], stances[Math.floor(Math.random() * stances.length)], String(25 + Math.floor(Math.random() * 50)), isMale ? '男' : '女', '自由業', '', '']);
    }
    return { headers, sampleRows };
  };

  const handleDownloadTemplateCsv = () => {
    const { headers, sampleRows } = generateSampleData();
    const csvContent = [headers.join(','), ...sampleRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = '選民匯入範例.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplateExcel = async () => {
    const XLSX = await import('xlsx');
    const { headers, sampleRows } = generateSampleData();
    const data = sampleRows.map(row => { const obj: Record<string, string> = {}; headers.forEach((h, i) => { obj[h] = row[i]; }); return obj; });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = headers.map(h => ({ wch: h === '地址' ? 30 : h === 'Email' ? 22 : 10 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '選民匯入範例');
    XLSX.writeFile(wb, '選民匯入範例.xlsx');
  };

  const handleDownloadErrorReport = async () => {
    if (!importResult) return;
    const XLSX = await import('xlsx');
    const rows = importResult.errors.map(e => ({
      '行號': e.row > 0 ? e.row : '-',
      '欄位': e.column || '-',
      '類型': errorTypeLabel(e.type),
      '錯誤訊息': e.message,
      '修正建議': e.suggestion || '',
      '目前值': e.currentValue || '',
      '可接受值': e.acceptedValues?.join('、') || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 15 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '匯入錯誤報告');
    XLSX.writeFile(wb, `匯入錯誤報告_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- 計算 ---
  const filteredErrors = useMemo(() => {
    if (!importResult) return [];
    if (errorFilter === 'ALL') return importResult.errors;
    return importResult.errors.filter(e => e.type === errorFilter);
  }, [importResult, errorFilter]);

  const errorCounts = useMemo(() => {
    if (!importResult) return {} as Record<string, number>;
    const counts: Record<string, number> = { ALL: importResult.errors.length };
    for (const e of importResult.errors) {
      counts[e.type] = (counts[e.type] || 0) + 1;
    }
    return counts;
  }, [importResult]);

  // --- 步驟指示器 ---
  const steps: { key: WizardStep; label: string }[] = [
    { key: 'upload', label: '選擇檔案' },
    { key: 'validate', label: '欄位驗證' },
    { key: 'preview', label: '資料預覽' },
    { key: 'importing', label: '匯入中' },
    { key: 'result', label: '匯入結果' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            匯入
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>匯入選民資料</DialogTitle>
          <DialogDescription>
            上傳 Excel 或 CSV 檔案批次匯入選民資料
          </DialogDescription>
        </DialogHeader>

        {/* 步驟指示器 */}
        <div className="flex items-center gap-1 px-1 mb-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 ${
                i < currentStepIndex ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                i === currentStepIndex ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {i < currentStepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block truncate ${i === currentStepIndex ? 'font-medium' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 ml-auto" />
              )}
            </div>
          ))}
        </div>

        {/* 步驟內容 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* ===== Step 1: 選擇檔案 ===== */}
          {step === 'upload' && (
            <div className="space-y-4 py-2">
              {/* 匯入說明 */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-blue-800 dark:text-blue-200">匯入注意事項</p>
                    <ul className="text-blue-700 dark:text-blue-300 text-xs space-y-0.5 list-disc list-inside">
                      <li>檔案第一列必須為<strong>欄位標題</strong>（如：姓名、電話、地址等）</li>
                      <li>「<strong>姓名</strong>」為唯一必填欄位，其他欄位皆為選填</li>
                      <li>欄位<strong>順序不限</strong>，系統會自動辨識標題名稱</li>
                      <li>電話重複的資料會自動跳過，不會覆蓋現有記錄</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 下載範例 */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">下載範例檔案</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      下載範例
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadTemplateExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel 格式 (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadTemplateCsv}>
                      <FileText className="h-4 w-4 mr-2" />
                      CSV 格式 (.csv)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* 檔案選擇區 */}
              <div className="border-2 border-dashed rounded-lg p-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  {selectedFile ? (
                    <div className="text-center">
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(selectedFile.size / 1024).toFixed(1)} KB — 點擊更換檔案
                      </p>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium">點擊選擇檔案</span>
                      <span className="text-xs text-muted-foreground mt-1">支援 .xlsx, .xls, .csv 格式（最大 10MB）</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* ===== Step 2: 欄位驗證 ===== */}
          {step === 'validate' && validateResult && (
            <div className="space-y-4 py-2">
              {/* 驗證結果摘要 */}
              <div className={`rounded-lg border p-3 ${
                validateResult.headerValidation.valid
                  ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
                  : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
              }`}>
                <div className="flex items-center gap-2">
                  {validateResult.headerValidation.valid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium text-sm">
                    {validateResult.headerValidation.valid
                      ? `欄位驗證通過！共偵測到 ${validateResult.totalRows} 列資料`
                      : '欄位驗證未通過，請修正後重新上傳'}
                  </span>
                </div>
              </div>

              {/* 欄位對應表 */}
              <div>
                <h4 className="text-sm font-medium mb-2">欄位對應結果</h4>
                <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                  {/* 已對應欄位 */}
                  {Object.entries(validateResult.headerValidation.mappedColumns).map(([raw, system]) => (
                    <div key={raw} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="text-muted-foreground">{raw}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium">{system}</span>
                      {['姓名'].includes(system) && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 ml-1">必填</Badge>
                      )}
                    </div>
                  ))}
                  {/* 缺少的必要欄位 */}
                  {validateResult.headerValidation.missingRequired.map(col => (
                    <div key={col} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-950">
                      <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                      <span className="text-red-700 dark:text-red-300 font-medium">缺少必要欄位：{col}</span>
                      <Badge variant="destructive" className="text-[10px] px-1 py-0 ml-1">必填</Badge>
                    </div>
                  ))}
                  {/* 未辨識欄位 */}
                  {validateResult.headerValidation.unrecognized.map(u => (
                    <div key={u.column} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-50 dark:bg-amber-950">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-amber-700 dark:text-amber-300">
                        「{u.column}」無法辨識
                        {u.suggestion && <span className="ml-1">→ 您是否是指「<strong>{u.suggestion}</strong>」？</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 缺少的可選欄位提示 */}
              {validateResult.headerValidation.missingOptional.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-3">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      <p className="font-medium mb-1">以下可選欄位未在檔案中偵測到：</p>
                      <p>{validateResult.headerValidation.missingOptional.join('、')}</p>
                      <p className="mt-1 text-amber-600">這些欄位非必填，您仍可繼續匯入。</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== Step 3: 資料預覽 ===== */}
          {step === 'preview' && validateResult && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span>以下為前 {validateResult.previewRows.length} 列資料預覽（共 {validateResult.totalRows} 列）</span>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-max text-xs border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border-b border-r px-2 py-1.5 text-left font-medium text-muted-foreground">#</th>
                      {validateResult.previewRows.length > 0 &&
                        Object.keys(validateResult.previewRows[0]).map(col => (
                          <th key={col} className="border-b border-r px-2 py-1.5 text-left font-medium">{col}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validateResult.previewRows.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/50">
                        <td className="border-b border-r px-2 py-1 text-muted-foreground">{i + 2}</td>
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="border-b border-r px-2 py-1 max-w-[200px] truncate">
                            {val || <span className="text-muted-foreground italic">空白</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">↔ 可左右滑動查看完整欄位</p>
            </div>
          )}

          {/* ===== Step 4: 匯入中 ===== */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-1">
                <p className="font-medium">正在匯入資料中...</p>
                <p className="text-sm text-muted-foreground">系統正在處理您的檔案，請勿關閉此視窗</p>
                {validateResult && (
                  <p className="text-xs text-muted-foreground">預計處理 {validateResult.totalRows} 列資料</p>
                )}
              </div>
            </div>
          )}

          {/* ===== Step 5: 匯入結果 ===== */}
          {step === 'result' && importResult && (
            <div className="space-y-4 py-2">
              {/* 統計摘要 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-green-50 dark:bg-green-950 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-2xl font-bold">{importResult.success}</span>
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300 mt-1">成功匯入</div>
                </div>
                <div className="rounded-lg border bg-amber-50 dark:bg-amber-950 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-2xl font-bold">{importResult.duplicates}</span>
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">重複跳過</div>
                </div>
                <div className="rounded-lg border bg-red-50 dark:bg-red-950 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="text-2xl font-bold">{importResult.failed}</span>
                  </div>
                  <div className="text-xs text-red-700 dark:text-red-300 mt-1">匯入失敗</div>
                </div>
              </div>

              {/* 錯誤詳情 */}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">錯誤與警告詳情</h4>
                    <Button variant="outline" size="sm" onClick={handleDownloadErrorReport}>
                      <DownloadCloud className="h-3.5 w-3.5 mr-1.5" />
                      下載錯誤報告
                    </Button>
                  </div>

                  {/* 分類篩選 */}
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      ['ALL', '全部'],
                      ['HEADER_ERROR', '欄位問題'],
                      ['REQUIRED_FIELD', '必填遺漏'],
                      ['FORMAT_ERROR', '格式錯誤'],
                      ['DUPLICATE', '資料重複'],
                      ['SYSTEM_ERROR', '系統錯誤'],
                    ] as [ImportErrorType | 'ALL', string][]).map(([key, label]) => {
                      const count = errorCounts[key] || 0;
                      if (key !== 'ALL' && count === 0) return null;
                      return (
                        <button
                          key={key}
                          onClick={() => setErrorFilter(key)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                            errorFilter === key
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {label}
                          <span className="opacity-70">({count})</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 錯誤列表 */}
                  <ScrollArea className="h-48 rounded-lg border">
                    <div className="divide-y">
                      {filteredErrors.map((error, idx) => (
                        <div key={idx} className="px-3 py-2 text-sm space-y-1">
                          <div className="flex items-start gap-2">
                            {error.type === 'HEADER_ERROR' && <FileWarning className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                            {error.type === 'REQUIRED_FIELD' && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                            {error.type === 'FORMAT_ERROR' && <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />}
                            {error.type === 'DUPLICATE' && <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                            {error.type === 'SYSTEM_ERROR' && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {error.row > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">第 {error.row} 列</Badge>
                                )}
                                {error.column && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">{error.column}</Badge>
                                )}
                                <span>{error.message}</span>
                              </div>
                              {error.suggestion && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  💡 {error.suggestion}
                                </p>
                              )}
                              {error.acceptedValues && error.acceptedValues.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  可接受值：{error.acceptedValues.join('、')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* 全部成功提示 */}
              {importResult.errors.length === 0 && importResult.success > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800 dark:text-green-200">全部資料匯入成功！</p>
                  <p className="text-sm text-green-600 mt-1">共匯入 {importResult.success} 筆選民資料</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2">
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>取消</Button>
              <Button
                onClick={handleValidate}
                disabled={!selectedFile || validateMutation.isPending}
              >
                {validateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />驗證中...</>
                ) : (
                  <>下一步：驗證欄位 <ChevronRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </>
          )}

          {step === 'validate' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ChevronLeft className="h-4 w-4 mr-1" />上一步
              </Button>
              <Button
                onClick={() => setStep('preview')}
                disabled={!validateResult?.headerValidation.valid}
              >
                下一步：預覽資料 <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('validate')}>
                <ChevronLeft className="h-4 w-4 mr-1" />上一步
              </Button>
              <Button onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />
                確認匯入 {validateResult?.totalRows} 筆資料
              </Button>
            </>
          )}

          {step === 'importing' && (
            <Button variant="outline" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              匯入處理中...
            </Button>
          )}

          {step === 'result' && (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                重新匯入
              </Button>
              <Button onClick={handleClose}>
                完成
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 輔助函數 ====================

function errorTypeLabel(type: ImportErrorType): string {
  const map: Record<ImportErrorType, string> = {
    HEADER_ERROR: '欄位問題',
    REQUIRED_FIELD: '必填遺漏',
    FORMAT_ERROR: '格式錯誤',
    DUPLICATE: '資料重複',
    SYSTEM_ERROR: '系統錯誤',
  };
  return map[type] || type;
}
