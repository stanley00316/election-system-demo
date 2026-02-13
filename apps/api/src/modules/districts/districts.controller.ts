import { Controller, Get, Param, Query, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DistrictLevel } from '@prisma/client';
import { DistrictsService } from './districts.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('districts')
@Controller('districts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DistrictsController {
  constructor(
    private readonly districtsService: DistrictsService,
    private readonly campaignsService: CampaignsService,
  ) {}

  @Get()
  @ApiOperation({ summary: '取得所有選區' })
  async findAll(@Query('level') level?: DistrictLevel) {
    return this.districtsService.findAll(level);
  }

  @Get('city/:city')
  @ApiOperation({ summary: '取得縣市下的區' })
  async findByCity(@Param('city') city: string) {
    return this.districtsService.findByCity(city);
  }

  @Get(':id')
  @ApiOperation({ summary: '取得選區詳情' })
  async findById(@Param('id') id: string) {
    return this.districtsService.findById(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: '取得下級選區' })
  async findChildren(@Param('id') id: string) {
    return this.districtsService.findByParent(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '取得選區統計' })
  async getStats(
    @Param('id') id: string,
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.campaignsService.checkCampaignAccess(campaignId, userId);
    return this.districtsService.getStats(id, campaignId);
  }

  @Post('seed')
  @ApiOperation({ summary: '初始化台灣選區資料' })
  async seed() {
    return this.districtsService.seedTaiwanDistricts();
  }
}
