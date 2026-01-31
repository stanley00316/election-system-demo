import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useCampaignStore } from '@/stores/campaign';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';

export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER' | 'OWNER' | null;

export interface Permissions {
  role: UserRole;
  isOwner: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  canEdit: boolean;
  canManageTeam: boolean;
  canDeleteCampaign: boolean;
  canCreateVoter: boolean;
  canEditVoter: boolean;
  canDeleteVoter: boolean;
  canCreateContact: boolean;
  canEditContact: boolean;
  canCreateEvent: boolean;
  canEditEvent: boolean;
  canCreateSchedule: boolean;
  canEditSchedule: boolean;
  loading: boolean;
}

/**
 * Hook 用於取得當前使用者在選定 Campaign 中的權限
 */
export function usePermissions(): Permissions {
  const { user, isAuthenticated } = useAuthStore();
  const { currentCampaign } = useCampaignStore();

  // 載入使用者資料以取得 teamMembers
  const { data: userData, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.getMe(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });

  const permissions = useMemo<Permissions>(() => {
    // 預設值
    const defaultPermissions: Permissions = {
      role: null,
      isOwner: false,
      isAdmin: false,
      isEditor: false,
      isViewer: false,
      canEdit: false,
      canManageTeam: false,
      canDeleteCampaign: false,
      canCreateVoter: false,
      canEditVoter: false,
      canDeleteVoter: false,
      canCreateContact: false,
      canEditContact: false,
      canCreateEvent: false,
      canEditEvent: false,
      canCreateSchedule: false,
      canEditSchedule: false,
      loading: isLoading,
    };

    if (!user || !currentCampaign || !userData) {
      return defaultPermissions;
    }

    // 檢查是否為 Campaign 擁有者
    const isOwner = currentCampaign.ownerId === user.id;

    // 從 teamMembers 中取得角色
    const teamMember = userData.teamMembers?.find(
      (m: any) => m.campaignId === currentCampaign.id
    );
    const memberRole = teamMember?.role as 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined;

    // 決定最終角色
    let role: UserRole = null;
    if (isOwner) {
      role = 'OWNER';
    } else if (memberRole) {
      role = memberRole;
    }

    // 計算權限
    const isAdmin = role === 'OWNER' || role === 'ADMIN';
    const isEditor = role === 'EDITOR';
    const isViewer = role === 'VIEWER';
    const canEdit = isAdmin || isEditor;

    return {
      role,
      isOwner,
      isAdmin,
      isEditor,
      isViewer,
      canEdit,
      canManageTeam: isAdmin,
      canDeleteCampaign: isOwner,
      canCreateVoter: canEdit,
      canEditVoter: canEdit,
      canDeleteVoter: isAdmin,
      canCreateContact: canEdit,
      canEditContact: canEdit,
      canCreateEvent: canEdit,
      canEditEvent: canEdit,
      canCreateSchedule: canEdit,
      canEditSchedule: canEdit,
      loading: false,
    };
  }, [user, currentCampaign, userData, isLoading]);

  return permissions;
}

/**
 * 角色標籤
 */
export const ROLE_LABELS: Record<string, string> = {
  OWNER: '擁有者',
  ADMIN: '管理員',
  EDITOR: '編輯者',
  VIEWER: '檢視者',
};

/**
 * 角色說明
 */
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  OWNER: '可管理所有功能，包括刪除選舉活動',
  ADMIN: '可管理所有功能，包括團隊成員',
  EDITOR: '可編輯選民資料，但無法管理團隊',
  VIEWER: '僅能檢視資料，無法編輯',
};
