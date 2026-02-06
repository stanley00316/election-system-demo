import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ReferralsService } from '../referrals/referrals.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly referralsService: ReferralsService,
  ) {}

  /**
   * 每天凌晨 2 點檢查並處理過期訂閱
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExpiredSubscriptions() {
    this.logger.log('開始檢查過期訂閱...');

    try {
      // 1. 更新過期的訂閱狀態
      const expiredCount =
        await this.subscriptionsService.checkAndExpireSubscriptions();
      this.logger.log(`已更新 ${expiredCount} 個過期訂閱`);

      // 2. 為新過期的訂閱設置緩衝期
      const gracePeriodCount =
        await this.subscriptionsService.setGracePeriodForExpiredSubscriptions();
      this.logger.log(`已為 ${gracePeriodCount} 個 Campaign 設置緩衝期`);

      // 3. 標記緩衝期已過的 Campaign 為待刪除
      const markedCount =
        await this.subscriptionsService.markCampaignsForDeletion();
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
