import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('analysis')
@Controller('analysis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('overview')
  @ApiOperation({ summary: '取得選情總覽' })
  async getOverview(@Query('campaignId') campaignId: string) {
    return this.analysisService.getOverview(campaignId);
  }

  @Get('stance')
  @ApiOperation({ summary: '取得政治傾向分布' })
  async getStanceDistribution(@Query('campaignId') campaignId: string) {
    return this.analysisService.getStanceDistribution(campaignId);
  }

  @Get('district')
  @ApiOperation({ summary: '取得區域分析' })
  async getDistrictAnalysis(@Query('campaignId') campaignId: string) {
    return this.analysisService.getDistrictAnalysis(campaignId);
  }

  @Get('trend')
  @ApiOperation({ summary: '取得趨勢分析' })
  async getTrendAnalysis(
    @Query('campaignId') campaignId: string,
    @Query('days') days?: number,
  ) {
    return this.analysisService.getTrendAnalysis(campaignId, days);
  }

  @Get('win-probability')
  @ApiOperation({ summary: '取得勝選機率' })
  async getWinProbability(@Query('campaignId') campaignId: string) {
    return this.analysisService.getWinProbability(campaignId);
  }

  @Get('influence')
  @ApiOperation({ summary: '取得影響力分析' })
  async getInfluenceAnalysis(@Query('campaignId') campaignId: string) {
    return this.analysisService.getInfluenceAnalysis(campaignId);
  }

  @Get('heatmap')
  @ApiOperation({ summary: '取得熱區地圖資料' })
  async getHeatmapData(@Query('campaignId') campaignId: string) {
    return this.analysisService.getHeatmapData(campaignId);
  }

  @Get('visit-stats')
  @ApiOperation({ summary: '取得拜訪統計' })
  async getVisitStats(@Query('campaignId') campaignId: string) {
    return this.analysisService.getVisitStats(campaignId);
  }
}
