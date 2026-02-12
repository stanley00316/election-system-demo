import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private isAvailable = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      const host = this.configService.get('REDIS_HOST', 'localhost');
      const port = this.configService.get<number>('REDIS_PORT', 6379);
      const password = this.configService.get<string>('REDIS_PASSWORD');

      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            this.logger.warn('Redis 連線失敗，Token 黑名單功能將停用');
            return null; // 停止重試
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      await this.client.connect();
      this.isAvailable = true;
      this.logger.log('Redis 連線成功');
    } catch (error) {
      this.logger.warn('Redis 無法連線，Token 黑名單功能將停用（降級模式）');
      this.isAvailable = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * 檢查 Redis 是否可用
   */
  get available(): boolean {
    return this.isAvailable;
  }

  /**
   * 設定鍵值對（帶 TTL）
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable || !this.client) return;
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.warn(`Redis SET 失敗: ${error}`);
    }
  }

  /**
   * 取得鍵值
   */
  async get(key: string): Promise<string | null> {
    if (!this.isAvailable || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.warn(`Redis GET 失敗: ${error}`);
      return null;
    }
  }

  /**
   * 刪除鍵值
   */
  async del(key: string): Promise<void> {
    if (!this.isAvailable || !this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Redis DEL 失敗: ${error}`);
    }
  }

  /**
   * 檢查鍵值是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable || !this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.warn(`Redis EXISTS 失敗: ${error}`);
      return false;
    }
  }
}
