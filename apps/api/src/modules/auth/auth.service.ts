import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LineService } from './line.service';
import { TotpService } from './totp.service';
import { RedisService } from '../redis/redis.service';

export interface JwtPayload {
  sub: string;
  lineUserId: string;
  name: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isPromoter?: boolean;
  promoterId?: string;
  pending2fa?: boolean;
  jti?: string; // OWASP A07: 隨機 JWT ID 防止可預測性
}

export interface UserInfo {
  id: string;
  lineUserId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  promoter?: {
    id: string;
    status: string;
    isActive: boolean;
  } | null;
}

export interface TokenResponse {
  accessToken: string;
  user: UserInfo;
}

export interface TwoFactorPendingResponse {
  requiresTwoFactor: true;
  setupRequired: boolean;
  tempToken: string;
  user: UserInfo;
}

@Injectable()
export class AuthService {
  // OWASP A09: 使用 NestJS 結構化 Logger 取代 console.log
  private readonly logger = new Logger(AuthService.name);
  private adminLineUserId: string | undefined;

  // OWASP A07: 2FA 失敗鎖定常數
  private readonly TOTP_MAX_FAILURES = 5;
  private readonly TOTP_LOCKOUT_SECONDS = 900; // 15 分鐘
  private readonly TOTP_FAIL_PREFIX = '2fa_fail:';

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private lineService: LineService,
    private configService: ConfigService,
    private totpService: TotpService,
    private redisService: RedisService,
  ) {
    this.adminLineUserId = this.configService.get<string>('ADMIN_LINE_USER_ID');
  }

  /**
   * 檢查是否為初始管理員 LINE User ID
   */
  private isInitialAdmin(lineUserId: string): boolean {
    return !!this.adminLineUserId && lineUserId === this.adminLineUserId;
  }

  /**
   * OWASP A10: 驗證 redirectUri 是否在允許的來源白名單內
   * 防止開放重定向攻擊（Open Redirect）
   */
  private validateRedirectUri(redirectUri: string): void {
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
    const allowedOrigins = corsOrigin.includes(',')
      ? corsOrigin.split(',').map((o: string) => o.trim())
      : [corsOrigin];

    // 開發環境額外允許 localhost
    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:3002');
    }

    try {
      const redirectUrl = new URL(redirectUri);
      const redirectOrigin = redirectUrl.origin;
      if (!allowedOrigins.includes(redirectOrigin)) {
        this.logger.warn(`OWASP A10: 被拒絕的 redirectUri origin: ${redirectOrigin}`);
        throw new Error('Invalid redirect URI');
      }
    } catch (e) {
      if (e instanceof TypeError) {
        // 無效 URL 格式
        this.logger.warn('OWASP A10: 無效的 redirectUri 格式');
        throw new Error('Invalid redirect URI');
      }
      throw e;
    }
  }

  /**
   * OWASP A04: 產生帶 HMAC 簽章的 OAuth state（用於 LINE 登入 CSRF 防護）
   * 格式：nonce:timestamp:hmac
   */
  generateOAuthState(): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();
    const payload = `${nonce}:${timestamp}`;
    const secret = this.configService.get<string>('JWT_SECRET', '');
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return `${payload}:${signature}`;
  }

  /**
   * OWASP A04: 驗證 OAuth state 簽章及時效（5 分鐘內有效）
   */
  verifyOAuthState(state: string): boolean {
    const parts = state.split(':');
    if (parts.length !== 3) return false;
    const [nonce, timestamp, signature] = parts;
    const payload = `${nonce}:${timestamp}`;
    const secret = this.configService.get<string>('JWT_SECRET', '');
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    try {
      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
        return false;
      }
    } catch {
      return false;
    }
    // 檢查時效：5 分鐘內有效
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Date.now() - ts > 5 * 60 * 1000) {
      return false;
    }
    return true;
  }

  async validateLineToken(code: string, redirectUri: string, promoterCode?: string, state?: string): Promise<TokenResponse | TwoFactorPendingResponse> {
    // OWASP A04: 驗證 state 簽章（若提供）
    if (state) {
      if (!this.verifyOAuthState(state)) {
        this.logger.warn('OWASP A04: LINE OAuth state 驗證失敗');
        throw new BadRequestException('OAuth state 驗證失敗，請重新登入');
      }
    }

    // OWASP A10: 驗證 redirectUri 是否在白名單內，防止開放重定向攻擊
    this.validateRedirectUri(redirectUri);

    // OWASP A09: 不記錄 redirectUri（可能包含敏感資訊）
    this.logger.log('LINE 登入流程開始');

    // 使用 LINE 授權碼換取 access token
    let lineTokens;
    try {
      lineTokens = await this.lineService.getAccessToken(code, redirectUri);
      this.logger.log('LINE token 交換成功');
    } catch (error) {
      // OWASP A09: 記錄登入失敗事件（不記錄敏感錯誤細節）
      this.logger.warn('LINE token 交換失敗');
      throw error;
    }
    
    // 取得使用者資料
    let lineProfile;
    try {
      lineProfile = await this.lineService.getProfile(lineTokens.access_token);
      // OWASP A09: 僅記錄非敏感的識別資訊
      this.logger.log(`LINE 使用者資料取得成功: ${lineProfile.displayName}`);
    } catch (error) {
      this.logger.warn('LINE 使用者資料取得失敗');
      throw error;
    }

    // 檢查是否為初始管理員
    const shouldBeAdmin = this.isInitialAdmin(lineProfile.userId);

    // 查詢或建立使用者
    let user;
    let isNewUser = false;

    try {
      user = await this.prisma.user.findUnique({
        where: { lineUserId: lineProfile.userId },
      });
    } catch (error) {
      this.logger.error('使用者查詢失敗');
      throw error;
    }

    if (!user) {
      try {
        // 建立新使用者，若為初始管理員則設為 isAdmin + isSuperAdmin = true
        user = await this.prisma.user.create({
          data: {
            lineUserId: lineProfile.userId,
            name: lineProfile.displayName,
            avatarUrl: lineProfile.pictureUrl,
            isAdmin: shouldBeAdmin,
            isSuperAdmin: shouldBeAdmin,
          },
        });
        isNewUser = true;
        // OWASP A09: 記錄安全事件 — 新使用者註冊
        this.logger.log(`新使用者註冊: userId=${user.id}, isAdmin=${shouldBeAdmin}`);
      } catch (error) {
        this.logger.error('使用者建立失敗');
        throw error;
      }
    } else {
      try {
        // 更新使用者資料
        const updateData: any = {
          name: lineProfile.displayName,
          avatarUrl: lineProfile.pictureUrl,
        };

        // 若為初始管理員且尚未設為超級管理員，則升級
        if (shouldBeAdmin && (!user.isAdmin || !user.isSuperAdmin)) {
          updateData.isAdmin = true;
          updateData.isSuperAdmin = true;
          // OWASP A09: 記錄安全事件 — 權限提升
          this.logger.warn(`使用者權限提升為超級管理員: userId=${user.id}`);
        }

        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      } catch (error) {
        this.logger.error('使用者更新失敗');
        throw error;
      }
    }

    // 若是新使用者且有推廣碼，建立推廣者推薦記錄
    if (isNewUser && promoterCode) {
      try {
        await this.linkPromoterReferral(user.id, promoterCode);
      } catch (error) {
        // 推廣碼處理失敗不應影響登入流程
        this.logger.warn(`推廣碼處理失敗: userId=${user.id}`);
      }
    }

    // 查詢使用者的推廣者紀錄
    let promoter = null;
    try {
      promoter = await this.prisma.promoter.findUnique({
        where: { userId: user.id },
        select: { id: true, status: true, isActive: true },
      });
    } catch (error) {
      this.logger.error('推廣者查詢失敗');
      throw error;
    }

    // 超級管理員自動建立推廣人員記錄（若尚未存在）
    if (!promoter && user.isSuperAdmin) {
      try {
        promoter = await this.prisma.promoter.create({
          data: {
            userId: user.id,
            name: user.name,
            status: 'APPROVED',
            isActive: true,
            type: 'INTERNAL',
            referralCode: `ADMIN_${user.id.substring(0, 8).toUpperCase()}`,
            approvedAt: new Date(),
          },
          select: { id: true, status: true, isActive: true },
        });
        this.logger.log(`超級管理員推廣者記錄自動建立: userId=${user.id}`);
      } catch (error) {
        this.logger.warn(`超級管理員推廣者記錄建立失敗: userId=${user.id}`);
        // 不影響登入流程
      }
    }

    const isPromoter = !!promoter && promoter.isActive && promoter.status === 'APPROVED';

    const userInfo: UserInfo = {
      id: user.id,
      lineUserId: user.lineUserId,
      name: user.name,
      email: user.email ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      promoter: promoter ?? null,
    };

    // 2FA 檢查：所有使用者必須完成雙因素驗證
    try {
      // 簽發臨時 token（5 分鐘有效，標記 pending2fa）
      // OWASP A07: 使用隨機 UUID 作為 JTI，防止可預測性攻擊
      const tempPayload = {
        sub: user.id,
        lineUserId: user.lineUserId,
        name: user.name,
        pending2fa: true,
        jti: randomUUID(),
      };
      const tempToken = this.jwtService.sign(tempPayload, { expiresIn: '5m' });

      this.logger.log(`2FA 驗證待完成: userId=${user.id}, setupRequired=${!user.totpEnabled}`);

      return {
        requiresTwoFactor: true as const,
        setupRequired: !user.totpEnabled,
        tempToken,
        user: userInfo,
      };
    } catch (error) {
      this.logger.error('臨時 token 簽發失敗');
      throw error;
    }
  }

  /**
   * 將新使用者連結到推廣者的推薦記錄
   */
  private async linkPromoterReferral(userId: string, promoterCode: string): Promise<void> {
    // 查找推廣者（透過推廣碼）
    const promoter = await this.prisma.promoter.findUnique({
      where: { referralCode: promoterCode.toUpperCase() },
    });

    if (!promoter || !promoter.isActive) {
      return; // 推廣碼無效或推廣者已停用，靜默忽略
    }

    // 檢查使用者是否已有推廣者推薦記錄
    const existingReferral = await this.prisma.promoterReferral.findUnique({
      where: { referredUserId: userId },
    });

    if (existingReferral) {
      return; // 已有推薦記錄，不重複建立
    }

    // 查找是否有對應的分享連結
    const shareLink = await this.prisma.shareLink.findFirst({
      where: { promoterId: promoter.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // 建立推廣者推薦記錄
    await this.prisma.promoterReferral.create({
      data: {
        promoterId: promoter.id,
        referredUserId: userId,
        shareLinkId: shareLink?.id,
        channel: shareLink?.channel,
        status: 'REGISTERED',
        registeredAt: new Date(),
      },
    });
  }

  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      // OWASP A09: 記錄安全事件 — 驗證失敗
      this.logger.warn(`Token 驗證失敗: userId=${payload.sub}, 使用者${!user ? '不存在' : '已停用'}`);
      throw new UnauthorizedException('使用者不存在或已停用');
    }

    return user;
  }

  async refreshToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('使用者不存在或已停用');
    }

    const promoter = await this.prisma.promoter.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true, isActive: true },
    });

    const isPromoter = !!promoter && promoter.isActive && promoter.status === 'APPROVED';

    // OWASP A07: 使用隨機 UUID 作為 JTI
    const payload: JwtPayload = {
      sub: user.id,
      lineUserId: user.lineUserId,
      name: user.name,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      isPromoter,
      promoterId: promoter?.id,
      jti: randomUUID(),
    };

    return this.jwtService.sign(payload);
  }

  async getMe(userId: string) {
    // OWASP A07: 使用 select 排除敏感欄位（totpSecret, googleTokens 等）
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        lineUserId: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        isSuspended: true,
        isAdmin: true,
        isSuperAdmin: true,
        totpEnabled: true,
        consentAcceptedAt: true,
        consentVersion: true,
        portraitConsentAcceptedAt: true,
        createdAt: true,
        updatedAt: true,
        campaigns: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        teamMembers: {
          include: {
            campaign: true,
          },
        },
        promoter: {
          select: { id: true, status: true, isActive: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('使用者不存在');
    }

    return user;
  }

  async acceptConsent(
    userId: string,
    consentVersion: string,
    portraitConsent: boolean,
  ) {
    const now = new Date();
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        consentAcceptedAt: now,
        consentVersion,
        portraitConsentAcceptedAt: portraitConsent ? now : null,
      },
      select: {
        consentAcceptedAt: true,
        consentVersion: true,
        portraitConsentAcceptedAt: true,
      },
    });
    return user;
  }

  async revokeConsent(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        consentAcceptedAt: null,
        consentVersion: null,
        portraitConsentAcceptedAt: null,
      },
      select: {
        consentAcceptedAt: true,
        consentVersion: true,
        portraitConsentAcceptedAt: true,
      },
    });
    return user;
  }

  async findUserByLineId(lineUserId: string) {
    return this.prisma.user.findUnique({
      where: { lineUserId },
    });
  }

  // ==================== 2FA / TOTP ====================

  /**
   * 產生 TOTP 密鑰和 QR Code（首次設定）
   */
  async setupTotp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('使用者不存在');
    }
    if (user.totpEnabled) {
      throw new BadRequestException('雙因素驗證已啟用');
    }

    const { secret, qrCodeDataUrl, otpauthUrl } = await this.totpService.generateTotpSecret(
      userId,
      user.name,
    );

    // 加密後暫存密鑰（尚未啟用，等待驗證碼確認）
    const encryptedSecret = this.totpService.encrypt(secret);
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: encryptedSecret },
    });

    // OWASP A02: 不回傳明文 secret，QR Code 中已包含密鑰資訊
    // 僅回傳 otpauthUrl 供手動輸入場景使用（使用者在 authenticator app 中手動新增）
    return { qrCodeDataUrl, otpauthUrl };
  }

  /**
   * 首次設定：驗證 TOTP 碼並啟用 2FA，回傳完整 JWT
   */
  async verifyAndEnableTotp(userId: string, code: string): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('使用者不存在');
    }
    if (user.totpEnabled) {
      throw new BadRequestException('雙因素驗證已啟用');
    }
    if (!user.totpSecret) {
      throw new BadRequestException('請先執行 2FA 設定');
    }

    // OWASP A07: 累計失敗鎖定機制（與 verifyTotp 共用計數器）
    const failKey = `${this.TOTP_FAIL_PREFIX}${userId}`;
    if (this.redisService.available) {
      const failCountStr = await this.redisService.get(failKey);
      const failCount = parseInt(failCountStr || '0', 10);
      if (failCount >= this.TOTP_MAX_FAILURES) {
        this.logger.warn(`2FA 設定已鎖定: userId=${userId}, 連續失敗 ${failCount} 次`);
        throw new BadRequestException(
          `驗證碼嘗試次數過多，請等待 ${this.TOTP_LOCKOUT_SECONDS / 60} 分鐘後再試`,
        );
      }
    }

    const decryptedSecret = this.totpService.decrypt(user.totpSecret);
    const isValid = this.totpService.verifyToken(decryptedSecret, code);
    if (!isValid) {
      // OWASP A09: 記錄安全事件
      this.logger.warn(`2FA 設定驗證失敗: userId=${userId}`);
      // OWASP A07: 遞增失敗計數
      if (this.redisService.available) {
        const failCountStr = await this.redisService.get(failKey);
        const newCount = (parseInt(failCountStr || '0', 10) + 1).toString();
        await this.redisService.set(failKey, newCount, this.TOTP_LOCKOUT_SECONDS);
      }
      throw new BadRequestException('驗證碼不正確，請確認 Google Authenticator 上的驗證碼');
    }

    // OWASP A07: 驗證成功，清除失敗計數
    if (this.redisService.available) {
      await this.redisService.del(failKey);
    }

    // 啟用 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true, totpEnabledAt: new Date() },
    });

    this.logger.log(`2FA 已啟用: userId=${userId}`);
    return this.issueFullToken(user);
  }

  /**
   * 登入時驗證 TOTP 碼，回傳完整 JWT
   */
  async verifyTotp(userId: string, code: string): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('使用者不存在');
    }
    if (!user.totpEnabled || !user.totpSecret) {
      throw new BadRequestException('雙因素驗證未啟用');
    }

    // OWASP A07: 累計失敗鎖定機制 — 連續 5 次失敗後鎖定 15 分鐘
    const failKey = `${this.TOTP_FAIL_PREFIX}${userId}`;
    if (this.redisService.available) {
      const failCountStr = await this.redisService.get(failKey);
      const failCount = parseInt(failCountStr || '0', 10);
      if (failCount >= this.TOTP_MAX_FAILURES) {
        this.logger.warn(`2FA 已鎖定: userId=${userId}, 連續失敗 ${failCount} 次`);
        throw new BadRequestException(
          `驗證碼嘗試次數過多，請等待 ${this.TOTP_LOCKOUT_SECONDS / 60} 分鐘後再試`,
        );
      }
    }

    const decryptedSecret = this.totpService.decrypt(user.totpSecret);
    const isValid = this.totpService.verifyToken(decryptedSecret, code);
    if (!isValid) {
      this.logger.warn(`2FA 驗證失敗: userId=${userId}`);
      // OWASP A07: 遞增失敗計數
      if (this.redisService.available) {
        const failCountStr = await this.redisService.get(failKey);
        const newCount = (parseInt(failCountStr || '0', 10) + 1).toString();
        await this.redisService.set(failKey, newCount, this.TOTP_LOCKOUT_SECONDS);
      }
      throw new BadRequestException('驗證碼不正確');
    }

    // OWASP A07: 驗證成功，清除失敗計數
    if (this.redisService.available) {
      await this.redisService.del(failKey);
    }

    this.logger.log(`2FA 驗證成功: userId=${userId}`);
    return this.issueFullToken(user);
  }

  /**
   * 簽發完整 JWT（2FA 驗證通過後）
   */
  private async issueFullToken(user: any): Promise<TokenResponse> {
    const promoter = await this.prisma.promoter.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true, isActive: true },
    });

    const isPromoter = !!promoter && promoter.isActive && promoter.status === 'APPROVED';

    // OWASP A07: 使用隨機 UUID 作為 JTI
    const payload: JwtPayload = {
      sub: user.id,
      lineUserId: user.lineUserId,
      name: user.name,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      isPromoter,
      promoterId: promoter?.id,
      jti: randomUUID(),
    };

    const accessToken = this.jwtService.sign(payload);
    this.logger.log(`登入成功（2FA 完成）: userId=${user.id}`);

    return {
      accessToken,
      user: {
        id: user.id,
        lineUserId: user.lineUserId,
        name: user.name,
        email: user.email ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        promoter: promoter ?? null,
      },
    };
  }
}
