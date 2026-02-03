'use client';

import { useEffect, useState } from 'react';

/**
 * 追蹤客戶端水合狀態的 Hook
 * 
 * 用於解決 Zustand persist middleware 導致的 SSR 水合錯誤。
 * 在水合完成前，應使用一致的初始值來避免伺服器與客戶端渲染不匹配。
 * 
 * @returns {boolean} 是否已完成水合
 * 
 * @example
 * ```tsx
 * const hydrated = useHydration();
 * const { currentCampaign } = useCampaignStore();
 * 
 * if (!hydrated) {
 *   return <LoadingSpinner />;
 * }
 * ```
 */
export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
