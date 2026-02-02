'use client';

import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { votersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  CreditCard,
  Trash2,
  Loader2,
  Plus,
  Eye,
  X,
} from 'lucide-react';

interface VoterAttachmentsProps {
  voterId: string;
}

const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  BUSINESS_CARD: '名片',
  PHOTO: '照片',
  DOCUMENT: '文件',
  OTHER: '其他',
};

const ATTACHMENT_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  BUSINESS_CARD: CreditCard,
  PHOTO: ImageIcon,
  DOCUMENT: FileText,
  OTHER: FileText,
};

export function VoterAttachments({ voterId }: VoterAttachmentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);
  const [attachmentType, setAttachmentType] = useState<string>('BUSINESS_CARD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // 取得附件列表
  const { data: attachments, isLoading } = useQuery({
    queryKey: ['voter-attachments', voterId],
    queryFn: () => votersApi.getAttachments(voterId),
    enabled: !!voterId,
  });

  // 新增附件
  const addAttachmentMutation = useMutation({
    mutationFn: async (data: { type: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string }) => {
      return votersApi.addAttachment(voterId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voter-attachments', voterId] });
      toast({
        title: '成功',
        description: '附件已上傳',
      });
      resetUploadForm();
    },
    onError: (error: any) => {
      toast({
        title: '上傳失敗',
        description: error.message || '發生錯誤',
        variant: 'destructive',
      });
    },
  });

  // 刪除附件
  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => votersApi.deleteAttachment(voterId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voter-attachments', voterId] });
      toast({
        title: '成功',
        description: '附件已刪除',
      });
    },
  });

  const resetUploadForm = () => {
    setUploadDialogOpen(false);
    setSelectedFile(null);
    setPreviewUrl('');
    setAttachmentType('BUSINESS_CARD');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 檢查檔案大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: '檔案過大',
        description: '檔案大小不可超過 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);

    // 如果是圖片，顯示預覽
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // 將檔案轉換為 base64（示範模式用）
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Url = e.target?.result as string;
      addAttachmentMutation.mutate({
        type: attachmentType,
        fileName: selectedFile.name,
        fileUrl: base64Url,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handlePreview = (attachment: any) => {
    setSelectedAttachment(attachment);
    setPreviewDialogOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">附件</CardTitle>
        <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          上傳
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : attachments && attachments.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {attachments.map((attachment: any) => {
              const Icon = ATTACHMENT_TYPE_ICONS[attachment.type] || FileText;
              const isImage = attachment.mimeType?.startsWith('image/');
              
              return (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {isImage ? (
                    <div className="h-12 w-12 rounded bg-muted overflow-hidden shrink-0">
                      <img
                        src={attachment.fileUrl}
                        alt={attachment.fileName}
                        className="h-full w-full object-cover cursor-pointer"
                        onClick={() => handlePreview(attachment)}
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{attachment.fileName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {ATTACHMENT_TYPE_LABELS[attachment.type] || attachment.type}
                      </Badge>
                      {attachment.fileSize && (
                        <span>{formatFileSize(attachment.fileSize)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {isImage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePreview(attachment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                      disabled={deleteAttachmentMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            尚無附件
          </p>
        )}
      </CardContent>

      {/* 上傳對話框 */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        if (!open) resetUploadForm();
        setUploadDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>上傳附件</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>附件類型</Label>
              <Select value={attachmentType} onValueChange={setAttachmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ATTACHMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>選擇檔案</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewUrl}
                      alt="預覽"
                      className="max-h-48 mx-auto rounded"
                    />
                    <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
                  </div>
                ) : selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      點擊選擇檔案
                    </p>
                    <p className="text-xs text-muted-foreground">
                      支援圖片、PDF、Word 文件（最大 5MB）
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetUploadForm}>
              取消
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || addAttachmentMutation.isPending}
            >
              {addAttachmentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  上傳中...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  上傳
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 預覽對話框 */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedAttachment?.fileName}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedAttachment && (
            <div className="flex justify-center py-4">
              <img
                src={selectedAttachment.fileUrl}
                alt={selectedAttachment.fileName}
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
