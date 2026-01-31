'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 管理員登入頁面 - 自動重定向至統一登入頁
 * 系統會在登入後自動根據 isAdmin 欄位導向對應介面
 */
export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向至統一登入頁面
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p>正在導向登入頁面...</p>
      </div>
    </div>
  );
}
