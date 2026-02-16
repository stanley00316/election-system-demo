import { Injectable, Logger } from '@nestjs/common';
import { FacebookProvider } from './providers/facebook.provider';
import { LineProvider } from './providers/line.provider';
import { XTwitterProvider } from './providers/x-twitter.provider';
import { InstagramProvider } from './providers/instagram.provider';
import { ThreadsProvider } from './providers/threads.provider';
import { TikTokProvider } from './providers/tiktok.provider';
import { YouTubeProvider } from './providers/youtube.provider';
import { TelegramProvider } from './providers/telegram.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';
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
    private readonly threadsProvider: ThreadsProvider,
    private readonly tiktokProvider: TikTokProvider,
    private readonly youtubeProvider: YouTubeProvider,
    private readonly telegramProvider: TelegramProvider,
    private readonly whatsappProvider: WhatsAppProvider,
  ) {
    this.providers = new Map<SocialPlatform, SocialProvider>([
      ['facebook', this.facebookProvider],
      ['line', this.lineProvider],
      ['x', this.xTwitterProvider],
      ['instagram', this.instagramProvider],
      ['threads', this.threadsProvider],
      ['tiktok', this.tiktokProvider],
      ['youtube', this.youtubeProvider],
      ['telegram', this.telegramProvider],
      ['whatsapp', this.whatsappProvider],
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
      threads: this.threadsProvider.isConfigured(),
      tiktok: this.tiktokProvider.isConfigured(),
      youtube: this.youtubeProvider.isConfigured(),
      telegram: this.telegramProvider.isConfigured(),
      whatsapp: this.whatsappProvider.isConfigured(),
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

    // OWASP A10: SSRF 防護 — 驗證所有外部 URL 使用 HTTPS 且不指向內部網路
    const sanitizedData = this.sanitizeUrls(data);

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
        return provider.publish(sanitizedData, message);
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

  /**
   * OWASP A10: SSRF 防護
   * 驗證 URL 為 HTTPS 且不指向內部網路（localhost、私有 IP）
   */
  private isAllowedUrl(url: string): boolean {
    try {
      const parsed = new URL(url);

      // 必須為 HTTPS
      if (parsed.protocol !== 'https:') {
        this.logger.warn(`SSRF 防護：拒絕非 HTTPS URL: ${parsed.protocol}//${parsed.hostname}`);
        return false;
      }

      const hostname = parsed.hostname.toLowerCase();

      // 禁止內部網路位址
      const blockedPatterns = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        '169.254.',     // link-local
        '10.',          // Class A private
        '192.168.',     // Class C private
      ];

      for (const pattern of blockedPatterns) {
        if (hostname === pattern || hostname.startsWith(pattern)) {
          this.logger.warn(`SSRF 防護：拒絕內部網路 URL: ${hostname}`);
          return false;
        }
      }

      // 禁止 172.16.0.0/12 私有網段
      if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
        this.logger.warn(`SSRF 防護：拒絕內部網路 URL: ${hostname}`);
        return false;
      }

      return true;
    } catch {
      this.logger.warn(`SSRF 防護：無效 URL 格式`);
      return false;
    }
  }

  /**
   * 清理 AlbumShareData 中的所有 URL，移除不安全的 URL
   */
  private sanitizeUrls(data: AlbumShareData): AlbumShareData {
    const sanitized = { ...data };

    // 驗證 publicUrl
    if (sanitized.publicUrl && !this.isAllowedUrl(sanitized.publicUrl)) {
      this.logger.warn(`移除不安全的 publicUrl`);
      sanitized.publicUrl = '';
    }

    // 驗證 coverPhotoUrl
    if (sanitized.coverPhotoUrl && !this.isAllowedUrl(sanitized.coverPhotoUrl)) {
      this.logger.warn(`移除不安全的 coverPhotoUrl`);
      sanitized.coverPhotoUrl = undefined;
    }

    // 驗證 photoUrls
    sanitized.photoUrls = sanitized.photoUrls.filter((url) => {
      if (!this.isAllowedUrl(url)) {
        this.logger.warn(`移除不安全的 photoUrl`);
        return false;
      }
      return true;
    });

    return sanitized;
  }
}
