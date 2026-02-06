import { Injectable } from '@nestjs/common';
import { ReferralsService } from '../../referrals/referrals.service';
import { ReferralStatus } from '@prisma/client';

@Injectable()
export class AdminReferralsService {
  constructor(private referralsService: ReferralsService) {}

  /**
   * 取得所有推薦記錄（含分頁與篩選）
   */
  async getAllReferrals(options: {
    status?: ReferralStatus;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    return this.referralsService.getAllReferrals({
      status: options.status,
      page: options.page,
      limit: options.limit,
      startDate: options.startDate ? new Date(options.startDate) : undefined,
      endDate: options.endDate ? new Date(options.endDate) : undefined,
    });
  }

  /**
   * 取得推薦統計總覽
   */
  async getReferralStats() {
    return this.referralsService.getAdminReferralStats();
  }

  /**
   * 取得推薦排行榜
   */
  async getReferralLeaderboard(limit: number = 10) {
    return this.referralsService.getReferralLeaderboard(limit);
  }

  /**
   * 過期舊的推薦記錄
   */
  async expireOldReferrals() {
    return this.referralsService.expireOldReferrals();
  }
}
