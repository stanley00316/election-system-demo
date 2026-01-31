import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from '../subscriptions.service';

// Decorator key for requiring subscription
export const REQUIRE_SUBSCRIPTION_KEY = 'requireSubscription';

/**
 * 訂閱狀態 Guard
 * 檢查使用者是否有有效訂閱（試用中或付費訂閱）
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 檢查是否需要訂閱驗證
    const requireSubscription = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果沒有設定 @RequireSubscription()，則不檢查
    if (!requireSubscription) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('請先登入');
    }

    // 檢查訂閱狀態
    const hasSubscription = await this.subscriptionsService.hasActiveSubscription(user.id);

    if (!hasSubscription) {
      throw new ForbiddenException({
        message: '此功能需要有效訂閱',
        code: 'SUBSCRIPTION_REQUIRED',
        upgradeUrl: '/pricing',
      });
    }

    return true;
  }
}
