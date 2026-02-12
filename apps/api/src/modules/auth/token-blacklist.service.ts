import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * OWASP A07: JWT Token 黑名單服務
 *
 * 使用 Redis 儲存已撤銷的 token，用於：
 * - 使用者登出時撤銷 token
 * - 管理員停用帳號時撤銷該使用者所有 token
 * - Token 過期後自動從 Redis 清除（利用 TTL）
 *
 * 降級模式：若 Redis 不可用，黑名單功能停用，
 * 系統退回到僅依賴 token 過期時間的方式。
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly PREFIX = 'token_blacklist:';

  constructor(private redis: RedisService) {}

  /**
   * 將 token 加入黑名單
   * @param jti token 的唯一識別碼（JWT ID），使用 userId + iat 組合
   * @param ttlSeconds 黑名單保留時間（應與 token 剩餘有效期一致）
   */
  async blacklist(jti: string, ttlSeconds: number): Promise<void> {
    if (!this.redis.available) {
      this.logger.warn('Redis 不可用，無法將 token 加入黑名單');
      return;
    }
    await this.redis.set(`${this.PREFIX}${jti}`, '1', ttlSeconds);
  }

  /**
   * 檢查 token 是否在黑名單中
   * @param jti token 的唯一識別碼
   * @returns true 表示 token 已被撤銷
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    if (!this.redis.available) {
      return false; // Redis 不可用時，降級為不檢查黑名單
    }
    return this.redis.exists(`${this.PREFIX}${jti}`);
  }

  /**
   * 撤銷使用者的所有 token（透過標記 userId）
   * @param userId 使用者 ID
   * @param ttlSeconds 黑名單保留時間
   */
  async revokeAllUserTokens(userId: string, ttlSeconds: number): Promise<void> {
    if (!this.redis.available) {
      this.logger.warn('Redis 不可用，無法撤銷使用者 token');
      return;
    }
    // 標記使用者的所有 token 都應被撤銷（在此時間戳之前簽發的 token 都無效）
    await this.redis.set(
      `${this.PREFIX}user:${userId}`,
      Date.now().toString(),
      ttlSeconds,
    );
  }

  /**
   * 檢查使用者的 token 是否被全域撤銷
   * @param userId 使用者 ID
   * @param issuedAt token 簽發時間（秒）
   * @returns true 表示 token 已被撤銷
   */
  async isUserTokenRevoked(userId: string, issuedAt: number): Promise<boolean> {
    if (!this.redis.available) {
      return false;
    }
    const revokedAt = await this.redis.get(`${this.PREFIX}user:${userId}`);
    if (!revokedAt) {
      return false;
    }
    // 如果 token 簽發時間早於撤銷時間，則視為已撤銷
    return issuedAt * 1000 < parseInt(revokedAt, 10);
  }
}
