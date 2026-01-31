// 使用者相關型別定義

export enum UserRole {
  ADMIN = 'ADMIN',       // 管理員
  EDITOR = 'EDITOR',     // 編輯者
  VIEWER = 'VIEWER',     // 檢視者
}

export interface User {
  id: string;
  lineUserId: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  userId: string;
  campaignId: string;
  role: UserRole;
  invitedBy: string;
  joinedAt: Date;
  user?: User;
}

export interface CreateUserDto {
  lineUserId: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface InviteTeamMemberDto {
  campaignId: string;
  email?: string;
  phone?: string;
  role: UserRole;
}
