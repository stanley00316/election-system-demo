import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LineTokenResponse {
  access_token: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private readonly channelId: string;
  private readonly channelSecret: string;

  constructor(private configService: ConfigService) {
    this.channelId = this.configService.get('LINE_CHANNEL_ID', '');
    this.channelSecret = this.configService.get('LINE_CHANNEL_SECRET', '');
  }

  async getAccessToken(code: string, redirectUri: string): Promise<LineTokenResponse> {
    const url = 'https://api.line.me/oauth2/v2.1/token';
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.channelId,
      client_secret: this.channelSecret,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        this.logger.error(`LINE token error: ${JSON.stringify(errorBody)}`);
        throw new UnauthorizedException('LINE 登入失敗');
      }

      return response.json() as Promise<LineTokenResponse>;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('LINE token request failed', error instanceof Error ? error.stack : undefined);
      throw new UnauthorizedException('LINE 登入失敗');
    }
  }

  async getProfile(accessToken: string): Promise<LineProfile> {
    const url = 'https://api.line.me/v2/profile';

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new UnauthorizedException('無法取得 LINE 使用者資料');
      }

      return response.json() as Promise<LineProfile>;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('LINE profile request failed', error instanceof Error ? error.stack : undefined);
      throw new UnauthorizedException('無法取得 LINE 使用者資料');
    }
  }

  getLoginUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.channelId,
      redirect_uri: redirectUri,
      state,
      scope: 'profile openid',
    });

    return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
  }
}
