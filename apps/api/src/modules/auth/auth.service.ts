import { Injectable, UnauthorizedException } from '@nestjs/common';
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

  async validateLineToken(code: string, redirectUri: string, promoterCode?: string): Promise<TokenResponse> {
    // 使用 LINE 授權碼換取 access token
    const lineTokens = await this.lineService.getAccessToken(code, redirectUri);
    
    // 取得使用者資料
    const lineProfile = await this.lineService.getProfile(lineTokens.access_token);

    // 檢查是否為初始管理員
    const shouldBeAdmin = this.isInitialAdmin(lineProfile.userId);

    // 查詢或建立使用者
    let user = await this.prisma.user.findUnique({
      where: { lineUserId: lineProfile.userId },
    });

    let isNewUser = false;

    if (!user) {
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

      if (shouldBeAdmin) {
        console.log(`初始超級管理員已建立: LINE User ID = ${lineProfile.userId}`);
      }
    } else {
      // 更新使用者資料
      // 若已經是管理員則保持，若是初始管理員則升級為管理員
      const updateData: any = {
        name: lineProfile.displayName,
        avatarUrl: lineProfile.pictureUrl,
      };

      // 若為初始管理員且尚未設為超級管理員，則升級
      if (shouldBeAdmin && (!user.isAdmin || !user.isSuperAdmin)) {
        updateData.isAdmin = true;
        updateData.isSuperAdmin = true;
        console.log(`使用者已升級為超級管理員: LINE User ID = ${lineProfile.userId}`);
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    // 若是新使用者且有推廣碼，建立推廣者推薦記錄
    if (isNewUser && promoterCode) {
      try {
        await this.linkPromoterReferral(user.id, promoterCode);
      } catch (error) {
        // 推廣碼處理失敗不應影響登入流程
        console.error('處理推廣碼失敗:', error);
      }
    }

    // 查詢使用者的推廣者紀錄
    const promoter = await this.prisma.promoter.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true, isActive: true },
    });

    const isPromoter = !!promoter && promoter.isActive && promoter.status === 'APPROVED';

    // 產生 JWT（包含 isAdmin / isSuperAdmin / isPromoter 資訊）
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
