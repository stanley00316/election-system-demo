import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { google, Auth } from 'googleapis';
import * as crypto from 'crypto';

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  private oauth2Client: Auth.OAuth2Client;
  private readonly encryptionKey: Buffer;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );

    // OWASP A02: 使用 JWT_SECRET 衍生 AES-256 金鑰加密 Google tokens
    const jwtSecret = this.configService.get<string>('JWT_SECRET', '');
    this.encryptionKey = crypto.createHash('sha256').update(jwtSecret + ':google-tokens').digest();
  }

  /**
   * OWASP A02: AES-256-GCM 加密
   */
  private encrypt(plainText: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  /**
   * OWASP A02: AES-256-GCM 解密
   */
  private decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }
    const [ivB64, authTagB64, encryptedB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }

  /**
   * 嘗試解密 token，若非加密格式則視為明文（向後相容遷移期）
   */
  private safeDecrypt(value: string): string {
    if (value.includes(':') && value.split(':').length === 3) {
      try {
        return this.decrypt(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  /**
   * OWASP A01: 產生帶 HMAC 簽章的 state，防止 userId 偽造
   */
  generateSignedState(userId: string): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = `${userId}:${nonce}`;
    const secret = this.configService.get<string>('JWT_SECRET', '');
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return `${payload}:${signature}`;
  }

  /**
   * OWASP A01: 驗證 state 簽章，回傳 userId；驗證失敗拋出例外
   */
  verifySignedState(state: string): string {
    const parts = state.split(':');
    if (parts.length !== 3) {
      throw new BadRequestException('無效的 OAuth state');
    }
    const [userId, nonce, signature] = parts;
    const payload = `${userId}:${nonce}`;
    const secret = this.configService.get<string>('JWT_SECRET', '');
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      throw new BadRequestException('OAuth state 簽章驗證失敗');
    }
    return userId;
  }

  /**
   * 產生 Google OAuth 授權 URL（使用簽章 state）
   */
  getAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ];

    const signedState = this.generateSignedState(userId);

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: signedState,
    });
  }

  /**
   * 處理 OAuth 回調，驗證 state 簽章後交換 tokens 並儲存
   */
  async handleCallback(code: string, signedState: string): Promise<void> {
    const userId = this.verifySignedState(signedState);
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

      // OWASP A02: 加密後儲存 Google tokens
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: this.encrypt(tokens.access_token),
          googleRefreshToken: this.encrypt(tokens.refresh_token),
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

    // OWASP A02: 解密 tokens（向後相容明文 tokens）
    client.setCredentials({
      access_token: this.safeDecrypt(user.googleAccessToken),
      refresh_token: this.safeDecrypt(user.googleRefreshToken),
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

      // OWASP A02: 加密後儲存刷新的 token
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: credentials.access_token ? this.encrypt(credentials.access_token) : null,
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
        const decryptedToken = this.safeDecrypt(user.googleAccessToken);
        await this.oauth2Client.revokeToken(decryptedToken);
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
