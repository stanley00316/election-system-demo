import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private lineMessaging: LineMessagingService,
  ) {}

  // ==================== 付款通知 ====================

  /**
   * P0-1: 付款成功通知
   */
  async sendPaymentSuccessNotification(userId: string, paymentId: string) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { subscription: { include: { plan: true } } },
      });
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user?.lineUserId || !payment) return;

      const message =
        `✅ 付款成功\n\n` +
        `方案：${payment.subscription.plan.name}\n` +
        `金額：NT$ ${payment.amount.toLocaleString()}\n` +
        `付款時間：${new Date().toLocaleString('zh-TW')}\n\n` +
        `感謝您的支持！您的訂閱已啟用。`;

      await this.lineMessaging.sendPushMessage(user.lineUserId, message);
    } catch (error) {
      this.logger.error('發送付款成功通知失敗', error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * P0-1: 付款失敗通知
   */
  async sendPaymentFailedNotification(userId: string, paymentId: string) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { subscription: { include: { plan: true } } },
      });
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user?.lineUserId || !payment) return;

      const message =
        `❌ 付款失敗\n\n` +
        `方案：${payment.subscription.plan.name}\n` +
        `金額：NT$ ${payment.amount.toLocaleString()}\n` +
        `原因：${payment.failureReason || '付款處理異常'}\n\n` +
        `請確認付款方式後重新嘗試。`;

      await this.lineMessaging.sendPushMessage(user.lineUserId, message);
    } catch (error) {
      this.logger.error('發送付款失敗通知失敗', error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * P0-1: 試用到期提醒
   */
  async sendTrialExpiringReminder(userId: string, daysLeft: number) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.lineUserId) return;

      const urgency = daysLeft <= 1 ? '⚠️' : '⏰';
      const message =
        `${urgency} 試用期即將結束\n\n` +
        `您的免費試用還剩 ${daysLeft} 天。\n` +
        `試用結束後將無法使用進階功能。\n\n` +
        `立即升級付費方案，繼續享有完整功能！`;

      await this.lineMessaging.sendPushMessage(user.lineUserId, message);
    } catch (error) {
      this.logger.error('發送試用到期提醒失敗', error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * P0-1: 訂閱即將到期提醒
   */
  async sendSubscriptionExpiringReminder(userId: string, daysLeft: number) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.lineUserId) return;

      const message =
        `📅 訂閱即將到期\n\n` +
        `您的訂閱將於 ${daysLeft} 天後到期。\n` +
        `請及時續約以避免服務中斷。`;

      await this.lineMessaging.sendPushMessage(user.lineUserId, message);
    } catch (error) {
      this.logger.error('發送訂閱到期提醒失敗', error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * P0-1: 訂閱已過期通知
   */
  async sendSubscriptionExpiredNotification(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.lineUserId) return;

      const message =
        `🔴 訂閱已過期\n\n` +
        `您的訂閱已過期，進階功能已暫停。\n` +
        `資料保留 30 天緩衝期，逾期將自動清除。\n\n` +
        `請儘速續約以恢復服務。`;

      await this.lineMessaging.sendPushMessage(user.lineUserId, message);
    } catch (error) {
      this.logger.error('發送訂閱過期通知失敗', error instanceof Error ? error.stack : undefined);
    }
  }

  // ==================== P1-7: 逾期催收通知 ====================

  /**
   * 逾期第 1 天通知
   */
  async sendDunningDay1(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.lineUserId) return;

      const message =
        `⚠️ 付款逾期通知\n\n` +
        `您的訂閱付款已逾期，請儘快更新付款方式。\n` +
        `如不處理，服務可能會中斷。`;

      await this.lineMessaging.sendPushMessage(user.lineUserId, message);
    } catch (error) {
      this.logger.error('發送催收通知失敗', error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * 逾期第 3 天通知
   */
  async sendDunningDay3(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.lineUserId) return;

      const message =
        `🔶 付款逾期提醒（第二次）\n\n` +
        `您的訂閱已逾期 3 天，請立即處理。\n` +
        `如未在 14 天內完成付款，訂閱將自動取消。`;

      await this.lineMessaging.sendPushMessage(user.lineUserId, message);
    } catch (error) {
      this.logger.error('發送催收通知失敗', error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * 逾期第 7 天 — 最後通知
   */
  async sendDunningDay7(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.lineUserId) return;

      const message =
        `🔴 最後付款提醒\n\n` +
        `您的訂閱已逾期 7 天。\n` +
        `再不處理將於 7 天後暫停服務。\n\n` +
        `請立即完成付款以保留您的資料！`;

      await this.lineMessaging.sendPushMessage(user.lineUserId, message);
    } catch (error) {
      this.logger.error('發送催收通知失敗', error instanceof Error ? error.stack : undefined);
    }
  }

  // ==================== 原有通知功能 ====================

  async sendFollowUpReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const contacts = await this.prisma.contact.findMany({
      where: {
        followUpDate: { gte: today, lt: tomorrow },
      },
      include: {
        voter: { select: { id: true, name: true, phone: true, address: true } },
        user: { select: { id: true, lineUserId: true, name: true } },
      },
    });

    for (const contact of contacts) {
      if (contact.user?.lineUserId) {
        await this.lineMessaging.sendPushMessage(
          contact.user.lineUserId,
          `📋 追蹤提醒\n\n選民：${contact.voter?.name}\n地址：${contact.voter?.address || '未設定'}\n上次備註：${contact.notes || '無'}\n\n請記得今天追蹤！`,
        );
      }
    }

    return { sent: contacts.length };
  }

  async sendEventReminders() {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const events = await this.prisma.event.findMany({
      where: {
        startTime: { gte: now, lt: twoHoursLater },
        status: { in: ['PLANNED', 'CONFIRMED'] },
      },
      include: {
        attendees: { include: { voter: true } },
        creator: true,
      },
    });

    for (const event of events) {
      if (event.creator?.lineUserId) {
        await this.lineMessaging.sendPushMessage(
          event.creator.lineUserId,
          `🗓️ 活動提醒\n\n${event.name}\n時間：${event.startTime.toLocaleString('zh-TW')}\n地點：${event.address || '未設定'}\n\n活動即將開始！`,
        );
      }
    }

    return { sent: events.length };
  }

  async sendDailySummary(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.lineUserId) return;

    const campaigns = await this.prisma.campaign.findMany({
      where: { ownerId: userId, isActive: true },
    });
    if (campaigns.length === 0) return;

    const campaignId = campaigns[0].id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayContacts, totalVoters, upcomingEvents] = await Promise.all([
      this.prisma.contact.count({ where: { campaignId, contactDate: { gte: today } } }),
      this.prisma.voter.count({ where: { campaignId } }),
      this.prisma.event.count({ where: { campaignId, startTime: { gte: today }, status: { in: ['PLANNED', 'CONFIRMED'] } } }),
    ]);

    const message =
      `📊 每日摘要\n\n` +
      `今日接觸：${todayContacts} 人\n` +
      `選民總數：${totalVoters} 人\n` +
      `待辦活動：${upcomingEvents} 場\n\n` +
      `加油！繼續努力！`;

    await this.lineMessaging.sendPushMessage(user.lineUserId, message);
  }

  async sendCustomNotification(lineUserId: string, message: string) {
    return this.lineMessaging.sendPushMessage(lineUserId, message);
  }
}
