'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { authApi, isDemoMode } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, LayoutDashboard, Megaphone, Shield, ArrowRight, LogOut } from 'lucide-react';

interface RoleOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  features: string[];
}

export default function RoleSelectPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }
    detectRoles();
  }, [isAuthenticated, user]);

  const detectRoles = async () => {
    try {
      // 用最新資料重新取得角色
      let userData = user;
      if (!isDemoMode) {
        try {
          userData = await authApi.getMe();
        } catch {
          // 使用本地快取的資料
        }
      }

      const availableRoles: RoleOption[] = [];

      // 一般使用者（所有人都有）
      availableRoles.push({
        id: 'user',
        title: '一般使用者',
        description: '選民管理與選情分析',
        icon: <LayoutDashboard className="h-8 w-8" />,
        path: '/dashboard',
        features: ['選民管理', '接觸紀錄', '行程規劃', '選情分析'],
      });

      // 推廣者（已核准的推廣人員 或 超級管理員）
      const isApprovedPromoter = userData?.promoter?.isActive && userData?.promoter?.status === 'APPROVED';
      if (isApprovedPromoter || userData?.isSuperAdmin) {
        availableRoles.push({
          id: 'promoter',
          title: '推廣者',
          description: '推廣成效與試用管理',
          icon: <Megaphone className="h-8 w-8" />,
          path: '/promoter/dashboard',
          features: ['推廣成效', '分享連結', '試用管理', '推薦紀錄'],
        });
      }

      // 超級管理員（Demo 模式下不顯示，僅正式環境管理員可見）
      if (!isDemoMode && (userData?.isAdmin || userData?.isSuperAdmin)) {
        availableRoles.push({
          id: 'admin',
          title: '管理後台',
          description: '系統管理與用戶分析',
          icon: <Shield className="h-8 w-8" />,
          path: '/admin',
          features: ['用戶管理', '訂閱管理', '數據分析', '推廣管理'],
        });
      }

      // 只有一個角色時自動導向
      if (availableRoles.length <= 1) {
        router.replace(availableRoles[0]?.path || '/dashboard');
        return;
      }

      setRoles(availableRoles);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">選</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            歡迎回來，{user?.name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            請選擇要進入的介面
          </p>
        </div>

        {/* Role Cards */}
        <div className={`grid gap-4 ${roles.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {roles.map((role) => (
            <Card
              key={role.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 group"
              onClick={() => router.push(role.path)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {role.icon}
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-lg mt-3">{role.title}</CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {role.features.map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 登出按鈕 */}
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => {
              logout();
              router.push('/login');
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            登出
          </Button>
        </div>
      </div>
    </div>
  );
}
