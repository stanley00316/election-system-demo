import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ReferralsService } from '../referrals/referrals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly referralsService: ReferralsService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 每天凌晨 2 點檢查並處理過期訂閱
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExpiredSubscriptions() {
    this.logger.log('開始檢查過期訂閱...');
    try {
      const expiredCount = await this.subscriptionsService.checkAndExpireSubscriptions();
      this.logger.log(`已更新 ${expiredCount} 個過期訂閱`);

      const gracePeriodCount = await this.subscriptionsService.setGracePeriodForExpiredSubscriptions();
      this.logger.log(`已為 ${gracePeriodCount} 個 Campaign 設置緩衝期`);

      const markedCount = await this.subscriptionsService.markCampaignsForDeletion();
      this.logger.log(`已標記 ${markedCount} 個 Campaign 為待刪除`);
    } catch (error) {
      this.logger.error('處理過期訂閱時發生錯誤:', error);
    }
  }

  /**
   * 每天凌晨 3 點過期未完成的推薦
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleExpiredReferrals() {
    this.logger.log('開始檢查過期推薦...');
    try {
      const expiredCount = await this.referralsService.expireOldReferrals();
      this.logger.log(`已過期 ${expiredCount} 筆推薦記錄`);
    } catch (error) {
      this.logger.error('處理過期推薦時發生錯誤:', error);
    }
  }

  /**
   * P0-1: 每天上午 9 點 — 試用到期提醒
   */
  @Cron('0 9 * * *')
  async handleTrialExpiringReminders() {
    this.logger.log('開始發送試用到期提醒...');
    try {
      // 剩餘 3 天的試用
      const expiring3 = await this.subscriptionsService.getExpiringTrials(3);
      for (const sub of expiring3) {
        const daysLeft = Math.ceil(
          (sub.trialEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        if (daysLeft >= 2 && daysLeft <= 3) {
          await this.notificationsService.sendTrialExpiringReminder(sub.userId, daysLeft);
        }
      }

      // 剩餘 1 天的試用
      const expiring1 = await this.subscriptionsService.getExpiringTrials(1);
      for (const sub of expiring1) {
        const daysLeft = Math.ceil(
          (sub.trialEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        if (daysLeft <= 1) {
          await this.notificationsService.sendTrialExpiringReminder(sub.userId, daysLeft);
        }
      }

      this.logger.log(`已發送 ${expiring3.length + expiring1.length} 筆試用到期提醒`);
    } catch (error) {
      this.logger.error('發送試用到期提醒失敗:', error);
    }
  }

  /**
   * P0-1: 每天上午 9:30 — 付費訂閱到期提醒（7天、3天、1天前）
   */
  @Cron('30 9 * * *')
  async handleSubscriptionExpiringReminders() {
    this.logger.log('開始發送訂閱到期提醒...');
    try {
      const now = new Date();

      for (const daysAhead of [7, 3, 1]) {
        const targetDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        const expiringSubscriptions = await this.prisma.subscription.findMany({
          where: {
            status: SubscriptionStatus.ACTIVE,
            autoRenew: false,
            currentPeriodEnd: { gte: dayStart, lte: dayEnd },
          },
          select: { userId: true },
        });

        for (const sub of expiringSubscriptions) {
          await this.notificationsService.sendSubscriptionExpiringReminder(sub.userId, daysAhead);
        }
        this.logger.log(`已發送 ${expiringSubscriptions.length} 筆 ${daysAhead} 天到期提醒`);
      }
    } catch (error) {
      this.logger.error('發送訂閱到期提醒失敗:', error);
    }
  }

  /**
   * P1-7: 每天上午 10 點 — 逾期催收
   */
  @Cron('0 10 * * *')
  async handleDunning() {
    this.logger.log('開始逾期催收...');
    try {
      const now = new Date();

      const pastDueSubscriptions = await this.prisma.subscription.findMany({
        where: { status: SubscriptionStatus.PAST_DUE },
        select: { id: true, userId: true, currentPeriodEnd: true },
      });

      for (const sub of pastDueSubscriptions) {
        const daysPastDue = Math.floor(
          (now.getTime() - sub.currentPeriodEnd.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysPastDue === 1) {
          await this.notificationsService.sendDunningDay1(sub.userId);
        } else if (daysPastDue === 3) {
          await this.notificationsService.sendDunningDay3(sub.userId);
        } else if (daysPastDue === 7) {
          await this.notificationsService.sendDunningDay7(sub.userId);
        } else if (daysPastDue >= 14) {
          // 自動標記為 EXPIRED
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: SubscriptionStatus.EXPIRED },
          });
          await this.notificationsService.sendSubscriptionExpiredNotification(sub.userId);
          this.logger.log(`訂閱 ${sub.id} 因逾期超過 14 天自動過期`);
        }
      }

      this.logger.log(`已處理 ${pastDueSubscriptions.length} 筆逾期催收`);
    } catch (error) {
      this.logger.error('逾期催收處理失敗:', error);
    }
  }

  /**
   * 手動觸發訂閱檢查（供管理員使用）
   */
  async manualCheckSubscriptions() {
    this.logger.log('手動觸發訂閱檢查...');
    await this.handleExpiredSubscriptions();
    return { message: '訂閱檢查完成' };
  }

  /**
   * 手動觸發推薦過期檢查（供管理員使用）
   */
  async manualCheckReferrals() {
    this.logger.log('手動觸發推薦過期檢查...');
    await this.handleExpiredReferrals();
    return { message: '推薦過期檢查完成' };
  }
}
