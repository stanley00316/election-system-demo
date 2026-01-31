'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Bell, Mail, Smartphone, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface NotificationSettings {
  // Email 通知
  emailScheduleReminder: boolean;
  emailContactUpdate: boolean;
  emailTeamActivity: boolean;
  emailWeeklyReport: boolean;
  
  // 推播通知
  pushEnabled: boolean;
  pushScheduleReminder: boolean;
  pushContactUpdate: boolean;
  
  // 時間偏好
  reminderTime: string;
  frequency: 'instant' | 'daily' | 'weekly';
}

export default function NotificationsSettingsPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<NotificationSettings>({
    emailScheduleReminder: true,
    emailContactUpdate: true,
    emailTeamActivity: false,
    emailWeeklyReport: true,
    pushEnabled: false,
    pushScheduleReminder: true,
    pushContactUpdate: false,
    reminderTime: '09:00',
    frequency: 'instant',
  });

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: 連接 API 儲存通知設定
      // await api.put('/users/me/notifications', settings);
      
      // 模擬 API 延遲
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: '成功',
        description: '通知設定已儲存',
      });
    } catch (error: any) {
      toast({
        title: '錯誤',
        description: error.message || '儲存失敗',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">通知設定</h1>
          <p className="text-muted-foreground">管理您的通知偏好</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Email 通知 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email 通知
            </CardTitle>
            <CardDescription>選擇要透過 Email 接收的通知類型</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>行程提醒</Label>
                <p className="text-sm text-muted-foreground">
                  在行程開始前收到 Email 提醒
                </p>
              </div>
              <Switch
                checked={settings.emailScheduleReminder}
                onCheckedChange={(checked) => updateSetting('emailScheduleReminder', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>接觸紀錄更新</Label>
                <p className="text-sm text-muted-foreground">
                  當團隊成員新增接觸紀錄時通知
                </p>
              </div>
              <Switch
                checked={settings.emailContactUpdate}
                onCheckedChange={(checked) => updateSetting('emailContactUpdate', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>團隊活動</Label>
                <p className="text-sm text-muted-foreground">
                  團隊成員加入或離開時通知
                </p>
              </div>
              <Switch
                checked={settings.emailTeamActivity}
                onCheckedChange={(checked) => updateSetting('emailTeamActivity', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>每週報告</Label>
                <p className="text-sm text-muted-foreground">
                  每週接收選情摘要報告
                </p>
              </div>
              <Switch
                checked={settings.emailWeeklyReport}
                onCheckedChange={(checked) => updateSetting('emailWeeklyReport', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 推播通知 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              推播通知
            </CardTitle>
            <CardDescription>管理瀏覽器推播通知</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>啟用推播通知</Label>
                <p className="text-sm text-muted-foreground">
                  在瀏覽器接收即時通知
                </p>
              </div>
              <Switch
                checked={settings.pushEnabled}
                onCheckedChange={(checked) => updateSetting('pushEnabled', checked)}
              />
            </div>
            
            {settings.pushEnabled && (
              <>
                <div className="flex items-center justify-between pl-4 border-l-2">
                  <div className="space-y-0.5">
                    <Label>行程提醒</Label>
                    <p className="text-sm text-muted-foreground">
                      行程開始前的即時提醒
                    </p>
                  </div>
                  <Switch
                    checked={settings.pushScheduleReminder}
                    onCheckedChange={(checked) => updateSetting('pushScheduleReminder', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between pl-4 border-l-2">
                  <div className="space-y-0.5">
                    <Label>接觸紀錄更新</Label>
                    <p className="text-sm text-muted-foreground">
                      即時接收接觸紀錄通知
                    </p>
                  </div>
                  <Switch
                    checked={settings.pushContactUpdate}
                    onCheckedChange={(checked) => updateSetting('pushContactUpdate', checked)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 時間偏好 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              時間偏好
            </CardTitle>
            <CardDescription>設定通知的時間與頻率</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>提醒時間</Label>
              <Select
                value={settings.reminderTime}
                onValueChange={(value) => updateSetting('reminderTime', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="07:00">上午 7:00</SelectItem>
                  <SelectItem value="08:00">上午 8:00</SelectItem>
                  <SelectItem value="09:00">上午 9:00</SelectItem>
                  <SelectItem value="10:00">上午 10:00</SelectItem>
                  <SelectItem value="12:00">中午 12:00</SelectItem>
                  <SelectItem value="18:00">下午 6:00</SelectItem>
                  <SelectItem value="20:00">晚上 8:00</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                每日提醒將在此時間發送
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label>通知頻率</Label>
              <Select
                value={settings.frequency}
                onValueChange={(value) => updateSetting('frequency', value as NotificationSettings['frequency'])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">即時通知</SelectItem>
                  <SelectItem value="daily">每日摘要</SelectItem>
                  <SelectItem value="weekly">每週摘要</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                選擇接收通知的頻率
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 儲存按鈕 */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                儲存中...
              </>
            ) : (
              '儲存設定'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
