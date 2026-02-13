import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SocialProvider,
  SocialShareResult,
  AlbumShareData,
} from '../social.interface';

/**
 * Telegram Bot API 社群分享 Provider
 *
 * 需要設定：
 * - TELEGRAM_BOT_TOKEN: Telegram Bot 的 API Token（透過 @BotFather 取得）
 * - TELEGRAM_CHANNEL_ID: 頻道或群組的 Chat ID（如 @channelname 或 -1001234567890）
 *
 * 使用 Telegram Bot API 發送照片或訊息到頻道/群組
 * 文件：https://core.telegram.org/bots/api#sendphoto
 */
@Injectable()
export class TelegramProvider implements SocialProvider {
  readonly platform = 'telegram' as const;
  private readonly logger = new Logger(TelegramProvider.name);
  private readonly botToken?: string;
  private readonly channelId?: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.channelId = this.configService.get<string>('TELEGRAM_CHANNEL_ID');
  }

  isConfigured(): boolean {
    return !!this.botToken && !!this.channelId;
  }

  async publish(
    data: AlbumShareData,
    message?: string,
  ): Promise<SocialShareResult> {
    if (!this.isConfigured()) {
      return {
        platform: 'telegram',
        success: false,
        error: 'Telegram Bot 尚未設定 Token 或 Channel ID',
      };
    }

    try {
      const caption = this.buildCaption(data, message);
      const photoUrl = data.coverPhotoUrl || data.photoUrls[0];

      let res: Response;

      if (photoUrl) {
        // 有封面照片時使用 sendPhoto
        res = await fetch(
          `https://api.telegram.org/bot${this.botToken}/sendPhoto`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: this.channelId,
              photo: photoUrl,
              caption,
              parse_mode: 'HTML',
            }),
          },
        );
      } else {
        // 無照片時使用 sendMessage
        res = await fetch(
          `https://api.telegram.org/bot${this.botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: this.channelId,
              text: caption,
              parse_mode: 'HTML',
            }),
          },
        );
      }

      if (!res.ok) {
        const err = (await res.json()) as Record<string, any>;
        throw new Error(err.description || 'Telegram 發送失敗');
      }

      const result = (await res.json()) as Record<string, any>;
      const messageId = result.result?.message_id;

      this.logger.log(`Telegram 訊息已發送: ${messageId}`);
      return {
        platform: 'telegram',
        success: true,
        postUrl: this.channelId?.startsWith('@')
          ? `https://t.me/${this.channelId.slice(1)}/${messageId}`
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Telegram 發佈失敗: ${error}`);
      return {
        platform: 'telegram',
        success: false,
        error: error instanceof Error ? error.message : '發佈失敗',
      };
    }
  }

  private buildCaption(data: AlbumShareData, customMessage?: string): string {
    const parts: string[] = [];
    parts.push(`<b>📸 ${data.title}</b>`);
    if (customMessage) {
      parts.push(customMessage);
    } else if (data.description) {
      parts.push(data.description);
    }
    parts.push(`📷 ${data.photoCount} 張照片`);
    parts.push(`👉 <a href="${data.publicUrl}">查看相簿</a>`);
    return parts.join('\n\n');
  }
}
