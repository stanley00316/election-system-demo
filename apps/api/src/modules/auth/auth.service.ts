import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LineService } from './line.service';

export interface JwtPayload {
  sub: string;
  lineUserId: string;
  name: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isPromoter?: boolean;
  promoterId?: string;
}

export interface TokenResponse {
  accessToken: string;
  user: {
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
  };
}

@Injectable()
export class AuthService {
  // OWASP A09: 使用 NestJS 結構化 Logger 取代 console.log
  private readonly logger = new Logger(AuthService.name);
  private adminLineUserId: string | undefined;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private lineService: LineService,
    private configService: ConfigService,
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

  async validateLineToken(code: string, redirectUri: string, promoterCode?: string): Promise<TokenResponse> {
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

    // 產生 JWT（包含 isAdmin / isSuperAdmin / isPromoter 資訊）
    try {
      const payload: JwtPayload = {
        sub: user.id,
        lineUserId: user.lineUserId,
        name: user.name,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        isPromoter,
        promoterId: promoter?.id,
      };

      const accessToken = this.jwtService.sign(payload);
      // OWASP A09: 記錄安全事件 — 登入成功
      this.logger.log(`登入成功: userId=${user.id}, isNew=${isNewUser}`);

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
    } catch (error) {
      this.logger.error('JWT 簽發失敗');
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

    const payload: JwtPayload = {
      sub: user.id,
      lineUserId: user.lineUserId,
      name: user.name,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      isPromoter,
      promoterId: promoter?.id,
    };

    return this.jwtService.sign(payload);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
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

  async findUserByLineId(lineUserId: string) {
    return this.prisma.user.findUnique({
      where: { lineUserId },
    });
  }
}
