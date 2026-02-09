'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuthStore } from '@/stores/auth';
import { useCampaignStore } from '@/stores/campaign';
import { useHydration } from '@/hooks/use-hydration';
import { authApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Calendar,
  MapPin,
  Map,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
  Check,
  Plus,
  Shield,
  Edit2,
  Eye,
  ArrowLeftRight,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { BottomNavBar } from '@/components/navigation';
import { SubscriptionBanner } from '@/components/subscription';
import { BackButton, getParentPath } from '@/components/common/BackButton';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '管理員',
  EDITOR: '編輯者',
  VIEWER: '檢視者',
};

const ROLE_ICONS: Record<string, any> = {
  ADMIN: Shield,
  EDITOR: Edit2,
  VIEWER: Eye,
};

const navigation = [
  { name: '總覽', href: '/dashboard', icon: LayoutDashboard },
  { name: '選民管理', href: '/dashboard/voters', icon: Users },
  { name: '接觸紀錄', href: '/dashboard/contacts', icon: MessageSquare },
  { name: '活動管理', href: '/dashboard/events', icon: Calendar },
  { name: '行程規劃', href: '/dashboard/schedules', icon: MapPin },
  { name: '地圖檢視', href: '/dashboard/map', icon: Map },
  { name: '選情分析', href: '/dashboard/analysis', icon: BarChart3 },
  { name: '設定', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrated = useHydration();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { currentCampaign, campaigns, setCampaigns, setCurrentCampaign } = useCampaignStore();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [campaignPopoverOpen, setCampaignPopoverOpen] = useState(false);

  // 載入使用者的 campaigns
  const { data: userData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.getMe(),
    enabled: isAuthenticated,
  });

  // 更新 campaigns 到 store
  useEffect(() => {
    if (userData?.campaigns) {
      setCampaigns(userData.campaigns);
      // 如果沒有選擇的 campaign，自動選擇第一個
      if (!currentCampaign && userData.campaigns.length > 0) {
        setCurrentCampaign(userData.campaigns[0]);
      }
    }
  }, [userData, currentCampaign, setCampaigns, setCurrentCampaign]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // 如果沒有選擇 campaign 且不在設定頁面，顯示選擇提示
  const isOnSettingsPage = pathname.startsWith('/dashboard/settings');
  const needsCampaignSelection = !currentCampaign && campaigns && campaigns.length === 0 && !isOnSettingsPage;

  // 取得使用者在 campaign 中的角色
  const getUserRole = (campaign: any) => {
    if (campaign.ownerId === user?.id) return 'OWNER';
    const member = userData?.teamMembers?.find(
      (m: any) => m.campaignId === campaign.id
    );
    return member?.role || 'VIEWER';
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // 水合完成前或載入中顯示載入狀態，避免 SSR 與客戶端渲染不匹配
  if (isLoading || !hydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-muted/30">
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
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">選</span>
              </div>
              <span className="font-bold">選情系統</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Campaign selector */}
          <div className="p-4 border-b">
            <Popover open={campaignPopoverOpen} onOpenChange={setCampaignPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="truncate">
                    {currentCampaign?.name || '選擇選舉活動'}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-1">
                  {/* 已擁有或參與的 campaigns */}
                  {campaigns && campaigns.length > 0 ? (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        選舉活動
                      </div>
                      {campaigns.map((campaign: any) => {
                        const isSelected = currentCampaign?.id === campaign.id;
                        const role = getUserRole(campaign);
                        const RoleIcon = ROLE_ICONS[role] || Eye;
                        
                        return (
                          <button
                            key={campaign.id}
                            className={cn(
                              'w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors',
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            )}
                            onClick={() => {
                              setCurrentCampaign(campaign);
                              setCampaignPopoverOpen(false);
                            }}
                          >
                            <div className="flex-1 text-left min-w-0">
                              <div className="font-medium truncate">
                                {campaign.name}
                              </div>
                              <div className={cn(
                                'text-xs flex items-center gap-1',
                                isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              )}>
                                <RoleIcon className="h-3 w-3" />
                                {role === 'OWNER' ? '擁有者' : ROLE_LABELS[role]}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <div className="px-2 py-4 text-sm text-center text-muted-foreground">
                      尚未參與任何選舉活動
                    </div>
                  )}
                  
                  {/* 分隔線和快速操作 */}
                  <div className="border-t my-2" />
                  <Link
                    href="/dashboard/settings/campaigns/new"
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                    onClick={() => setCampaignPopoverOpen(false)}
                  >
                    <Plus className="h-4 w-4" />
                    建立新選舉活動
                  </Link>
                  <Link
                    href="/dashboard/settings/campaigns"
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                    onClick={() => setCampaignPopoverOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    管理選舉活動
                  </Link>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
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
          </nav>

          {/* User menu */}
          <div className="border-t p-4">
            {/* 切換身份按鈕（多角色時顯示） */}
            {(user?.isAdmin || user?.isSuperAdmin || user?.promoter?.isActive) && (
              <Link
                href="/role-select"
                className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                <ArrowLeftRight className="h-4 w-4" />
                切換身份
              </Link>
            )}
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                登出
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {user?.name?.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || '未設定 Email'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Subscription banner */}
        <SubscriptionBanner />

        {/* Mobile header */}
        <header className="h-16 border-b bg-card flex items-center px-4 lg:hidden">
          {(() => {
            const parentPath = getParentPath(pathname, '/dashboard');
            return parentPath ? (
              <BackButton href={parentPath} />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            );
          })()}
          <span className="ml-2 font-semibold truncate">
            {navigation.find((n) => n.href === pathname)?.name || '選情系統'}
          </span>
          {/* 當有返回按鈕時，把漢堡選單放右邊 */}
          {getParentPath(pathname, '/dashboard') && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {needsCampaignSelection ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center max-w-md">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">尚未加入任何選舉活動</h2>
                <p className="text-muted-foreground mb-6">
                  您需要建立或加入一個選舉活動才能開始使用系統
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild>
                    <Link href="/dashboard/settings/campaigns/new">
                      <Plus className="h-4 w-4 mr-2" />
                      建立選舉活動
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/settings/campaigns">
                      管理選舉活動
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* 底部導航欄 - 僅行動裝置顯示 */}
      <BottomNavBar />
    </div>
  );
}
