import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SocialProvider,
  SocialShareResult,
  AlbumShareData,
} from '../social.interface';

/**
 * Facebook Graph API 社群分享 Provider
 *
 * 需要設定：
 * - FACEBOOK_PAGE_ACCESS_TOKEN: Facebook 粉絲專頁的 Page Access Token
 * - FACEBOOK_PAGE_ID: 粉絲專頁 ID
 *
 * 使用 Graph API v19.0 發佈多圖貼文到粉絲專頁
 */
@Injectable()
export class FacebookProvider implements SocialProvider {
  readonly platform = 'facebook' as const;
  private readonly logger = new Logger(FacebookProvider.name);
  private readonly pageAccessToken?: string;
  private readonly pageId?: string;
  private readonly graphApiVersion = 'v19.0';

  constructor(private readonly configService: ConfigService) {
    this.pageAccessToken = this.configService.get<string>(
      'FACEBOOK_PAGE_ACCESS_TOKEN',
    );
    this.pageId = this.configService.get<string>('FACEBOOK_PAGE_ID');
  }

  isConfigured(): boolean {
    return !!(this.pageAccessToken && this.pageId);
  }

  async publish(
    data: AlbumShareData,
    message?: string,
  ): Promise<SocialShareResult> {
    if (!this.isConfigured()) {
      return {
        platform: 'facebook',
        success: false,
        error: 'Facebook 尚未設定 Page Access Token',
      };
    }

    try {
      const postMessage = this.buildMessage(data, message);

      // 如果有照片，使用多圖貼文流程
      if (data.photoUrls.length > 0) {
        return await this.publishWithPhotos(data, postMessage);
      }

      // 純文字 + 連結
      return await this.publishLink(data, postMessage);
    } catch (error) {
      this.logger.error(`Facebook 發佈失敗: ${error}`);
      return {
        platform: 'facebook',
        success: false,
        error: error instanceof Error ? error.message : '發佈失敗',
      };
    }
  }

  /**
   * 發佈多圖貼文
   * Step 1: 上傳每張照片（unpublished）
   * Step 2: 用所有照片 ID 建立一篇貼文
   */
  private async publishWithPhotos(
    data: AlbumShareData,
    message: string,
  ): Promise<SocialShareResult> {
    const baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
    const maxPhotos = Math.min(data.photoUrls.length, 10); // FB 限制每篇最多 10 張

    // Step 1: 上傳照片（unpublished）
    const photoIds: string[] = [];
    for (let i = 0; i < maxPhotos; i++) {
      const res = await fetch(`${baseUrl}/${this.pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: data.photoUrls[i],
          published: false,
          access_token: this.pageAccessToken,
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as Record<string, any>;
        this.logger.warn(`Facebook 照片上傳失敗: ${JSON.stringify(err)}`);
        continue;
      }

      const result = (await res.json()) as Record<string, any>;
      photoIds.push(result.id);
    }

    if (photoIds.length === 0) {
      // fallback 到純連結
      return this.publishLink(data, message);
    }

    // Step 2: 建立多圖貼文
    const attachedMedia = photoIds.map((id) => ({
      media_fbid: id,
    }));

    const res = await fetch(`${baseUrl}/${this.pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        attached_media: attachedMedia,
        access_token: this.pageAccessToken,
      }),
    });

    if (!res.ok) {
      const err = (await res.json()) as Record<string, any>;
      throw new Error(err.error?.message || 'Facebook 多圖貼文發佈失敗');
    }

    const result = (await res.json()) as Record<string, any>;
    const postUrl = `https://www.facebook.com/${result.id?.replace('_', '/posts/')}`;

    this.logger.log(`Facebook 貼文已發佈: ${result.id}`);
    return { platform: 'facebook', success: true, postUrl };
  }

  /**
   * 發佈純連結貼文
   */
  private async publishLink(
    data: AlbumShareData,
    message: string,
  ): Promise<SocialShareResult> {
    const baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;

    const res = await fetch(`${baseUrl}/${this.pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        link: data.publicUrl,
        access_token: this.pageAccessToken,
      }),
    });

    if (!res.ok) {
      const err = (await res.json()) as Record<string, any>;
      throw new Error(err.error?.message || 'Facebook 連結貼文發佈失敗');
    }

    const result = (await res.json()) as Record<string, any>;
    const postUrl = `https://www.facebook.com/${result.id?.replace('_', '/posts/')}`;

    this.logger.log(`Facebook 連結貼文已發佈: ${result.id}`);
    return { platform: 'facebook', success: true, postUrl };
  }

  private buildMessage(data: AlbumShareData, customMessage?: string): string {
    if (customMessage) return `${customMessage}\n\n${data.publicUrl}`;
    const desc = data.description ? `\n${data.description}` : '';
    return `📸 ${data.title}${desc}\n\n🔗 ${data.publicUrl}`;
  }
}
