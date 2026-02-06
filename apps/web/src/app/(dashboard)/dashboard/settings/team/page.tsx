'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumericKeypad } from '@/components/ui/numeric-keypad';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCampaignStore } from '@/stores/campaign';
import { campaignsApi } from '@/lib/api';
import { Plus, Trash2, UserPlus, Shield, Edit2, Eye, Link2, Copy, Check, Clock, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '管理員',
  EDITOR: '編輯者',
  VIEWER: '檢視者',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: '可管理所有功能，包括團隊成員',
  EDITOR: '可編輯選民資料，但無法管理團隊',
  VIEWER: '僅能檢視資料，無法編輯',
};

const ROLE_ICONS: Record<string, any> = {
  ADMIN: Shield,
  EDITOR: Edit2,
  VIEWER: Eye,
};

export default function TeamPage() {
  const { currentCampaign } = useCampaignStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // 邀請成員對話框
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLineId, setInviteLineId] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('VIEWER');
  
  // 邀請連結對話框
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkRole, setLinkRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('VIEWER');
  const [linkMaxUses, setLinkMaxUses] = useState<number | undefined>(undefined);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // 刪除成員確認
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);

  const { data: team, isLoading } = useQuery({
    queryKey: ['campaign', currentCampaign?.id, 'team'],
    queryFn: () => campaignsApi.getTeam(currentCampaign!.id),
    enabled: !!currentCampaign?.id,
  });

  const { data: inviteLinks } = useQuery({
    queryKey: ['campaign', currentCampaign?.id, 'invite-links'],
    queryFn: () => campaignsApi.getInviteLinks(currentCampaign!.id),
    enabled: !!currentCampaign?.id,
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { lineUserId: string; role: string }) =>
      campaignsApi.invite(currentCampaign!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', currentCampaign?.id, 'team'] });
      setInviteDialogOpen(false);
      setInviteLineId('');
      setInviteRole('VIEWER');
      toast({
        title: '成功',
        description: '已發送邀請',
      });
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '邀請失敗',
        variant: 'destructive',
      });
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: (data: { role: string; maxUses?: number }) =>
      campaignsApi.createInviteLink(currentCampaign!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', currentCampaign?.id, 'invite-links'] });
      setLinkDialogOpen(false);
      setLinkRole('VIEWER');
      setLinkMaxUses(undefined);
      toast({
        title: '成功',
        description: '已建立邀請連結',
      });
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '建立連結失敗',
        variant: 'destructive',
      });
    },
  });

  const deactivateLinkMutation = useMutation({
    mutationFn: (inviteId: string) =>
      campaignsApi.deactivateInviteLink(currentCampaign!.id, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', currentCampaign?.id, 'invite-links'] });
      toast({
        title: '成功',
        description: '已停用邀請連結',
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      campaignsApi.updateMemberRole(currentCampaign!.id, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', currentCampaign?.id, 'team'] });
      toast({
        title: '成功',
        description: '已更新成員角色',
      });
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '更新失敗',
        variant: 'destructive',
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      campaignsApi.removeMember(currentCampaign!.id, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', currentCampaign?.id, 'team'] });
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      toast({
        title: '成功',
        description: '已移除成員',
      });
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message || '移除失敗',
        variant: 'destructive',
      });
    },
  });

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: '已複製',
      description: '邀請連結已複製到剪貼簿',
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  if (!currentCampaign) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">請先選擇選舉活動</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">團隊管理</h1>
            <p className="text-muted-foreground">
              {currentCampaign.name} - 管理團隊成員與權限
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* 建立邀請連結按鈕 */}
          <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Link2 className="h-4 w-4 mr-2" />
                建立邀請連結
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>建立邀請連結</DialogTitle>
                <DialogDescription>
                  建立一個可分享的邀請連結，讓成員可以自行加入團隊
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>角色權限</Label>
                  <Select
                    value={linkRole}
                    onValueChange={(value) => setLinkRole(value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          管理員
                        </div>
                      </SelectItem>
                      <SelectItem value="EDITOR">
                        <div className="flex items-center gap-2">
                          <Edit2 className="h-4 w-4" />
                          編輯者
                        </div>
                      </SelectItem>
                      <SelectItem value="VIEWER">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          檢視者
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {ROLE_DESCRIPTIONS[linkRole]}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUses">最大使用次數（選填）</Label>
                  <NumericKeypad
                    value={linkMaxUses}
                    onChange={(val) => setLinkMaxUses(val)}
                    min={1}
                    placeholder="留空表示無限制"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setLinkDialogOpen(false)}
                >
                  取消
                </Button>
                <Button
                  onClick={() => createLinkMutation.mutate({
                    role: linkRole,
                    maxUses: linkMaxUses,
                  })}
                  disabled={createLinkMutation.isPending}
                >
                  {createLinkMutation.isPending ? '建立中...' : '建立連結'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 邀請成員按鈕 */}
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                邀請成員
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>邀請團隊成員</DialogTitle>
              <DialogDescription>
                輸入成員的 LINE User ID 來邀請他們加入團隊
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lineUserId">LINE User ID</Label>
                <Input
                  id="lineUserId"
                  value={inviteLineId}
                  onChange={(e) => setInviteLineId(e.target.value)}
                  placeholder="輸入 LINE User ID"
                />
              </div>
              <div className="space-y-2">
                <Label>角色權限</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        管理員
                      </div>
                    </SelectItem>
                    <SelectItem value="EDITOR">
                      <div className="flex items-center gap-2">
                        <Edit2 className="h-4 w-4" />
                        編輯者
                      </div>
                    </SelectItem>
                    <SelectItem value="VIEWER">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        檢視者
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {ROLE_DESCRIPTIONS[inviteRole]}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={() => inviteMutation.mutate({ lineUserId: inviteLineId, role: inviteRole })}
                disabled={!inviteLineId || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? '發送中...' : '發送邀請'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* 邀請連結 */}
      {inviteLinks && inviteLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              邀請連結
            </CardTitle>
            <CardDescription>
              分享這些連結讓成員可以自行加入團隊
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inviteLinks.map((invite: any) => {
                const expired = isExpired(invite.expiresAt);
                const reachedLimit = invite.maxUses && invite.usedCount >= invite.maxUses;
                const isInactive = !invite.isActive || expired || reachedLimit;
                
                return (
                  <div
                    key={invite.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isInactive ? 'opacity-50 bg-muted/30' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm bg-muted px-2 py-0.5 rounded truncate">
                          {`${window.location.origin}/join/${invite.code}`}
                        </code>
                        <Badge variant={isInactive ? 'secondary' : 'default'}>
                          {ROLE_LABELS[invite.role]}
                        </Badge>
                        {isInactive && (
                          <Badge variant="destructive">
                            {!invite.isActive ? '已停用' : expired ? '已過期' : '已達上限'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {expired ? '已過期' : `${formatDate(invite.expiresAt)} 到期`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          已使用 {invite.usedCount}{invite.maxUses ? ` / ${invite.maxUses}` : ''} 次
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!isInactive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(invite.code)}
                        >
                          {copiedCode === invite.code ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {invite.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deactivateLinkMutation.mutate(invite.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roles Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>角色說明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(ROLE_LABELS).map(([role, label]) => {
              const Icon = ROLE_ICONS[role];
              return (
                <div key={role} className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-medium">{label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ROLE_DESCRIPTIONS[role]}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>團隊成員</CardTitle>
          <CardDescription>
            目前有 {team?.length || 0} 位成員
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : team?.length > 0 ? (
            <div className="space-y-3">
              {team.map((member: any) => {
                const Icon = ROLE_ICONS[member.role] || Eye;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      {member.user?.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt={member.user.name}
                          className="h-12 w-12 rounded-full"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <span className="font-medium">
                            {member.user?.name?.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{member.user?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.user?.email || 'LINE 使用者'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select
                        value={member.role}
                        onValueChange={(value) => {
                          updateRoleMutation.mutate({ memberId: member.id, role: value });
                        }}
                        disabled={member.userId === currentCampaign.ownerId}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue>
                            <span className="flex items-center gap-1">
                              <Icon className="h-3 w-3" />
                              {ROLE_LABELS[member.role]}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">管理員</SelectItem>
                          <SelectItem value="EDITOR">編輯者</SelectItem>
                          <SelectItem value="VIEWER">檢視者</SelectItem>
                        </SelectContent>
                      </Select>
                      {member.userId !== currentCampaign.ownerId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setMemberToDelete(member);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      {member.userId === currentCampaign.ownerId && (
                        <Badge variant="secondary">擁有者</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">尚未邀請任何成員</p>
              <Button onClick={() => setInviteDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                邀請第一位成員
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 刪除成員確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認移除成員</AlertDialogTitle>
            <AlertDialogDescription>
              確定要將 <strong>{memberToDelete?.user?.name}</strong> 從團隊中移除嗎？
              此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToDelete && removeMemberMutation.mutate(memberToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              確認移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
