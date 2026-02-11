'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { promoterSelfApi, isDemoMode } from '@/lib/api';
import {
  LayoutDashboard,
  Users,
  Link2,
  Gift,
  ArrowLeftRight,
  LogOut,
  Loader2,
  Menu,
  X,
  Copy,
} from 'lucide-react';
import { SimpleBottomNavBar } from '@/components/navigation';
import { BackButton, getParentPath } from '@/components/common/BackButton';

const navigation = [
  { name: '總覽', href: '/promoter/dashboard', icon: LayoutDashboard },
  { name: '推薦紀錄', href: '/promoter/referrals', icon: Users },
  { name: '分享連結', href: '/promoter/share-links', icon: Link2 },
  { name: '試用邀請', href: '/promoter/trials', icon: Gift },
];

export default function PromoterDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [promoterProfile, setPromoterProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token && !isDemoMode) {
        router.replace('/login');
        return;
      }

      const profile = await promoterSelfApi.getProfile();
      if (!profile || !profile.isActive) {
        router.replace('/role-select');
        return;
      }

      setPromoterProfile(profile);
      setIsAuthorized(true);
    } catch {
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    router.push('/login');
  };

  const copyReferralCode = () => {
    if (promoterProfile?.referralCode) {
      navigator.clipboard.writeText(promoterProfile.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo / Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">推</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">推廣者後台</p>
                  <p className="text-xs text-muted-foreground">{promoterProfile?.name}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Referral Code */}
            {promoterProfile?.referralCode && (
              <div className="mt-3 flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 rounded-md px-3 py-2">
                <span className="text-xs text-orange-600 dark:text-orange-400">推薦碼：</span>
                <code className="text-xs font-mono font-bold text-orange-700 dark:text-orange-300">
                  {promoterProfile.referralCode}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-auto"
                  onClick={copyReferralCode}
                >
                  <Copy className={`h-3 w-3 ${copied ? 'text-green-500' : ''}`} />
                </Button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer actions */}
          <div className="p-3 border-t space-y-1">
            <Link
              href="/role-select"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeftRight className="h-4 w-4" />
              切換身份
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full"
            >
              <LogOut className="h-4 w-4" />
              登出
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card border-b px-4 py-3 flex items-center gap-4">
          {(() => {
            const parentPath = getParentPath(pathname, '/promoter/dashboard');
            return parentPath ? (
              <BackButton href={parentPath} />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            );
          })()}
          <h1 className="text-lg font-semibold truncate">
            {navigation.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))?.name || '推廣者後台'}
          </h1>
          {getParentPath(pathname, '/promoter/dashboard') && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 pb-24 lg:pb-6">{children}</main>
      </div>

      {/* 底部導航欄 - 僅行動裝置顯示 */}
      <SimpleBottomNavBar items={navigation} />
    </div>
  );
}
