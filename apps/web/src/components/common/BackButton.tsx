'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  /** 明確的返回目標路徑（優先使用） */
  href?: string;
  /** 可選的文字標籤 */
  label?: string;
  /** 無 href 時使用 router.back() */
  className?: string;
}

/**
 * 統一的返回按鈕元件
 * - 提供 href 時：使用 Link 導航（可預測的返回目標）
 * - 不提供 href 時：使用 router.back()（瀏覽器歷史返回）
 */
export function BackButton({ href, label, className }: BackButtonProps) {
  const router = useRouter();

  if (href) {
    return (
      <Link href={href} className={className}>
        <Button variant="ghost" size={label ? 'sm' : 'icon'}>
          <ArrowLeft className="h-5 w-5" />
          {label && <span className="ml-1">{label}</span>}
        </Button>
      </Link>
    );
  }

  return (
    <Button
      variant="ghost"
      size={label ? 'sm' : 'icon'}
      className={className}
      onClick={() => router.back()}
    >
      <ArrowLeft className="h-5 w-5" />
      {label && <span className="ml-1">{label}</span>}
    </Button>
  );
}

/**
 * 根據當前路徑計算父層路徑
 * @param pathname 當前路徑（如 /admin/users/123）
 * @param rootPath 根路徑（如 /admin），到達根路徑後不再往上
 * @returns 父層路徑，若已是根路徑則回傳 null
 */
export function getParentPath(pathname: string, rootPath: string): string | null {
  if (pathname === rootPath) return null;

  const segments = pathname.split('/').filter(Boolean);
  segments.pop();
  const parent = '/' + segments.join('/');

  // 若計算出的父層比根路徑還短，回傳根路徑
  if (parent.length < rootPath.length) return rootPath;

  return parent || rootPath;
}
