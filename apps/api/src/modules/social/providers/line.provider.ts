import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SocialProvider,
  SocialShareResult,
  AlbumShareData,
} from '../social.interface';

/**
 * LINE Messaging API 社群分享 Provider
 *
 * 需要設定：
 * - LINE_MESSAGING_ACCESS_TOKEN: LINE Messaging API 的 Channel Access Token
 *
 * 使用 Messaging API 以 Flex Message 格式廣播相簿卡片
 */
@Injectable()
export class LineProvider implements SocialProvider {
  readonly platform = 'line' as const;
  private readonly logger = new Logger(LineProvider.name);
  private readonly accessToken?: string;

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>(
      'LINE_MESSAGING_ACCESS_TOKEN',
    );
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
        platform: 'line',
        success: false,
        error: 'LINE Messaging API 尚未設定 Access Token',
      };
    }

    try {
      const flexMessage = this.buildFlexMessage(data, message);

      const res = await fetch(
        'https://api.line.me/v2/bot/message/broadcast',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            messages: [flexMessage],
          }),
        },
      );

      if (!res.ok) {
        const err = (await res.json()) as Record<string, any>;
        throw new Error(err.message || 'LINE 廣播失敗');
      }

      this.logger.log(`LINE 廣播已發送: ${data.title}`);
      return { platform: 'line', success: true };
    } catch (error) {
      this.logger.error(`LINE 發佈失敗: ${error}`);
      return {
        platform: 'line',
        success: false,
        error: error instanceof Error ? error.message : '發佈失敗',
      };
    }
  }

  /**
   * 建立 Flex Message 相簿卡片
   */
  private buildFlexMessage(data: AlbumShareData, customMessage?: string) {
    const heroImage = data.coverPhotoUrl || data.photoUrls[0];

    return {
      type: 'flex',
      altText: `📸 ${data.title} - ${data.photoCount} 張照片`,
      contents: {
        type: 'bubble',
        size: 'mega',
        ...(heroImage && {
          hero: {
            type: 'image',
            url: heroImage,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover',
            action: {
              type: 'uri',
              uri: data.publicUrl,
            },
          },
        }),
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: data.title,
              weight: 'bold',
              size: 'xl',
              wrap: true,
            },
            ...(customMessage || data.description
              ? [
                  {
                    type: 'text',
                    text: customMessage || data.description,
                    size: 'sm',
                    color: '#999999',
                    margin: 'md',
                    wrap: true,
                  },
                ]
              : []),
            {
              type: 'box',
              layout: 'baseline',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: `📷 ${data.photoCount} 張照片`,
                  size: 'sm',
                  color: '#aaaaaa',
                },
              ],
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: '查看相簿',
                uri: data.publicUrl,
              },
            },
          ],
        },
      },
    };
  }
}
