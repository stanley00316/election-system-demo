// 驗證相關工具函數

/**
 * 驗證台灣手機號碼
 */
export function isValidTaiwanPhone(phone: string): boolean {
  // 支援格式: 0912345678, 09-12345678, +886912345678
  const cleaned = phone.replace(/[-\s]/g, '');
  const taiwanMobileRegex = /^(\+886|0)?9\d{8}$/;
  return taiwanMobileRegex.test(cleaned);
}

/**
 * 格式化台灣手機號碼
 */
export function formatTaiwanPhone(phone: string): string {
  const cleaned = phone.replace(/[-\s+]/g, '');
  if (cleaned.startsWith('886')) {
    return '0' + cleaned.slice(3);
  }
  if (cleaned.startsWith('0')) {
    return cleaned;
  }
  return phone;
}

/**
 * 驗證 Email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 驗證台灣地址（基本檢查）
 */
export function isValidTaiwanAddress(address: string): boolean {
  // 基本檢查：需包含縣市或直轄市
  const cityPattern = /(台北市|新北市|桃園市|台中市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|台東縣|澎湖縣|金門縣|連江縣)/;
  return cityPattern.test(address);
}

/**
 * 從地址解析縣市
 */
export function extractCityFromAddress(address: string): string | null {
  const cityMatch = address.match(/(台北市|新北市|桃園市|台中市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|台東縣|澎湖縣|金門縣|連江縣)/);
  return cityMatch ? cityMatch[1] : null;
}

/**
 * 從地址解析區
 */
export function extractDistrictFromAddress(address: string): string | null {
  // 匹配 "XX區" 或 "XX鄉" 或 "XX鎮" 或 "XX市"（非直轄市）
  const districtMatch = address.match(/([^\s市縣]{2,3}(?:區|鄉|鎮|市))/);
  if (districtMatch) {
    const district = districtMatch[1];
    // 排除直轄市
    if (!['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', '基隆市', '新竹市', '嘉義市'].includes(district)) {
      return district;
    }
  }
  return null;
}

/**
 * 從地址解析里
 */
export function extractVillageFromAddress(address: string): string | null {
  const villageMatch = address.match(/([^\s區鄉鎮市]{2,4}里)/);
  return villageMatch ? villageMatch[1] : null;
}

/**
 * 驗證必填欄位
 */
export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      missing.push(String(field));
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}
