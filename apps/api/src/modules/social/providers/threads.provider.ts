import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SocialProvider,
  SocialShareResult,
  AlbumShareData,
} from '../social.interface';

/**
 * Meta Threads API 社群分享 Provider
 *
 * 需要設定：
 * - THREADS_ACCESS_TOKEN: Threads API 的 User Access Token（需 threads_basic、threads_content_publish 權限）
 *
 * 使用 Threads Graph API 發佈文字貼文（含連結）
 * 文件：https://developers.facebook.com/docs/threads/posts
 */
@Injectable()
export class ThreadsProvider implements SocialProvider {
  readonly platform = 'threads' as const;
  private readonly logger = new Logger(ThreadsProvider.name);
  private readonly accessToken?: string;
  private readonly userId?: string;

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('THREADS_ACCESS_TOKEN');
    this.userId = this.configService.get<string>('THREADS_USER_ID');
  }

  isConfigured(): boolean {
    return !!this.accessToken && !!this.userId;
  }

  async publish(
    data: AlbumShareData,
    message?: string,
  ): Promise<SocialShareResult> {
    if (!this.isConfigured()) {
      return {
        platform: 'threads',
        success: false,
        error: 'Threads API 尚未設定 Access Token 或 User ID',
      };
    }

    try {
      const text = this.buildPostText(data, message);

      // Step 1: 建立媒體容器
      const createRes = await fetch(
        `https://graph.threads.net/v1.0/${this.userId}/threads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'TEXT',
            text,
            access_token: this.accessToken,
          }),
        },
      );

      if (!createRes.ok) {
        const err = (await createRes.json()) as Record<string, any>;
        throw new Error(err.error?.message || 'Threads 建立貼文失敗');
      }

      const { id: creationId } = (await createRes.json()) as { id: string };

      // Step 2: 發佈媒體容器
      const publishRes = await fetch(
        `https://graph.threads.net/v1.0/${this.userId}/threads_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: this.accessToken,
          }),
        },
      );

      if (!publishRes.ok) {
        const err = (await publishRes.json()) as Record<string, any>;
        throw new Error(err.error?.message || 'Threads 發佈失敗');
      }

      const { id: postId } = (await publishRes.json()) as { id: string };

      this.logger.log(`Threads 貼文已發佈: ${postId}`);
      return {
        platform: 'threads',
        success: true,
        postUrl: `https://www.threads.net/post/${postId}`,
      };
    } catch (error) {
      this.logger.error(`Threads 發佈失敗: ${error}`);
      return {
        platform: 'threads',
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
    return parts.join('\n\n');
  }
}
