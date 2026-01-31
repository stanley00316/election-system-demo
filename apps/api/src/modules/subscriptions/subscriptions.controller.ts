import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CancelSubscriptionDto } from './dto/create-subscription.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * 取得所有可用方案
   */
  @Get('plans')
  async getPlans() {
    return this.subscriptionsService.getPlans();
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
  @HttpCode(HttpStatus.CREATED)
  async startTrial(@CurrentUser() user: any) {
    return this.subscriptionsService.startTrial(user.id);
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
}
