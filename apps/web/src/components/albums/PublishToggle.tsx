'use client';

import { useState } from 'react';
import { Globe, Lock, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PublishToggleProps {
  isPublished: boolean;
  publishSlug?: string | null;
  onPublish: () => Promise<any>;
  onUnpublish: () => Promise<any>;
  className?: string;
}

export function PublishToggle({
  isPublished,
  publishSlug,
  onPublish,
  onUnpublish,
  className,
}: PublishToggleProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = publishSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${publishSlug}`
    : null;

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isPublished) {
        await onUnpublish();
      } else {
        await onPublish();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>
      <Button
        variant={isPublished ? 'outline' : 'default'}
        size="sm"
        onClick={handleToggle}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : isPublished ? (
          <Lock className="h-4 w-4 mr-2" />
        ) : (
          <Globe className="h-4 w-4 mr-2" />
        )}
        {isPublished ? '取消發表' : '發表相簿'}
      </Button>

      {isPublished && publicUrl && (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate">
            {publicUrl}
          </code>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
