import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('analysis')
@Controller('analysis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalysisController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly campaignsService: CampaignsService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: '取得選情總覽' })
  async getOverview(
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否為 campaign 成員
    await this.campaignsService.checkCampaignAccess(campaignId, userId);
    return this.analysisService.getOverview(campaignId);
  }

  @Get('stance')
  @ApiOperation({ summary: '取得政治傾向分布' })
  async getStanceDistribution(
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.campaignsService.checkCampaignAccess(campaignId, userId);
    return this.analysisService.getStanceDistribution(campaignId);
  }

  @Get('district')
  @ApiOperation({ summary: '取得區域分析' })
  async getDistrictAnalysis(
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.campaignsService.checkCampaignAccess(campaignId, userId);
    return this.analysisService.getDistrictAnalysis(campaignId);
  }

  @Get('trend')
  @ApiOperation({ summary: '取得趨勢分析' })
  async getTrendAnalysis(
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
    @Query('days') days?: number,
  ) {
    await this.campaignsService.checkCampaignAccess(campaignId, userId);
    return this.analysisService.getTrendAnalysis(campaignId, days);
  }

  @Get('win-probability')
  @ApiOperation({ summary: '取得勝選機率' })
  async getWinProbability(
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.campaignsService.checkCampaignAccess(campaignId, userId);
    return this.analysisService.getWinProbability(campaignId);
  }

  @Get('influence')
  @ApiOperation({ summary: '取得影響力分析' })
  async getInfluenceAnalysis(
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.campaignsService.checkCampaignAccess(campaignId, userId);
    return this.analysisService.getInfluenceAnalysis(campaignId);
  }

  @Get('heatmap')
  @ApiOperation({ summary: '取得熱區地圖資料' })
  async getHeatmapData(
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.campaignsService.checkCampaignAccess(campaignId, userId);
    return this.analysisService.getHeatmapData(campaignId);
  }

  @Get('visit-stats')
  @ApiOperation({ summary: '取得拜訪統計' })
  async getVisitStats(
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.campaignsService.checkCampaignAccess(campaignId, userId);
    return this.analysisService.getVisitStats(campaignId);
  }
}
