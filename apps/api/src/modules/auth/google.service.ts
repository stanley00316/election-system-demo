import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { google, Auth } from 'googleapis';

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  private oauth2Client: Auth.OAuth2Client;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );
  }

  /**
   * 產生 Google OAuth 授權 URL
   */
  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // 強制顯示同意畫面以取得 refresh token
      state,
    });
  }

  /**
   * 處理 OAuth 回調，交換 tokens 並儲存
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new BadRequestException('無法取得 Google 授權');
      }

      // 計算 token 過期時間
      const tokenExpiry = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000); // 預設 1 小時

      // 取得使用者的主要行事曆 ID
      this.oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const calendarList = await calendar.calendarList.list();
      const primaryCalendar = calendarList.data.items?.find(
        (cal) => cal.primary === true,
      );

      // 儲存 tokens 到使用者資料
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
          googleTokenExpiry: tokenExpiry,
          googleCalendarId: primaryCalendar?.id || 'primary',
        },
      });
    } catch (error) {
      this.logger.error('Google OAuth callback error', error instanceof Error ? error.stack : undefined);
      throw new BadRequestException('Google 授權失敗');
    }
  }

  /**
   * 取得使用者的 OAuth2Client（自動刷新 token）
   */
  async getAuthClient(userId: string): Promise<Auth.OAuth2Client> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiry: true,
      },
    });

    if (!user?.googleAccessToken || !user?.googleRefreshToken) {
      throw new UnauthorizedException('尚未連結 Google 帳號');
    }

    const client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );

    client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
      expiry_date: user.googleTokenExpiry?.getTime(),
    });

    // 檢查 token 是否過期，若過期則刷新
    const isExpired = user.googleTokenExpiry && user.googleTokenExpiry < new Date();
    if (isExpired) {
      await this.refreshAccessToken(userId, client);
    }

    return client;
  }

  /**
   * 刷新過期的 access token
   */
  async refreshAccessToken(userId: string, client?: Auth.OAuth2Client): Promise<void> {
    const authClient = client || await this.getAuthClient(userId);

    try {
      const { credentials } = await authClient.refreshAccessToken();

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: credentials.access_token,
          googleTokenExpiry: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : new Date(Date.now() + 3600 * 1000),
        },
      });
    } catch (error) {
      this.logger.error('Token refresh error', error instanceof Error ? error.stack : undefined);
      // 如果刷新失敗，清除 tokens
      await this.revokeAccess(userId);
      throw new UnauthorizedException('Google 授權已過期，請重新連結');
    }
  }

  /**
   * 撤銷 Google 連結
   */
  async revokeAccess(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true },
    });

    // 嘗試撤銷 token（可能失敗，但不影響流程）
    if (user?.googleAccessToken) {
      try {
        await this.oauth2Client.revokeToken(user.googleAccessToken);
      } catch (error) {
        this.logger.warn('Token revocation failed', error instanceof Error ? error.message : undefined);
      }
    }

    // 清除資料庫中的 tokens
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        googleCalendarId: null,
      },
    });
  }

  /**
   * 檢查使用者是否已連結 Google
   */
  async isConnected(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true },
    });

    return !!user?.googleRefreshToken;
  }

  /**
   * 取得 Google 連結狀態
   */
  async getConnectionStatus(userId: string): Promise<{
    connected: boolean;
    calendarId?: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleRefreshToken: true,
        googleCalendarId: true,
      },
    });

    return {
      connected: !!user?.googleRefreshToken,
      calendarId: user?.googleCalendarId || undefined,
    };
  }
}
