import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminGuard } from '../../admin-auth/guards/admin.guard';

@Controller('admin/analytics')
@UseGuards(AdminGuard)
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  /**
   * 取得總覽數據
   */
  @Get('overview')
  async getOverview() {
    return this.adminAnalyticsService.getOverview();
  }

  /**
   * 取得用戶成長統計
   */
  @Get('users')
  async getUserGrowth(@Query('days') days?: number) {
    return this.adminAnalyticsService.getUserGrowth(days || 30);
  }

  /**
   * 取得營收報表
   */
  @Get('revenue')
  async getRevenueReport(@Query('months') months?: number) {
    return this.adminAnalyticsService.getRevenueReport(months || 12);
  }

  /**
   * 取得訂閱分佈
   */
  @Get('subscriptions')
  async getSubscriptionDistribution() {
    return this.adminAnalyticsService.getSubscriptionDistribution();
  }

  /**
   * 取得最近活動
   */
  @Get('recent')
  async getRecentActivity(@Query('limit') limit?: number) {
    return this.adminAnalyticsService.getRecentActivity(limit || 20);
  }
}
