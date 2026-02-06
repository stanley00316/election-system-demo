import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminReferralsService } from './admin-referrals.service';
import { AdminGuard } from '../../admin-auth/guards/admin.guard';
import { ReferralFilterDto } from './dto/referral-filter.dto';

@Controller('admin/referrals')
@UseGuards(AdminGuard)
export class AdminReferralsController {
  constructor(private readonly adminReferralsService: AdminReferralsService) {}

  /**
   * 取得所有推薦記錄
   */
  @Get()
  async getAllReferrals(@Query() filter: ReferralFilterDto) {
    return this.adminReferralsService.getAllReferrals({
      status: filter.status,
      page: filter.page,
      limit: filter.limit,
      startDate: filter.startDate,
      endDate: filter.endDate,
    });
  }

  /**
   * 取得推薦統計
   */
  @Get('stats')
  async getReferralStats() {
    return this.adminReferralsService.getReferralStats();
  }

  /**
   * 取得推薦排行榜
   */
  @Get('leaderboard')
  async getReferralLeaderboard(@Query('limit') limit?: string) {
    return this.adminReferralsService.getReferralLeaderboard(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * 手動過期舊的推薦記錄
   */
  @Post('expire-old')
  @HttpCode(HttpStatus.OK)
  async expireOldReferrals() {
    const count = await this.adminReferralsService.expireOldReferrals();
    return {
      success: true,
      expiredCount: count,
      message: `已過期 ${count} 筆推薦記錄`,
    };
  }
}
