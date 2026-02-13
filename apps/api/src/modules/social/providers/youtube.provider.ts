import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SocialProvider,
  SocialShareResult,
  AlbumShareData,
} from '../social.interface';

/**
 * YouTube Community Post 社群分享 Provider
 *
 * 需要設定：
 * - YOUTUBE_ACCESS_TOKEN: YouTube Data API v3 OAuth2 Access Token
 * - YOUTUBE_CHANNEL_ID: YouTube 頻道 ID
 *
 * 使用 YouTube Data API v3 建立社群貼文
 * 文件：https://developers.google.com/youtube/v3/docs/activities
 *
 * 注意：YouTube Community Posts API 需要頻道有足夠訂閱數（500+）才能使用
 * 此 Provider 使用 activities.insert 方法發佈社群公告
 */
@Injectable()
export class YouTubeProvider implements SocialProvider {
  readonly platform = 'youtube' as const;
  private readonly logger = new Logger(YouTubeProvider.name);
  private readonly accessToken?: string;
  private readonly channelId?: string;

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('YOUTUBE_ACCESS_TOKEN');
    this.channelId = this.configService.get<string>('YOUTUBE_CHANNEL_ID');
  }

  isConfigured(): boolean {
    return !!this.accessToken && !!this.channelId;
  }

  async publish(
    data: AlbumShareData,
    message?: string,
  ): Promise<SocialShareResult> {
    if (!this.isConfigured()) {
      return {
        platform: 'youtube',
        success: false,
        error: 'YouTube API 尚未設定 Access Token 或 Channel ID',
      };
    }

    try {
      const text = this.buildPostText(data, message);

      // 使用 YouTube Data API v3 建立社群貼文（bulletin）
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/activities?part=snippet',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            snippet: {
              channelId: this.channelId,
              description: text,
              type: 'bulletin',
            },
          }),
        },
      );

      if (!res.ok) {
        const err = (await res.json()) as Record<string, any>;
        throw new Error(
          err.error?.message || `YouTube API 回應 ${res.status}`,
        );
      }

      const result = (await res.json()) as Record<string, any>;

      this.logger.log(`YouTube 社群貼文已發佈: ${result.id}`);
      return {
        platform: 'youtube',
        success: true,
        postUrl: `https://www.youtube.com/channel/${this.channelId}/community`,
      };
    } catch (error) {
      this.logger.error(`YouTube 發佈失敗: ${error}`);
      return {
        platform: 'youtube',
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
    parts.push(`👉 ${data.publicUrl}`);
    return parts.join('\n');
  }
}
