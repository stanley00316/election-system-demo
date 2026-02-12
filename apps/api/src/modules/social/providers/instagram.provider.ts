import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SocialProvider,
  SocialShareResult,
  AlbumShareData,
} from '../social.interface';

/**
 * Instagram Graph API 社群分享 Provider
 *
 * 需要設定：
 * - FACEBOOK_PAGE_ACCESS_TOKEN: 同 Facebook（Instagram Business Account 透過 Facebook 管理）
 * - INSTAGRAM_BUSINESS_ACCOUNT_ID: Instagram Business 帳號 ID
 *
 * 使用 Instagram Content Publishing API 發佈 Carousel（多圖）貼文
 * 注意：必須是 Instagram Business 或 Creator 帳號
 */
@Injectable()
export class InstagramProvider implements SocialProvider {
  readonly platform = 'instagram' as const;
  private readonly logger = new Logger(InstagramProvider.name);
  private readonly accessToken?: string;
  private readonly igAccountId?: string;
  private readonly graphApiVersion = 'v19.0';

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>(
      'FACEBOOK_PAGE_ACCESS_TOKEN',
    );
    this.igAccountId = this.configService.get<string>(
      'INSTAGRAM_BUSINESS_ACCOUNT_ID',
    );
  }

  isConfigured(): boolean {
    return !!(this.accessToken && this.igAccountId);
  }

  async publish(
    data: AlbumShareData,
    message?: string,
  ): Promise<SocialShareResult> {
    if (!this.isConfigured()) {
      return {
        platform: 'instagram',
        success: false,
        error: 'Instagram Business Account 尚未設定',
      };
    }

    try {
      const caption = this.buildCaption(data, message);

      if (data.photoUrls.length === 0) {
        return {
          platform: 'instagram',
          success: false,
          error: '相簿內沒有照片，無法發佈到 Instagram',
        };
      }

      if (data.photoUrls.length === 1) {
        return await this.publishSingleImage(data.photoUrls[0], caption);
      }

      return await this.publishCarousel(data.photoUrls, caption);
    } catch (error) {
      this.logger.error(`Instagram 發佈失敗: ${error}`);
      return {
        platform: 'instagram',
        success: false,
        error: error instanceof Error ? error.message : '發佈失敗',
      };
    }
  }

  /**
   * 發佈單張圖片
   */
  private async publishSingleImage(
    imageUrl: string,
    caption: string,
  ): Promise<SocialShareResult> {
    const baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;

    // Step 1: 建立 media container
    const containerRes = await fetch(
      `${baseUrl}/${this.igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: this.accessToken,
        }),
      },
    );

    if (!containerRes.ok) {
      const err = (await containerRes.json()) as Record<string, any>;
      throw new Error(err.error?.message || 'Instagram media 建立失敗');
    }

    const container = (await containerRes.json()) as Record<string, any>;

    // Step 2: 發佈
    return await this.publishContainer(container.id);
  }

  /**
   * 發佈 Carousel（多圖）
   */
  private async publishCarousel(
    photoUrls: string[],
    caption: string,
  ): Promise<SocialShareResult> {
    const baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
    const maxPhotos = Math.min(photoUrls.length, 10); // IG carousel 最多 10 張

    // Step 1: 為每張圖片建立 media container
    const childContainerIds: string[] = [];
    for (let i = 0; i < maxPhotos; i++) {
      const res = await fetch(`${baseUrl}/${this.igAccountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: photoUrls[i],
          is_carousel_item: true,
          access_token: this.accessToken,
        }),
      });

      if (!res.ok) {
        this.logger.warn(
          `Instagram carousel 子項目建立失敗: photo index ${i}`,
        );
        continue;
      }

      const result = (await res.json()) as Record<string, any>;
      childContainerIds.push(result.id);
    }

    if (childContainerIds.length === 0) {
      throw new Error('無法上傳任何照片到 Instagram');
    }

    // Step 2: 建立 carousel container
    const carouselRes = await fetch(
      `${baseUrl}/${this.igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          caption,
          children: childContainerIds,
          access_token: this.accessToken,
        }),
      },
    );

    if (!carouselRes.ok) {
      const err = (await carouselRes.json()) as Record<string, any>;
      throw new Error(
        err.error?.message || 'Instagram carousel container 建立失敗',
      );
    }

    const carousel = (await carouselRes.json()) as Record<string, any>;

    // Step 3: 發佈
    return await this.publishContainer(carousel.id);
  }

  /**
   * 發佈 media container
   */
  private async publishContainer(
    containerId: string,
  ): Promise<SocialShareResult> {
    const baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;

    const res = await fetch(
      `${baseUrl}/${this.igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: this.accessToken,
        }),
      },
    );

    if (!res.ok) {
      const err = (await res.json()) as Record<string, any>;
      throw new Error(err.error?.message || 'Instagram 發佈失敗');
    }

    const result = (await res.json()) as Record<string, any>;
    const postUrl = `https://www.instagram.com/p/${result.id}/`;

    this.logger.log(`Instagram 貼文已發佈: ${result.id}`);
    return { platform: 'instagram', success: true, postUrl };
  }

  private buildCaption(data: AlbumShareData, customMessage?: string): string {
    if (customMessage) {
      return `${customMessage}\n\n📸 ${data.photoCount} 張照片\n🔗 ${data.publicUrl}`;
    }

    const desc = data.description ? `\n${data.description}` : '';
    return `📸 ${data.title}${desc}\n\n${data.photoCount} 張照片\n🔗 ${data.publicUrl}`;
  }
}
