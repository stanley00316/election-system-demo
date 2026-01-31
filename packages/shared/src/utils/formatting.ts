// 格式化相關工具函數

/**
 * 格式化日期
 */
export function formatDate(date: Date | string, format: 'full' | 'date' | 'time' | 'relative' = 'date'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'relative') {
    return formatRelativeTime(d);
  }
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Taipei',
  };
  
  switch (format) {
    case 'full':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
    case 'date':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
  }
  
  return d.toLocaleDateString('zh-TW', options);
}

/**
 * 格式化相對時間
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return '剛剛';
  } else if (minutes < 60) {
    return `${minutes} 分鐘前`;
  } else if (hours < 24) {
    return `${hours} 小時前`;
  } else if (days < 7) {
    return `${days} 天前`;
  } else if (days < 30) {
    return `${Math.floor(days / 7)} 週前`;
  } else if (days < 365) {
    return `${Math.floor(days / 30)} 個月前`;
  } else {
    return `${Math.floor(days / 365)} 年前`;
  }
}

/**
 * 格式化數字（加入千分位）
 */
export function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString('zh-TW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 格式化距離
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} 公尺`;
  }
  return `${(meters / 1000).toFixed(1)} 公里`;
}

/**
 * 格式化時間長度
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} 分鐘`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} 小時`;
  }
  return `${hours} 小時 ${mins} 分鐘`;
}

/**
 * 截斷文字
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 姓名遮罩
 */
export function maskName(name: string): string {
  if (name.length <= 1) {
    return '*';
  }
  if (name.length === 2) {
    return name[0] + '*';
  }
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

/**
 * 電話遮罩
 */
export function maskPhone(phone: string): string {
  if (phone.length < 4) {
    return '****';
  }
  return phone.slice(0, -4) + '****';
}

/**
 * 地址遮罩
 */
export function maskAddress(address: string): string {
  // 保留到里，隱藏後續門牌
  const villageMatch = address.match(/^(.+?里)/);
  if (villageMatch) {
    return villageMatch[1] + '***';
  }
  // 保留到區
  const districtMatch = address.match(/^(.+?(?:區|鄉|鎮|市))/);
  if (districtMatch) {
    return districtMatch[1] + '***';
  }
  return address.slice(0, Math.floor(address.length / 2)) + '***';
}
