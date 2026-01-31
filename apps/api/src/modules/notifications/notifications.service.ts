import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LineMessagingService } from './line-messaging.service';

export interface ReminderConfig {
  campaignId: string;
  userId: string;
  type: 'follow_up' | 'birthday' | 'event' | 'custom';
  title: string;
  message: string;
  scheduledAt: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private lineMessaging: LineMessagingService,
  ) {}

  // 發送追蹤提醒
  async sendFollowUpReminders() {
    // 查詢今天需要追蹤的接觸紀錄
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const contacts = await this.prisma.contact.findMany({
      where: {
        followUpDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        voter: {
          select: { id: true, name: true, phone: true, address: true },
        },
        user: {
          select: { id: true, lineUserId: true, name: true },
        },
      },
    });

    for (const contact of contacts) {
      if (contact.user?.lineUserId) {
        await this.lineMessaging.sendPushMessage(
          contact.user.lineUserId,
          `📋 追蹤提醒\n\n選民：${contact.voter?.name}\n地址：${contact.voter?.address || '未設定'}\n上次備註：${contact.notes || '無'}\n\n請記得今天追蹤！`
        );
      }
    }

    return { sent: contacts.length };
  }

  // 發送活動提醒
  async sendEventReminders() {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const events = await this.prisma.event.findMany({
      where: {
        startTime: {
          gte: now,
          lt: twoHoursLater,
        },
        status: { in: ['PLANNED', 'CONFIRMED'] },
      },
      include: {
        attendees: {
          include: {
            voter: true,
          },
        },
        creator: true,
      },
    });

    for (const event of events) {
      // 通知活動建立者
      if (event.creator?.lineUserId) {
        await this.lineMessaging.sendPushMessage(
          event.creator.lineUserId,
          `🗓️ 活動提醒\n\n${event.name}\n時間：${event.startTime.toLocaleString('zh-TW')}\n地點：${event.address || '未設定'}\n\n活動即將開始！`
        );
      }
    }

    return { sent: events.length };
  }

  // 發送每日摘要
  async sendDailySummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.lineUserId) return;

    // 取得使用者的活動
    const campaigns = await this.prisma.campaign.findMany({
      where: { ownerId: userId, isActive: true },
    });

    if (campaigns.length === 0) return;

    const campaignId = campaigns[0].id;

    // 統計今日資料
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayContacts, totalVoters, upcomingEvents] = await Promise.all([
      this.prisma.contact.count({
        where: {
          campaignId,
          contactDate: { gte: today },
        },
      }),
      this.prisma.voter.count({
        where: { campaignId },
      }),
      this.prisma.event.count({
        where: {
          campaignId,
          startTime: { gte: today },
          status: { in: ['PLANNED', 'CONFIRMED'] },
        },
      }),
    ]);

    const message = `📊 每日摘要\n\n` +
      `今日接觸：${todayContacts} 人\n` +
      `選民總數：${totalVoters} 人\n` +
      `待辦活動：${upcomingEvents} 場\n\n` +
      `加油！繼續努力！`;

    await this.lineMessaging.sendPushMessage(user.lineUserId, message);
  }

  // 發送自訂通知
  async sendCustomNotification(
    lineUserId: string,
    message: string,
  ) {
    return this.lineMessaging.sendPushMessage(lineUserId, message);
  }
}
