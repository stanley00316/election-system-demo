import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SocialProvider,
  SocialShareResult,
  AlbumShareData,
} from '../social.interface';

/**
 * WhatsApp Business Cloud API 社群分享 Provider
 *
 * 需要設定：
 * - WHATSAPP_PHONE_NUMBER_ID: WhatsApp Business 的電話號碼 ID
 * - WHATSAPP_ACCESS_TOKEN: WhatsApp Cloud API 的 Access Token
 * - WHATSAPP_TEMPLATE_NAME: 訊息範本名稱（選填，預設 'album_share'）
 * - WHATSAPP_BROADCAST_GROUP_ID: 廣播群組 ID（選填）
 *
 * 使用 WhatsApp Business Cloud API 發送範本訊息
 * 文件：https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 *
 * 注意：WhatsApp Business API 不支援大量群發，需先建立訊息範本並通過審核
 * 此 Provider 發送訊息到指定的廣播群組或單一號碼
 */
@Injectable()
export class WhatsAppProvider implements SocialProvider {
  readonly platform = 'whatsapp' as const;
  private readonly logger = new Logger(WhatsAppProvider.name);
  private readonly phoneNumberId?: string;
  private readonly accessToken?: string;
  private readonly templateName: string;

  constructor(private readonly configService: ConfigService) {
    this.phoneNumberId = this.configService.get<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
    );
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    this.templateName =
      this.configService.get<string>('WHATSAPP_TEMPLATE_NAME') ||
      'album_share';
  }

  isConfigured(): boolean {
    return !!this.phoneNumberId && !!this.accessToken;
  }

  async publish(
    data: AlbumShareData,
    message?: string,
  ): Promise<SocialShareResult> {
    if (!this.isConfigured()) {
      return {
        platform: 'whatsapp',
        success: false,
        error: 'WhatsApp Business API 尚未設定 Phone Number ID 或 Access Token',
      };
    }

    try {
      const text = this.buildMessageText(data, message);

      // 使用 WhatsApp Cloud API 發送文字訊息到商業帳號
      // 注意：需要先有已開啟對話的聯絡人或使用範本訊息
      const broadcastGroupId = this.configService.get<string>(
        'WHATSAPP_BROADCAST_GROUP_ID',
      );

      if (!broadcastGroupId) {
        this.logger.warn(
          'WhatsApp 未設定 WHATSAPP_BROADCAST_GROUP_ID，無法廣播',
        );
        return {
          platform: 'whatsapp',
          success: false,
          error: '未設定廣播群組 ID（WHATSAPP_BROADCAST_GROUP_ID）',
        };
      }

      const res = await fetch(
        `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: broadcastGroupId,
            type: 'text',
            text: { body: text },
          }),
        },
      );

      if (!res.ok) {
        const err = (await res.json()) as Record<string, any>;
        throw new Error(
          err.error?.message || `WhatsApp API 回應 ${res.status}`,
        );
      }

      const result = (await res.json()) as Record<string, any>;
      const messageId = result.messages?.[0]?.id;

      this.logger.log(`WhatsApp 訊息已發送: ${messageId}`);
      return {
        platform: 'whatsapp',
        success: true,
      };
    } catch (error) {
      this.logger.error(`WhatsApp 發佈失敗: ${error}`);
      return {
        platform: 'whatsapp',
        success: false,
        error: error instanceof Error ? error.message : '發佈失敗',
      };
    }
  }

  private buildMessageText(
    data: AlbumShareData,
    customMessage?: string,
  ): string {
    const parts: string[] = [];
    parts.push(`📸 *${data.title}*`);
    if (customMessage) {
      parts.push(customMessage);
    } else if (data.description) {
      parts.push(data.description);
    }
    parts.push(`📷 ${data.photoCount} 張照片`);
    parts.push(`👉 ${data.publicUrl}`);
    return parts.join('\n\n');
  }
}
