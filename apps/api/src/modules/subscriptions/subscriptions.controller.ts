import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CancelSubscriptionDto } from './dto/create-subscription.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * 取得所有可用方案（舊版本，相容性保留）
   */
  @Get('plans')
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  /**
   * 取得可用縣市列表（按戰區分組）- 公開端點
   */
  @Public()
  @Get('pricing/cities')
  async getAvailableCities() {
    return this.subscriptionsService.getAvailableCities();
  }

  /**
   * 取得選舉類型列表 - 公開端點
   */
  @Public()
  @Get('pricing/election-types')
  getElectionTypes() {
    return this.subscriptionsService.getElectionTypes();
  }

  /**
   * 根據縣市取得該縣市所有選舉類型的方案 - 公開端點
   */
  @Public()
  @Get('pricing/by-city')
  async getPlansByCity(@Query('city') city: string) {
    if (!city) {
      return { error: '請提供縣市名稱' };
    }
    return this.subscriptionsService.getPlansByCity(city);
  }

  /**
   * 根據縣市和選舉類型取得方案 - 公開端點
   */
  @Public()
  @Get('pricing/plan')
  async getPlanByLocation(
    @Query('city') city: string,
    @Query('electionType') electionType: string,
  ) {
    if (!city || !electionType) {
      return { error: '請提供縣市和選舉類型' };
    }
    return this.subscriptionsService.getPlanByLocation(city, electionType);
  }

  /**
   * 取得目前訂閱狀態
   */
  @Get('current')
  async getCurrentSubscription(@CurrentUser() user: any) {
    const subscription = await this.subscriptionsService.getCurrentSubscription(user.id);
    
    return {
      hasSubscription: !!subscription,
      subscription,
    };
  }

  /**
   * 開始免費試用
   */
  @Post('trial')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.CREATED)
  async startTrial(@CurrentUser() user: any) {
    return this.subscriptionsService.startTrial(user.id);
  }

  /**
   * 建立待付款訂閱（PENDING）
   */
  @Post('subscribe')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  async createPendingSubscription(
    @CurrentUser() user: any,
    @Body('planId') planId: string,
  ) {
    if (!planId) {
      return { error: '請提供方案 ID' };
    }
    return this.subscriptionsService.createPendingSubscription(user.id, planId);
  }

  /**
   * 取得待付款訂閱
   */
  @Get('pending')
  async getPendingSubscription(@CurrentUser() user: any) {
    const subscription = await this.subscriptionsService.getPendingSubscription(user.id);
    return { hasPending: !!subscription, subscription };
  }

  /**
   * 取消訂閱
   */
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @CurrentUser() user: any,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionsService.cancelSubscription(user.id, dto.reason);
  }

  /**
   * 取得訂閱歷史
   */
  @Get('history')
  async getSubscriptionHistory(@CurrentUser() user: any) {
    return this.subscriptionsService.getSubscriptionHistory(user.id);
  }

  /**
   * 檢查是否有有效訂閱（供前端快速檢查用）
   */
  @Get('check')
  async checkSubscription(@CurrentUser() user: any) {
    const hasSubscription = await this.subscriptionsService.hasActiveSubscription(user.id);
    const subscription = hasSubscription 
      ? await this.subscriptionsService.getCurrentSubscription(user.id)
      : null;

    return {
      hasSubscription,
      status: subscription?.status || null,
      plan: subscription?.plan || null,
      expiresAt: subscription?.currentPeriodEnd || null,
      isTrialing: subscription?.status === 'TRIAL',
      trialEndsAt: subscription?.trialEndsAt || null,
    };
  }

  // ==================== P0-3: 方案升降級 ====================

  /**
   * 預覽升級
   */
  @Get('upgrade/preview/:planId')
  async previewUpgrade(
    @CurrentUser() user: any,
    @Param('planId') planId: string,
  ) {
    return this.subscriptionsService.previewUpgrade(user.id, planId);
  }

  /**
   * 執行升級
   */
  @Post('upgrade/:planId')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async upgradeSubscription(
    @CurrentUser() user: any,
    @Param('planId') planId: string,
  ) {
    return this.subscriptionsService.upgradeSubscription(user.id, planId);
  }

  /**
   * 預覽降級
   */
  @Get('downgrade/preview/:planId')
  async previewDowngrade(
    @CurrentUser() user: any,
    @Param('planId') planId: string,
  ) {
    return this.subscriptionsService.previewDowngrade(user.id, planId);
  }

  /**
   * 排程降級
   */
  @Post('downgrade/:planId')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async downgradeSubscription(
    @CurrentUser() user: any,
    @Param('planId') planId: string,
  ) {
    return this.subscriptionsService.downgradeSubscription(user.id, planId);
  }

  /**
   * 取消排程降級
   */
  @Post('downgrade/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelDowngrade(@CurrentUser() user: any) {
    return this.subscriptionsService.cancelDowngrade(user.id);
  }

  // ==================== P2-11: 自動續約 ====================

  /**
   * 切換自動續約
   */
  @Put('auto-renew')
  async toggleAutoRenew(
    @CurrentUser() user: any,
    @Body('autoRenew') autoRenew: boolean,
  ) {
    return this.subscriptionsService.toggleAutoRenew(user.id, autoRenew);
  }
}
