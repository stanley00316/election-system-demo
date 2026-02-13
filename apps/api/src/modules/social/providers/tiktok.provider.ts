import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SocialProvider,
  SocialShareResult,
  AlbumShareData,
} from '../social.interface';

/**
 * TikTok Content Posting API 社群分享 Provider
 *
 * 需要設定：
 * - TIKTOK_ACCESS_TOKEN: TikTok Developer App 的 Access Token
 *
 * 使用 TikTok Share API 分享連結到 TikTok
 * 注意：TikTok API 主要用於影片上傳，文字/連結分享功能有限
 * 此 Provider 透過 Direct Post API 發佈帶有連結的圖片貼文
 * 文件：https://developers.tiktok.com/doc/content-posting-api-get-started
 */
@Injectable()
export class TikTokProvider implements SocialProvider {
  readonly platform = 'tiktok' as const;
  private readonly logger = new Logger(TikTokProvider.name);
  private readonly accessToken?: string;

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('TIKTOK_ACCESS_TOKEN');
  }

  isConfigured(): boolean {
    return !!this.accessToken;
  }

  async publish(
    data: AlbumShareData,
    message?: string,
  ): Promise<SocialShareResult> {
    if (!this.isConfigured()) {
      return {
        platform: 'tiktok',
        success: false,
        error: 'TikTok API 尚未設定 Access Token',
      };
    }

    try {
      const text = this.buildPostText(data, message);
      const photoUrl = data.coverPhotoUrl || data.photoUrls[0];

      if (!photoUrl) {
        // 無圖片時使用 Share Intent URL 方式
        this.logger.warn('TikTok 分享需要圖片，但相簿無封面照');
        return {
          platform: 'tiktok',
          success: false,
          error: '相簿需要至少一張照片才能分享到 TikTok',
        };
      }

      // 使用 TikTok Direct Post API - Photo Post
      const initRes = await fetch(
        'https://open.tiktokapis.com/v2/post/publish/content/init/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            post_info: {
              title: text.slice(0, 150),
              privacy_level: 'PUBLIC_TO_EVERYONE',
            },
            source_info: {
              source: 'PULL_FROM_URL',
              photo_cover_index: 0,
              photo_images: [photoUrl],
            },
            post_mode: 'DIRECT_POST',
            media_type: 'PHOTO',
          }),
        },
      );

      if (!initRes.ok) {
        const err = (await initRes.json()) as Record<string, any>;
        throw new Error(
          err.error?.message || `TikTok API 回應 ${initRes.status}`,
        );
      }

      const result = (await initRes.json()) as Record<string, any>;

      this.logger.log(`TikTok 貼文已提交: ${data.title}`);
      return {
        platform: 'tiktok',
        success: true,
        postUrl: result.data?.share_url,
      };
    } catch (error) {
      this.logger.error(`TikTok 發佈失敗: ${error}`);
      return {
        platform: 'tiktok',
        success: false,
        error: error instanceof Error ? error.message : '發佈失敗',
      };
    }
  }

  private buildPostText(data: AlbumShareData, customMessage?: string): string {
    const parts: string[] = [];
    parts.push(`📸 ${data.title}`);
    if (customMessage) {
      parts.push(customMessage);
    } else if (data.description) {
      parts.push(data.description);
    }
    parts.push(`📷 ${data.photoCount} 張照片`);
    parts.push(data.publicUrl);
    return parts.join(' | ');
  }
}
