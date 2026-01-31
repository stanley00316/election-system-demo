'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  BarChart3,
  LogOut,
  Menu,
  X,
  Shield,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const navigation = [
  { name: '總覽', href: '/admin', icon: LayoutDashboard },
  { name: '使用者管理', href: '/admin/users', icon: Users },
  { name: '訂閱管理', href: '/admin/subscriptions', icon: CreditCard },
  { name: '付款管理', href: '/admin/payments', icon: Receipt },
  { name: '數據分析', href: '/admin/analytics', icon: BarChart3 },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [admin, setAdmin] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // 使用一般 token 檢查
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      // 取得使用者資料並檢查是否為管理員
      const userData = await authApi.getMe();
      
      if (!userData.isAdmin) {
        // 不是管理員，導向登入頁
        router.push('/admin/login?error=not_admin');
        return;
      }

      setAdmin(userData);
    } catch (error) {
      // 清除 token 並導向登入頁
      localStorage.removeItem('token');
      router.push('/admin/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    localStorage.removeItem('token');
    router.push('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold">管理後台</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-gray-800"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* 返回用戶端 */}
            <div className="mt-8 pt-4 border-t border-gray-800">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <UserCog className="h-5 w-5" />
                返回用戶端
              </Link>
            </div>
          </nav>

          {/* User menu */}
          <div className="border-t border-gray-800 p-4">
            <div className="flex items-center gap-3 mb-4">
              {admin?.avatarUrl ? (
                <img
                  src={admin.avatarUrl}
                  alt={admin.name}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {admin?.name?.charAt(0) || 'A'}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{admin?.name}</p>
                <p className="text-xs text-gray-400 truncate">
                  {admin?.email || '管理員'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              登出
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="h-16 border-b bg-card flex items-center px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-4 font-semibold">
            {navigation.find((n) => pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href)))?.name || '管理後台'}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
