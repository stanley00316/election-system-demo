import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  STANCE_LABELS,
  CONTACT_TYPE_LABELS,
  CONTACT_OUTCOME_LABELS,
  RELATION_TYPE_LABELS,
  EVENT_TYPE_LABELS,
  PARTY_LABELS,
} from '@/shared';

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

// ==================== 推廣者系統翻譯 ====================

export function getPromoterTypeLabel(type: string) {
  const labels: Record<string, string> = {
    INTERNAL: '訂閱者',
    EXTERNAL: '外部推廣者',
  };
  return labels[type] || type;
}

export function getPromoterStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: '待審核',
    APPROVED: '已通過',
    ACTIVE: '活躍中',
    SUSPENDED: '已停用',
  };
  return labels[status] || status;
}

export function getRewardTypeLabel(type: string) {
  const labels: Record<string, string> = {
    NONE: '無獎勵',
    FIXED_AMOUNT: '固定金額',
    PERCENTAGE: '百分比佣金',
    SUBSCRIPTION_EXTENSION: '延長訂閱',
  };
  return labels[type] || type;
}

export function getShareChannelLabel(channel: string) {
  const labels: Record<string, string> = {
    LINE: 'LINE',
    FACEBOOK: 'Facebook',
    SMS: '簡訊',
    QR_CODE: 'QR Code',
    EMAIL: 'Email',
    DIRECT_LINK: '直接連結',
    OTHER: '其他',
  };
  return labels[channel] || channel;
}

export function getPromoterReferralStatusLabel(status: string) {
  const labels: Record<string, string> = {
    CLICKED: '僅點擊',
    REGISTERED: '已註冊',
    TRIAL: '試用中',
    SUBSCRIBED: '已訂閱',
    RENEWED: '已續訂',
    EXPIRED: '已過期',
  };
  return labels[status] || status;
}

export function getTrialInviteStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: '待啟用',
    SENT: '已發送',
    ACTIVATED: '已啟用',
    ACTIVE: '試用中',
    EXPIRED: '已過期',
    CONVERTED: '已轉付費',
    CANCELLED: '已取消',
  };
  return labels[status] || status;
}

export function getTrialInviteMethodLabel(method: string) {
  const labels: Record<string, string> = {
    LINK: '連結',
    DIRECT: '主動邀請',
  };
  return labels[method] || method;
}
