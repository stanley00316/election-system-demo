import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleService } from '../auth/google.service';
import { google, calendar_v3 } from 'googleapis';

interface ScheduleWithItems {
  id: string;
  title: string;
  description?: string;
  date: Date;
  status: string;
  googleEventId?: string;
  items: Array<{
    id: string;
    order: number;
    address?: string;
    plannedTime?: Date;
    duration?: number;
    notes?: string;
    voter?: {
      name: string;
      phone?: string;
      address?: string;
    };
    event?: {
      name: string;
    };
  }>;
  user: {
    id: string;
    googleCalendarId?: string;
  };
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private prisma: PrismaService,
    private googleService: GoogleService,
  ) {}

  /**
   * 將行程同步到 Google Calendar
   */
  async syncScheduleToGoogle(scheduleId: string, userId: string): Promise<void> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        items: {
          include: {
            voter: true,
            event: true,
          },
          orderBy: { order: 'asc' },
        },
        user: true,
      },
    });

    if (!schedule) {
      throw new BadRequestException('行程不存在');
    }

    if (schedule.userId !== userId) {
      throw new BadRequestException('無權限同步此行程');
    }

    const authClient = await this.googleService.getAuthClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: authClient });
    const calendarId = schedule.user.googleCalendarId || 'primary';

    const event = this.formatScheduleToEvent(schedule as ScheduleWithItems);

    if (schedule.googleEventId) {
      // 更新現有事件
      await this.updateEvent(calendar, calendarId, schedule.googleEventId, event);
    } else {
      // 建立新事件
      const createdEvent = await this.createEvent(calendar, calendarId, event);
      
      // 儲存 Google Event ID
      await this.prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          googleEventId: createdEvent.id,
          lastSyncedAt: new Date(),
          syncEnabled: true,
        },
      });
    }

    // 更新同步時間
    await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: { lastSyncedAt: new Date() },
    });
  }

  /**
   * 從 Google Calendar 刪除事件
   */
  async deleteEventFromGoogle(scheduleId: string, userId: string): Promise<void> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: { user: true },
    });

    if (!schedule || !schedule.googleEventId) {
      return;
    }

    if (schedule.userId !== userId) {
      throw new BadRequestException('無權限操作此行程');
    }

    try {
      const authClient = await this.googleService.getAuthClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: authClient });
      const calendarId = schedule.user.googleCalendarId || 'primary';

      await calendar.events.delete({
        calendarId,
        eventId: schedule.googleEventId,
      });
    } catch (error) {
      this.logger.warn('Failed to delete Google event', error instanceof Error ? error.message : undefined);
    }

    // 清除 Google Event ID
    await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        googleEventId: null,
        syncEnabled: false,
      },
    });
  }

  /**
   * 同步所有啟用的行程
   */
  async syncAllSchedules(userId: string): Promise<{ synced: number; failed: number }> {
    const schedules = await this.prisma.schedule.findMany({
      where: {
        userId,
        syncEnabled: true,
      },
      select: { id: true },
    });

    let synced = 0;
    let failed = 0;

    for (const schedule of schedules) {
      try {
        await this.syncScheduleToGoogle(schedule.id, userId);
        synced++;
      } catch (error) {
        this.logger.error(`Failed to sync schedule ${schedule.id}`, error instanceof Error ? error.stack : undefined);
        failed++;
      }
    }

    return { synced, failed };
  }

  /**
   * 將行程格式化為 Google Calendar 事件
   */
  private formatScheduleToEvent(schedule: ScheduleWithItems): calendar_v3.Schema$Event {
    const items = schedule.items || [];
    
    // 建立詳細說明
    const itemDetails = items.map((item, index) => {
      const lines: string[] = [];
      lines.push(`【${index + 1}】${item.voter?.name || item.event?.name || item.address || '未命名'}`);
      
      if (item.voter) {
        if (item.voter.phone) lines.push(`   電話：${item.voter.phone}`);
        if (item.voter.address) lines.push(`   地址：${item.voter.address}`);
      }
      
      if (item.address && item.address !== item.voter?.address) {
        lines.push(`   地點：${item.address}`);
      }
      
      if (item.notes) lines.push(`   備註：${item.notes}`);
      
      return lines.join('\n');
    }).join('\n\n');

    const description = [
      schedule.description || '',
      '',
      '═══════ 行程項目 ═══════',
      '',
      itemDetails,
    ].filter(Boolean).join('\n');

    // 取得第一個和最後一個項目的時間
    const firstItem = items[0];
    const lastItem = items[items.length - 1];

    // 計算開始和結束時間
    let startTime: Date;
    let endTime: Date;

    if (firstItem?.plannedTime) {
      startTime = new Date(firstItem.plannedTime);
    } else {
      startTime = new Date(schedule.date);
      startTime.setHours(9, 0, 0, 0); // 預設早上 9 點
    }

    if (lastItem?.plannedTime) {
      endTime = new Date(lastItem.plannedTime);
      // 加上預估的持續時間
      const duration = lastItem.duration || 30;
      endTime.setMinutes(endTime.getMinutes() + duration);
    } else {
      endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2); // 預設 2 小時
    }

    // 取得第一個有地址的項目作為地點
    const locationItem = items.find((item) => item.address);

    return {
      summary: schedule.title,
      description,
      location: locationItem?.address,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Asia/Taipei',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Taipei',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 }, // 1 小時前提醒
          { method: 'popup', minutes: 15 }, // 15 分鐘前提醒
        ],
      },
    };
  }

  /**
   * 建立 Google Calendar 事件
   */
  private async createEvent(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    event: calendar_v3.Schema$Event,
  ): Promise<calendar_v3.Schema$Event> {
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return response.data;
  }

  /**
   * 更新 Google Calendar 事件
   */
  private async updateEvent(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    eventId: string,
    event: calendar_v3.Schema$Event,
  ): Promise<calendar_v3.Schema$Event> {
    try {
      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: event,
      });
      return response.data;
    } catch (error: any) {
      // 如果事件不存在，則建立新的
      if (error.code === 404) {
        return this.createEvent(calendar, calendarId, event);
      }
      throw error;
    }
  }

  /**
   * 取得 Google Calendar 變更（用於雙向同步）
   */
  async getCalendarChanges(
    userId: string,
    syncToken?: string,
  ): Promise<{
    events: calendar_v3.Schema$Event[];
    nextSyncToken?: string;
  }> {
    const authClient = await this.googleService.getAuthClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarId: true },
    });

    const calendarId = user?.googleCalendarId || 'primary';

    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId,
      singleEvents: true,
    };

    if (syncToken) {
      params.syncToken = syncToken;
    } else {
      // 初次同步，只取近期事件
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      params.timeMin = oneMonthAgo.toISOString();
    }

    const response = await calendar.events.list(params);

    return {
      events: response.data.items || [],
      nextSyncToken: response.data.nextSyncToken || undefined,
    };
  }

  /**
   * 切換行程的同步狀態
   */
  async toggleSync(scheduleId: string, userId: string, enabled: boolean): Promise<void> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule || schedule.userId !== userId) {
      throw new BadRequestException('無權限操作此行程');
    }

    if (enabled) {
      // 啟用同步並立即同步
      await this.syncScheduleToGoogle(scheduleId, userId);
    } else {
      // 停用同步（可選擇是否刪除 Google 事件）
      await this.prisma.schedule.update({
        where: { id: scheduleId },
        data: { syncEnabled: false },
      });
    }
  }
}
