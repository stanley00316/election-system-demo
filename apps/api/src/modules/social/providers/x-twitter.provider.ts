import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'crypto';
import {
  SocialProvider,
  SocialShareResult,
  AlbumShareData,
} from '../social.interface';

/**
 * X (Twitter) API v2 社群分享 Provider
 *
 * 需要設定：
 * - X_API_KEY: API Key (Consumer Key)
 * - X_API_SECRET: API Secret (Consumer Secret)
 * - X_ACCESS_TOKEN: Access Token
 * - X_ACCESS_TOKEN_SECRET: Access Token Secret
 *
 * 使用 OAuth 1.0a 驗證發送推文
 */
@Injectable()
export class XTwitterProvider implements SocialProvider {
  readonly platform = 'x' as const;
  private readonly logger = new Logger(XTwitterProvider.name);
  private readonly apiKey?: string;
  private readonly apiSecret?: string;
  private readonly accessToken?: string;
  private readonly accessTokenSecret?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('X_API_KEY');
    this.apiSecret = this.configService.get<string>('X_API_SECRET');
    this.accessToken = this.configService.get<string>('X_ACCESS_TOKEN');
    this.accessTokenSecret = this.configService.get<string>(
      'X_ACCESS_TOKEN_SECRET',
    );
  }

  isConfigured(): boolean {
    return !!(
      this.apiKey &&
      this.apiSecret &&
      this.accessToken &&
      this.accessTokenSecret
    );
  }

  async publish(
    data: AlbumShareData,
    message?: string,
  ): Promise<SocialShareResult> {
    if (!this.isConfigured()) {
      return {
        platform: 'x',
        success: false,
        error: 'X (Twitter) API 尚未設定',
      };
    }

    try {
      const tweetText = this.buildTweet(data, message);

      const url = 'https://api.twitter.com/2/tweets';
      const body = JSON.stringify({ text: tweetText });

      const authHeader = this.generateOAuth1Header('POST', url);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body,
      });

      if (!res.ok) {
        const err = (await res.json()) as Record<string, any>;
        throw new Error(
          err.detail || err.title || 'X (Twitter) 發推失敗',
        );
      }

      const result = (await res.json()) as Record<string, any>;
      const tweetId = result.data?.id;
      const postUrl = tweetId
        ? `https://x.com/i/web/status/${tweetId}`
        : undefined;

      this.logger.log(`X 推文已發佈: ${tweetId}`);
      return { platform: 'x', success: true, postUrl };
    } catch (error) {
      this.logger.error(`X 發佈失敗: ${error}`);
      return {
        platform: 'x',
        success: false,
        error: error instanceof Error ? error.message : '發佈失敗',
      };
    }
  }

  /**
   * 建立推文內容（限制 280 字元）
   */
  private buildTweet(data: AlbumShareData, customMessage?: string): string {
    const url = data.publicUrl;
    const urlLength = 23; // Twitter 自動縮短 URL 為 23 字元

    if (customMessage) {
      const available = 280 - urlLength - 2; // 2 for \n\n
      const trimmed =
        customMessage.length > available
          ? customMessage.slice(0, available - 1) + '…'
          : customMessage;
      return `${trimmed}\n\n${url}`;
    }

    const prefix = `📸 ${data.title}`;
    const suffix = ` (${data.photoCount}張)`;
    const available = 280 - urlLength - 2;
    let text = prefix + suffix;

    if (text.length > available) {
      text = prefix.slice(0, available - 1) + '…';
    }

    return `${text}\n\n${url}`;
  }

  /**
   * 產生 OAuth 1.0a Authorization Header
   */
  private generateOAuth1Header(method: string, url: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString('hex');

    const params: Record<string, string> = {
      oauth_consumer_key: this.apiKey!,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: this.accessToken!,
      oauth_version: '1.0',
    };

    // 建立 signature base string
    const sortedParams = Object.keys(params)
      .sort()
      .map(
        (k) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`,
      )
      .join('&');

    const baseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(sortedParams),
    ].join('&');

    // 簽名
    const signingKey = `${encodeURIComponent(this.apiSecret!)}&${encodeURIComponent(this.accessTokenSecret!)}`;
    const signature = createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');

    params['oauth_signature'] = signature;

    const header = Object.keys(params)
      .sort()
      .map(
        (k) =>
          `${encodeURIComponent(k)}="${encodeURIComponent(params[k])}"`,
      )
      .join(', ');

    return `OAuth ${header}`;
  }
}
