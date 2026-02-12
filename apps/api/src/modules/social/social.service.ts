import { Injectable, Logger } from '@nestjs/common';
import { FacebookProvider } from './providers/facebook.provider';
import { LineProvider } from './providers/line.provider';
import { XTwitterProvider } from './providers/x-twitter.provider';
import { InstagramProvider } from './providers/instagram.provider';
import {
  SocialPlatform,
  SocialProvider,
  SocialShareResult,
  AlbumShareData,
} from './social.interface';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);
  private readonly providers: Map<SocialPlatform, SocialProvider>;

  constructor(
    private readonly facebookProvider: FacebookProvider,
    private readonly lineProvider: LineProvider,
    private readonly xTwitterProvider: XTwitterProvider,
    private readonly instagramProvider: InstagramProvider,
  ) {
    this.providers = new Map<SocialPlatform, SocialProvider>([
      ['facebook', this.facebookProvider],
      ['line', this.lineProvider],
      ['x', this.xTwitterProvider],
      ['instagram', this.instagramProvider],
    ]);
  }

  /**
   * 取得各平台的設定狀態
   */
  getConfiguredPlatforms(): Record<SocialPlatform, boolean> {
    return {
      facebook: this.facebookProvider.isConfigured(),
      line: this.lineProvider.isConfigured(),
      x: this.xTwitterProvider.isConfigured(),
      instagram: this.instagramProvider.isConfigured(),
    };
  }

  /**
   * 發佈相簿到指定平台
   * 並行發送到所有指定平台，個別失敗不影響其他平台
   */
  async publishToSocial(
    platforms: SocialPlatform[],
    data: AlbumShareData,
    message?: string,
  ): Promise<SocialShareResult[]> {
    this.logger.log(
      `開始發佈相簿「${data.title}」到 [${platforms.join(', ')}]`,
    );

    const results = await Promise.allSettled(
      platforms.map(async (platform) => {
        const provider = this.providers.get(platform);
        if (!provider) {
          return {
            platform,
            success: false,
            error: `不支援的平台: ${platform}`,
          } as SocialShareResult;
        }
        return provider.publish(data, message);
      }),
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        platform: 'facebook' as SocialPlatform, // fallback
        success: false,
        error: result.reason?.message || '未知錯誤',
      };
    });
  }
}
