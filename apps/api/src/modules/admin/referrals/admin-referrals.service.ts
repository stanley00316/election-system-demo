import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReferralsService } from '../../referrals/referrals.service';
import { ReferralStatus } from '@prisma/client';

@Injectable()
export class AdminReferralsService {
  constructor(
    private referralsService: ReferralsService,
    private prisma: PrismaService,
  ) {}

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

  /**
   * 匯出推薦紀錄（CSV 資料）
   */
  async exportReferrals(status?: ReferralStatus) {
    const where: any = {};
    if (status) where.status = status;

    const referrals = await this.prisma.referral.findMany({
      where,
      include: {
        referrer: { select: { id: true, name: true, email: true, phone: true } },
        referred: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      '推薦ID', '推薦人', '推薦人Email', '被推薦人', '被推薦人Email',
      '推薦碼', '狀態', '獎勵月數', '建立時間',
    ];

    const rows = referrals.map((r) => [
      r.id,
      r.referrer?.name || '',
      r.referrer?.email || '',
      r.referred?.name || '',
      r.referred?.email || '',
      r.referralCode,
      r.status,
      r.rewardMonths,
      r.createdAt.toISOString().split('T')[0],
    ]);

    return { headers, rows, total: referrals.length };
  }
}
