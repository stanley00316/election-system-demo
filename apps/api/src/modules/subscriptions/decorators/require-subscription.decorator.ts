import { SetMetadata } from '@nestjs/common';
import { REQUIRE_SUBSCRIPTION_KEY } from '../guards/subscription.guard';

/**
 * 標記此 API 需要有效訂閱才能使用
 * 
 * 使用方式：
 * @RequireSubscription()
 * @Get('protected-endpoint')
 * async protectedMethod() { ... }
 * 
 * 或者套用到整個 Controller：
 * @RequireSubscription()
 * @Controller('protected')
 * export class ProtectedController { ... }
 */
export const RequireSubscription = () => SetMetadata(REQUIRE_SUBSCRIPTION_KEY, true);
