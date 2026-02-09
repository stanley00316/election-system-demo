'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, isDemoMode } from '@/lib/api';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export default function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      if (isDemoMode) {
        // Demo mode: check demo user
        const { demoUser } = await import('@/lib/demo-data');
        setIsAuthorized(!!demoUser.isSuperAdmin);
        return;
      }

      const userData = await authApi.getMe();
      setIsAuthorized(!!userData.isSuperAdmin);
    } catch {
      setIsAuthorized(false);
    }
  };

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">權限不足</h2>
          <p className="text-gray-500 mb-6">
            此頁面僅限超級管理者存取。如需權限，請聯繫系統管理員。
          </p>
          <Button asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回管理後台
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
