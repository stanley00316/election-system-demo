'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { promoterSelfApi } from '@/lib/api';
import {
  Loader2,
  Plus,
  Copy,
  Check,
  Link2,
  MousePointerClick,
  Users,
  ExternalLink,
} from 'lucide-react';

const CHANNEL_OPTIONS = [
  { value: 'LINE', label: 'LINE' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'SMS', label: '簡訊' },
  { value: 'QR_CODE', label: 'QR Code' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'DIRECT_LINK', label: '直接連結' },
  { value: 'OTHER', label: '其他' },
];

const getChannelLabel = (channel: string) => {
  return CHANNEL_OPTIONS.find((c) => c.value === channel)?.label || channel;
};

export default function PromoterShareLinksPage() {
  const [shareLinks, setShareLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newChannel, setNewChannel] = useState('LINE');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    loadShareLinks();
  }, []);

  const loadShareLinks = async () => {
    try {
      const data = await promoterSelfApi.getShareLinks();
      setShareLinks(data);
    } catch (err) {
      console.error('Failed to load share links:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const newLink = await promoterSelfApi.createShareLink({ channel: newChannel });
      setShareLinks([newLink, ...shareLinks]);
      setShowCreateForm(false);
      setNewChannel('LINE');
    } catch (err) {
      console.error('Failed to create share link:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const copyLink = (code: string, id: string) => {
    const url = `${baseUrl}/s/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          建立新連結
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">建立新分享連結</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">渠道</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                >
                  {CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  建立
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  取消
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share Links List */}
      {shareLinks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">尚無分享連結</p>
            <p className="text-sm text-muted-foreground mt-1">
              點擊上方「建立新連結」開始推廣
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {shareLinks.map((link: any) => (
            <Card key={link.id}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Link info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {getChannelLabel(link.channel)}
                      </span>
                      {!link.isActive && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          已停用
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded truncate">
                        {baseUrl}/s/{link.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => copyLink(link.code, link.id)}
                      >
                        {copiedId === link.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MousePointerClick className="h-3.5 w-3.5" />
                      <span>{link._count?.clicks ?? link.clickCount ?? 0} 點擊</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{link._count?.referrals ?? 0} 推薦</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(link.createdAt).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
