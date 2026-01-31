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

  async validateLineToken(code: string, redirectUri: string): Promise<TokenResponse> {
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

    if (!user) {
      // 建立新使用者，若為初始管理員則設為 isAdmin = true
      user = await this.prisma.user.create({
        data: {
          lineUserId: lineProfile.userId,
          name: lineProfile.displayName,
          avatarUrl: lineProfile.pictureUrl,
          isAdmin: shouldBeAdmin,
        },
      });

      if (shouldBeAdmin) {
        console.log(`初始管理員已建立: LINE User ID = ${lineProfile.userId}`);
      }
    } else {
      // 更新使用者資料
      // 若已經是管理員則保持，若是初始管理員則升級為管理員
      const updateData: any = {
        name: lineProfile.displayName,
        avatarUrl: lineProfile.pictureUrl,
      };

      // 若為初始管理員且尚未設為管理員，則設為管理員
      if (shouldBeAdmin && !user.isAdmin) {
        updateData.isAdmin = true;
        console.log(`使用者已升級為管理員: LINE User ID = ${lineProfile.userId}`);
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    // 產生 JWT（包含 isAdmin 資訊）
    const payload: JwtPayload = {
      sub: user.id,
      lineUserId: user.lineUserId,
      name: user.name,
      isAdmin: user.isAdmin,
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
      },
    };
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

    const payload: JwtPayload = {
      sub: user.id,
      lineUserId: user.lineUserId,
      name: user.name,
      isAdmin: user.isAdmin,
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
