import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  STANCE_LABELS,
  CONTACT_TYPE_LABELS,
  CONTACT_OUTCOME_LABELS,
  RELATION_TYPE_LABELS,
  EVENT_TYPE_LABELS,
  PARTY_LABELS,
} from '@election/shared';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
    ...options,
  });
}

export function formatRelativeTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  if (days < 7) return `${days} 天前`;
  return formatDate(d);
}

export function formatNumber(num: number, decimals = 0) {
  return num.toLocaleString('zh-TW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number, decimals = 1) {
  return `${(value * 100).toFixed(decimals)}%`;
}

// 政治傾向顏色（UI 專用，不需共用）
export function getStanceColor(stance: string) {
  const colors: Record<string, string> = {
    STRONG_SUPPORT: 'bg-green-600 text-white',
    SUPPORT: 'bg-green-500 text-white',
    LEAN_SUPPORT: 'bg-green-300 text-green-900',
    NEUTRAL: 'bg-yellow-400 text-yellow-900',
    UNDECIDED: 'bg-gray-400 text-gray-900',
    LEAN_OPPOSE: 'bg-red-300 text-red-900',
    OPPOSE: 'bg-red-500 text-white',
    STRONG_OPPOSE: 'bg-red-600 text-white',
  };
  return colors[stance] || 'bg-gray-200';
}

/**
 * 將政治傾向轉換為繁體中文
 * 使用共用常量，確保前後端一致
 */
export function getStanceLabel(stance: string) {
  return STANCE_LABELS[stance as keyof typeof STANCE_LABELS] || stance;
}

/**
 * 將接觸類型轉換為繁體中文
 * 使用共用常量，確保前後端一致
 */
export function getContactTypeLabel(type: string) {
  return CONTACT_TYPE_LABELS[type as keyof typeof CONTACT_TYPE_LABELS] || type;
}

/**
 * 將接觸結果轉換為繁體中文
 * 使用共用常量，確保前後端一致
 */
export function getContactOutcomeLabel(outcome: string) {
  return CONTACT_OUTCOME_LABELS[outcome as keyof typeof CONTACT_OUTCOME_LABELS] || outcome;
}

/**
 * 將關係類型轉換為繁體中文
 * 使用共用常量，確保前後端一致
 */
export function getRelationTypeLabel(relationType: string) {
  return RELATION_TYPE_LABELS[relationType as keyof typeof RELATION_TYPE_LABELS] || relationType;
}

/**
 * 將活動類型轉換為繁體中文
 * 使用共用常量，確保前後端一致
 */
export function getEventTypeLabel(eventType: string) {
  return EVENT_TYPE_LABELS[eventType as keyof typeof EVENT_TYPE_LABELS] || eventType;
}

/**
 * 將政黨轉換為繁體中文
 * 使用共用常量，確保前後端一致
 */
export function getPartyLabel(party: string) {
  return PARTY_LABELS[party as keyof typeof PARTY_LABELS] || party;
}
