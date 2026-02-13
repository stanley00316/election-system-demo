import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminGuard } from '../../admin-auth/guards/admin.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('admin/analytics')
@UseGuards(AdminGuard)
@ApiBearerAuth()
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

  // ==================== 用戶深度分析 ====================

  /**
   * 留存率同期群分析
   */
  @Get('retention')
  async getRetentionAnalysis(@Query('months') months?: number) {
    return this.adminAnalyticsService.getRetentionAnalysis(months || 6);
  }

  /**
   * DAU/MAU 活躍用戶統計
   */
  @Get('active-users')
  async getActiveUserStats(@Query('days') days?: number) {
    return this.adminAnalyticsService.getActiveUserStats(days || 30);
  }

  /**
   * 訂閱生命週期分析
   */
  @Get('subscription-lifecycle')
  async getSubscriptionLifecycle() {
    return this.adminAnalyticsService.getSubscriptionLifecycle();
  }

  /**
   * 地理分佈分析
   */
  @Get('geographic')
  async getGeographicDistribution() {
    return this.adminAnalyticsService.getGeographicDistribution();
  }

  /**
   * 地區總覽：每個地區所有使用者的完整選情數據
   */
  @Get('regional-overview')
  async getRegionalOverview(
    @Query('city') city?: string,
    @Query('electionType') electionType?: string,
  ) {
    return this.adminAnalyticsService.getRegionalOverview(city, electionType);
  }

  /**
   * 匯出地區總覽（CSV）
   */
  @Get('regional-overview/export')
  async exportRegionalOverview(
    @Query('city') city: string | undefined,
    @Query('electionType') electionType: string | undefined,
    @Res() res: Response,
  ) {
    const data = await this.adminAnalyticsService.exportRegionalOverview(city, electionType);

    const csvRows = [
      data.headers.join(','),
      ...data.rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="regional_overview_${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(csvContent);
  }

  /**
   * 用戶行為分析
   */
  @Get('behavior')
  async getUserBehaviorAnalysis() {
    return this.adminAnalyticsService.getUserBehaviorAnalysis();
  }

  /**
   * 用戶價值分析
   */
  @Get('user-value')
  async getUserValueAnalysis() {
    return this.adminAnalyticsService.getUserValueAnalysis();
  }
}
