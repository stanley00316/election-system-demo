'use client';

import { useState, useRef } from 'react';
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
import { votersApi } from '@/lib/api';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface VoterImportDialogProps {
  campaignId: string;
  trigger?: React.ReactNode;
}

interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: Array<{ row: number; message: string }>;
}

export function VoterImportDialog({ campaignId, trigger }: VoterImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (file: File) => votersApi.importExcel(file, campaignId),
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ['voters'] });
    },
    onError: (error: any) => {
      setImportResult({
        success: 0,
        failed: 1,
        duplicates: 0,
        errors: [{ row: 0, message: error.message || '匯入失敗' }],
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleDownloadTemplate = () => {
    // 建立 500+ 筆範例資料
    const headers = ['姓名', '電話', 'Email', '地址', '縣市', '區', '里', '政黨', '政治傾向', '年齡', '性別', '職業', '標籤', '備註'];
    
    // 姓氏庫
    const surnames = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪', '邱', '曾', '廖', '賴', '徐', '周', '葉', '蘇', '莊', '江', '呂', '何', '羅', '高', '蕭', '潘', '朱', '簡', '鍾', '彭', '游', '詹', '胡', '施', '沈', '余', '趙', '盧', '梁', '顏', '柯', '翁', '魏', '孫', '戴'];
    // 名字庫
    const maleNames = ['志明', '建宏', '俊傑', '文彬', '家豪', '宗翰', '冠宇', '柏翰', '彥廷', '宇軒', '承翰', '冠廷', '柏均', '彥宏', '建志', '明宏', '志豪', '俊宏', '家銘', '宗憲', '冠霖', '柏宏', '彥均', '宇翔', '承恩', '冠霖', '柏毅', '彥志', '建華', '明志', '志偉', '俊廷', '家維', '宗翔', '冠穎', '柏勳', '彥廷', '宇恆', '承軒', '冠佑'];
    const femaleNames = ['淑芬', '美玲', '雅婷', '怡君', '佳蓉', '宜珊', '欣怡', '雅琪', '佩君', '惠如', '雅惠', '淑娟', '美華', '怡萱', '佳慧', '宜芳', '欣蓉', '雅玲', '佩珊', '惠雯', '雅芳', '淑貞', '美君', '怡婷', '佳琪', '宜蓁', '欣儀', '雅雯', '佩怡', '惠芬', '雅如', '淑惠', '美雯', '怡伶', '佳玲', '宜君', '欣穎', '雅萍', '佩蓉', '惠婷'];
    // 區域資料
    const districts = [
      { city: '台北市', district: '中正區', villages: ['光復里', '南門里', '龍光里', '建國里', '愛國里', '梅花里', '東門里', '文北里', '幸福里', '三愛里'] },
      { city: '台北市', district: '大同區', villages: ['大有里', '民權里', '延平里', '建功里', '光能里', '蓬萊里', '國順里', '保安里', '朝陽里', '揚雅里'] },
      { city: '台北市', district: '中山區', villages: ['中山里', '正義里', '大直里', '劍潭里', '圓山里', '松江里', '新生里', '民安里', '復華里', '行政里'] },
      { city: '台北市', district: '松山區', villages: ['民有里', '民福里', '復建里', '中華里', '中崙里', '敦化里', '三民里', '新東里', '精忠里', '東昌里'] },
      { city: '台北市', district: '大安區', villages: ['仁愛里', '敦安里', '光武里', '龍安里', '新龍里', '錦安里', '住安里', '法治里', '通化里', '臨江里'] },
      { city: '台北市', district: '萬華區', villages: ['福星里', '萬壽里', '西門里', '新起里', '青山里', '柳鄉里', '華江里', '綠堤里', '忠貞里', '日善里'] },
      { city: '台北市', district: '信義區', villages: ['三張里', '六藝里', '中興里', '興雅里', '黎忠里', '黎平里', '永吉里', '景勤里', '惠安里', '安康里'] },
      { city: '台北市', district: '士林區', villages: ['福林里', '芝山里', '名山里', '蘭雅里', '德行里', '天母里', '三玉里', '公館里', '社子里', '富光里'] },
      { city: '台北市', district: '北投區', villages: ['中央里', '長安里', '大同里', '吉利里', '立農里', '東華里', '榮光里', '永和里', '石牌里', '振華里'] },
      { city: '台北市', district: '內湖區', villages: ['湖興里', '內湖里', '西湖里', '港墘里', '瑞光里', '紫陽里', '清白里', '週美里', '金龍里', '碧山里'] },
      { city: '台北市', district: '南港區', villages: ['三重里', '萬福里', '新光里', '聯成里', '鴻福里', '南港里', '成福里', '玉成里', '中研里', '舊莊里'] },
      { city: '台北市', district: '文山區', villages: ['萬盛里', '興豐里', '興光里', '明興里', '木柵里', '木新里', '景美里', '萬年里', '指南里', '政大里'] },
    ];
    // 路名
    const roads = ['中正路', '民生路', '忠孝路', '仁愛路', '信義路', '和平路', '復興路', '建國路', '敦化路', '光復路', '松江路', '南京東路', '八德路', '市民大道', '基隆路', '羅斯福路', '新生南路', '金山南路', '中山北路', '承德路'];
    // 政黨
    const parties = ['國民黨', '民進黨', '民眾黨', '時代力量', '台灣基進', '無黨籍', '', '', ''];
    // 政治傾向
    const stances = ['強力支持', '支持', '傾向支持', '中立', '未表態', '傾向反對', '反對', '中立', '未表態', '支持'];
    // 職業
    const occupations = ['企業主', '教師', '工程師', '醫師', '護理師', '公務員', '退休', '家管', '商人', '律師', '會計師', '業務員', '技師', '司機', '廚師', '美髮師', '服務業', '金融業', '科技業', '製造業', '建築業', '農漁業', '自由業', '學生', '軍警'];
    // 標籤
    const tags = ['里長推薦', '商會成員', '教育界', '家長會', '社區發展協會', '宮廟', '志工團', '青年會', '婦女會', '長青會', '校友會', '同鄉會', '獅子會', '扶輪社', '專業人士', '地方仕紳', '意見領袖', '社區熱心', '環保志工', '文化協會'];
    
    // 生成 500 筆資料
    const sampleRows: string[][] = [];
    for (let i = 0; i < 500; i++) {
      const isMale = Math.random() > 0.5;
      const surname = surnames[Math.floor(Math.random() * surnames.length)];
      const firstName = isMale 
        ? maleNames[Math.floor(Math.random() * maleNames.length)]
        : femaleNames[Math.floor(Math.random() * femaleNames.length)];
      const name = surname + firstName;
      
      const phone = `09${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      const hasEmail = Math.random() > 0.3;
      const emailProviders = ['gmail.com', 'yahoo.com.tw', 'hotmail.com', 'outlook.com', 'pchome.com.tw'];
      const email = hasEmail ? `${surname.toLowerCase()}${firstName.toLowerCase()}${Math.floor(Math.random() * 100)}@${emailProviders[Math.floor(Math.random() * emailProviders.length)]}` : '';
      
      const location = districts[Math.floor(Math.random() * districts.length)];
      const village = location.villages[Math.floor(Math.random() * location.villages.length)];
      const road = roads[Math.floor(Math.random() * roads.length)];
      const number = Math.floor(Math.random() * 300) + 1;
      const hasFloor = Math.random() > 0.5;
      const floor = hasFloor ? `${Math.floor(Math.random() * 15) + 1}樓` : '';
      const address = `${location.city}${location.district}${road}${number}號${floor}`;
      
      const party = parties[Math.floor(Math.random() * parties.length)];
      const stance = stances[Math.floor(Math.random() * stances.length)];
      const age = String(Math.floor(Math.random() * 50) + 25);
      const gender = isMale ? '男' : '女';
      const occupation = occupations[Math.floor(Math.random() * occupations.length)];
      
      const numTags = Math.floor(Math.random() * 3);
      const selectedTags: string[] = [];
      for (let j = 0; j < numTags; j++) {
        const tag = tags[Math.floor(Math.random() * tags.length)];
        if (!selectedTags.includes(tag)) selectedTags.push(tag);
      }
      const tagStr = selectedTags.join(',');
      
      const notes = ['', '', '', '熱心公益', '社區活躍', '有影響力', '需追蹤', '老客戶', '新認識'][Math.floor(Math.random() * 9)];
      
      sampleRows.push([name, phone, email, address, location.city, location.district, village, party, stance, age, gender, occupation, tagStr, notes]);
    }

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // 添加 BOM 以支援 Excel 正確顯示中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '選民匯入範例.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
      <DialogContent className="sm:max-w-[500px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>匯入選民資料</DialogTitle>
          <DialogDescription>
            上傳 Excel 或 CSV 檔案批次匯入選民資料
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-hidden">
          {/* 範例資料表格 */}
          <div className="bg-muted/50 rounded-lg p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                範例資料格式（預覽）
              </h4>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                下載 500 筆範例
              </Button>
            </div>
            <div className="overflow-x-auto max-h-52 -mx-4 px-4">
              <table className="min-w-max text-xs border-collapse whitespace-nowrap">
                <thead className="sticky top-0">
                  <tr className="bg-muted">
                    <th className="border border-border px-2 py-1 text-left font-medium">姓名<span className="text-destructive">*</span></th>
                    <th className="border border-border px-2 py-1 text-left font-medium">電話</th>
                    <th className="border border-border px-2 py-1 text-left font-medium">Email</th>
                    <th className="border border-border px-2 py-1 text-left font-medium">地址</th>
                    <th className="border border-border px-2 py-1 text-left font-medium">縣市</th>
                    <th className="border border-border px-2 py-1 text-left font-medium">區</th>
                    <th className="border border-border px-2 py-1 text-left font-medium">里</th>
                    <th className="border border-border px-2 py-1 text-left font-medium">政黨</th>
                    <th className="border border-border px-2 py-1 text-left font-medium">政治傾向</th>
                    <th className="border border-border px-2 py-1 text-left font-medium">年齡</th>
                    <th className="border border-border px-2 py-1 text-left font-medium">性別</th>
                    <th className="border border-border px-2 py-1 text-left font-medium">職業</th>
                    <th className="border border-border px-2 py-1 text-left font-medium">標籤</th>
                    <th className="border border-border px-2 py-1 text-left font-medium">備註</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-2 py-1">陳志明</td>
                    <td className="border border-border px-2 py-1">0912-345-678</td>
                    <td className="border border-border px-2 py-1">chen.cm@gmail.com</td>
                    <td className="border border-border px-2 py-1">台北市信義區松仁路100號12樓</td>
                    <td className="border border-border px-2 py-1">台北市</td>
                    <td className="border border-border px-2 py-1">信義區</td>
                    <td className="border border-border px-2 py-1">三張里</td>
                    <td className="border border-border px-2 py-1">無黨籍</td>
                    <td className="border border-border px-2 py-1">強力支持</td>
                    <td className="border border-border px-2 py-1">52</td>
                    <td className="border border-border px-2 py-1">男</td>
                    <td className="border border-border px-2 py-1">企業主</td>
                    <td className="border border-border px-2 py-1">里長推薦,商會成員</td>
                    <td className="border border-border px-2 py-1">商圈理事長</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1">林淑芬</td>
                    <td className="border border-border px-2 py-1">0923-456-789</td>
                    <td className="border border-border px-2 py-1">lin.sf@yahoo.com.tw</td>
                    <td className="border border-border px-2 py-1">台北市大安區忠孝東路四段250號</td>
                    <td className="border border-border px-2 py-1">台北市</td>
                    <td className="border border-border px-2 py-1">大安區</td>
                    <td className="border border-border px-2 py-1">仁愛里</td>
                    <td className="border border-border px-2 py-1">民進黨</td>
                    <td className="border border-border px-2 py-1">支持</td>
                    <td className="border border-border px-2 py-1">45</td>
                    <td className="border border-border px-2 py-1">女</td>
                    <td className="border border-border px-2 py-1">教師</td>
                    <td className="border border-border px-2 py-1">教育界,家長會</td>
                    <td className="border border-border px-2 py-1">家長會長</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1">王建國</td>
                    <td className="border border-border px-2 py-1">0934-567-890</td>
                    <td className="border border-border px-2 py-1">wang.jg@hotmail.com</td>
                    <td className="border border-border px-2 py-1">台北市松山區南京東路五段123巷45號</td>
                    <td className="border border-border px-2 py-1">台北市</td>
                    <td className="border border-border px-2 py-1">松山區</td>
                    <td className="border border-border px-2 py-1">民有里</td>
                    <td className="border border-border px-2 py-1">國民黨</td>
                    <td className="border border-border px-2 py-1">中立</td>
                    <td className="border border-border px-2 py-1">68</td>
                    <td className="border border-border px-2 py-1">男</td>
                    <td className="border border-border px-2 py-1">退休</td>
                    <td className="border border-border px-2 py-1">社區發展協會</td>
                    <td className="border border-border px-2 py-1">前里長</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1">張美華</td>
                    <td className="border border-border px-2 py-1">0956-789-012</td>
                    <td className="border border-border px-2 py-1">chang.mh@gmail.com</td>
                    <td className="border border-border px-2 py-1">台北市中山區民生東路三段88號5樓</td>
                    <td className="border border-border px-2 py-1">台北市</td>
                    <td className="border border-border px-2 py-1">中山區</td>
                    <td className="border border-border px-2 py-1">中山里</td>
                    <td className="border border-border px-2 py-1">民眾黨</td>
                    <td className="border border-border px-2 py-1">傾向支持</td>
                    <td className="border border-border px-2 py-1">38</td>
                    <td className="border border-border px-2 py-1">女</td>
                    <td className="border border-border px-2 py-1">會計師</td>
                    <td className="border border-border px-2 py-1">專業人士</td>
                    <td className="border border-border px-2 py-1">管委會委員</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1">劉文正</td>
                    <td className="border border-border px-2 py-1">0978-901-234</td>
                    <td className="border border-border px-2 py-1"></td>
                    <td className="border border-border px-2 py-1">台北市內湖區成功路四段167號</td>
                    <td className="border border-border px-2 py-1">台北市</td>
                    <td className="border border-border px-2 py-1">內湖區</td>
                    <td className="border border-border px-2 py-1">湖興里</td>
                    <td className="border border-border px-2 py-1"></td>
                    <td className="border border-border px-2 py-1">未表態</td>
                    <td className="border border-border px-2 py-1">55</td>
                    <td className="border border-border px-2 py-1">男</td>
                    <td className="border border-border px-2 py-1">科技業</td>
                    <td className="border border-border px-2 py-1">科技園區</td>
                    <td className="border border-border px-2 py-1">企業主管</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1">黃麗珍</td>
                    <td className="border border-border px-2 py-1">0911-222-333</td>
                    <td className="border border-border px-2 py-1">huang.lc@pchome.com.tw</td>
                    <td className="border border-border px-2 py-1">台北市萬華區西園路二段50號</td>
                    <td className="border border-border px-2 py-1">台北市</td>
                    <td className="border border-border px-2 py-1">萬華區</td>
                    <td className="border border-border px-2 py-1">福星里</td>
                    <td className="border border-border px-2 py-1">民進黨</td>
                    <td className="border border-border px-2 py-1">強力支持</td>
                    <td className="border border-border px-2 py-1">62</td>
                    <td className="border border-border px-2 py-1">女</td>
                    <td className="border border-border px-2 py-1">家管</td>
                    <td className="border border-border px-2 py-1">宮廟,婦女會</td>
                    <td className="border border-border px-2 py-1">里長太太</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1">吳俊傑</td>
                    <td className="border border-border px-2 py-1">0922-333-444</td>
                    <td className="border border-border px-2 py-1">wu.jj@outlook.com</td>
                    <td className="border border-border px-2 py-1">台北市士林區中正路200號3樓</td>
                    <td className="border border-border px-2 py-1">台北市</td>
                    <td className="border border-border px-2 py-1">士林區</td>
                    <td className="border border-border px-2 py-1">福林里</td>
                    <td className="border border-border px-2 py-1">國民黨</td>
                    <td className="border border-border px-2 py-1">傾向支持</td>
                    <td className="border border-border px-2 py-1">41</td>
                    <td className="border border-border px-2 py-1">男</td>
                    <td className="border border-border px-2 py-1">醫師</td>
                    <td className="border border-border px-2 py-1">專業人士,獅子會</td>
                    <td className="border border-border px-2 py-1">診所院長</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1">蔡雅婷</td>
                    <td className="border border-border px-2 py-1">0933-444-555</td>
                    <td className="border border-border px-2 py-1">tsai.yt@gmail.com</td>
                    <td className="border border-border px-2 py-1">台北市北投區石牌路一段80號</td>
                    <td className="border border-border px-2 py-1">台北市</td>
                    <td className="border border-border px-2 py-1">北投區</td>
                    <td className="border border-border px-2 py-1">石牌里</td>
                    <td className="border border-border px-2 py-1">無黨籍</td>
                    <td className="border border-border px-2 py-1">支持</td>
                    <td className="border border-border px-2 py-1">29</td>
                    <td className="border border-border px-2 py-1">女</td>
                    <td className="border border-border px-2 py-1">護理師</td>
                    <td className="border border-border px-2 py-1">青年會,志工團</td>
                    <td className="border border-border px-2 py-1">熱心公益</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1">許家豪</td>
                    <td className="border border-border px-2 py-1">0955-666-777</td>
                    <td className="border border-border px-2 py-1"></td>
                    <td className="border border-border px-2 py-1">台北市南港區研究院路三段100號</td>
                    <td className="border border-border px-2 py-1">台北市</td>
                    <td className="border border-border px-2 py-1">南港區</td>
                    <td className="border border-border px-2 py-1">中研里</td>
                    <td className="border border-border px-2 py-1">民眾黨</td>
                    <td className="border border-border px-2 py-1">中立</td>
                    <td className="border border-border px-2 py-1">35</td>
                    <td className="border border-border px-2 py-1">男</td>
                    <td className="border border-border px-2 py-1">工程師</td>
                    <td className="border border-border px-2 py-1">科技園區,青年</td>
                    <td className="border border-border px-2 py-1">新認識</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1">鄭秀英</td>
                    <td className="border border-border px-2 py-1">0966-777-888</td>
                    <td className="border border-border px-2 py-1">cheng.sy@yahoo.com.tw</td>
                    <td className="border border-border px-2 py-1">台北市文山區木柵路三段150號</td>
                    <td className="border border-border px-2 py-1">台北市</td>
                    <td className="border border-border px-2 py-1">文山區</td>
                    <td className="border border-border px-2 py-1">木柵里</td>
                    <td className="border border-border px-2 py-1">民進黨</td>
                    <td className="border border-border px-2 py-1">支持</td>
                    <td className="border border-border px-2 py-1">58</td>
                    <td className="border border-border px-2 py-1">女</td>
                    <td className="border border-border px-2 py-1">商人</td>
                    <td className="border border-border px-2 py-1">商會成員,同鄉會</td>
                    <td className="border border-border px-2 py-1">市場攤商</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ↔ 可左右滑動查看完整欄位 | 顯示前 10 筆，下載範例包含 <span className="font-semibold text-primary">500 筆</span> 完整資料
            </p>
          </div>

          {/* 選項說明 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-1">政治傾向：</h4>
              <p className="text-muted-foreground text-xs">
                強力支持、支持、傾向支持、中立、未表態、傾向反對、反對、強烈反對
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">政黨：</h4>
              <p className="text-muted-foreground text-xs">
                國民黨、民進黨、民眾黨、時代力量、台灣基進、無黨籍、其他
              </p>
            </div>
          </div>

          {/* 檔案上傳 */}
          <div className="border-2 border-dashed rounded-lg p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center cursor-pointer"
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              {selectedFile ? (
                <span className="text-sm font-medium">{selectedFile.name}</span>
              ) : (
                <>
                  <span className="text-sm font-medium">點擊選擇檔案</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    支援 .xlsx, .xls, .csv 格式
                  </span>
                </>
              )}
            </label>
          </div>

          {/* 匯入結果 */}
          {importResult && (
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium">匯入結果</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-semibold">{importResult.success}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">成功</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1 text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-semibold">{importResult.duplicates}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">重複</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span className="font-semibold">{importResult.failed}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">失敗</div>
                </div>
              </div>

              {/* 錯誤詳情 */}
              {importResult.errors.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium mb-2">錯誤詳情：</h5>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                    {importResult.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-red-600">
                        {error.row > 0 ? `第 ${error.row} 列：` : ''}{error.message}
                      </div>
                    ))}
                    {importResult.errors.length > 10 && (
                      <div className="text-muted-foreground">
                        ...還有 {importResult.errors.length - 10} 個錯誤
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {importResult ? '關閉' : '取消'}
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  匯入中...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  開始匯入
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
