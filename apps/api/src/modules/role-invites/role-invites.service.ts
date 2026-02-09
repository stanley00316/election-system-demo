import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateRoleInviteDto, RoleInviteType } from './dto/generate-role-invite.dto';

interface RoleInvitePayload {
  type: 'role-invite';
  role: RoleInviteType;
  createdBy: string;
  notes?: string;
}

@Injectable()
export class RoleInvitesService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * 產生角色邀請 Token
   */
  async generateInvite(dto: GenerateRoleInviteDto, adminId: string) {
    const expiresInHours = dto.expiresInHours || 24;
    const expiresInSeconds = expiresInHours * 3600;

    const payload: RoleInvitePayload = {
      type: 'role-invite',
      role: dto.role,
      createdBy: adminId,
      notes: dto.notes,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: expiresInSeconds,
    });

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // 記錄操作
    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'ROLE_INVITE_GENERATE',
        targetType: 'ROLE_INVITE',
        targetId: dto.role,
        details: {
          role: dto.role,
          expiresInHours,
          notes: dto.notes,
        },
      },
    });

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      role: dto.role,
    };
  }

  /**
   * 領取角色邀請
   */
  async claimInvite(token: string, userId: string) {
    // 驗證 JWT
    let payload: RoleInvitePayload;
    try {
      payload = this.jwtService.verify<RoleInvitePayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('邀請碼無效或已過期');
    }

    // 檢查 token 類型
    if (payload.type !== 'role-invite') {
      throw new BadRequestException('無效的邀請碼類型');
    }

    // 取得使用者
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { promoter: true },
    });

    if (!user) {
      throw new BadRequestException('使用者不存在');
    }

    const role = payload.role;
    let message = '';

    if (role === RoleInviteType.ADMIN) {
      // 指派管理員權限
      if (user.isAdmin) {
        message = '您已是管理員';
      } else {
        await this.prisma.user.update({
          where: { id: userId },
          data: { isAdmin: true },
        });
        message = '已成功取得管理員權限';
      }

      // 記錄操作
      await this.prisma.adminActionLog.create({
        data: {
          adminId: payload.createdBy,
          action: 'ROLE_INVITE_CLAIMED_ADMIN',
          targetType: 'USER',
          targetId: userId,
          details: { claimedBy: userId, role },
        },
      });
    } else if (role === RoleInviteType.PROMOTER) {
      // 建立推廣者
      if (user.promoter && user.promoter.isActive) {
        message = '您已是推廣者';
      } else if (user.promoter) {
        // 已有推廣者記錄但未啟用，更新狀態
        await this.prisma.promoter.update({
          where: { id: user.promoter.id },
          data: {
            status: 'ACTIVE',
            isActive: true,
            approvedAt: new Date(),
            approvedBy: payload.createdBy,
          },
        });
        message = '已重新啟用推廣者身份';
      } else {
        // 建立新推廣者
        const referralCode = await this.generateReferralCode();
        await this.prisma.promoter.create({
          data: {
            name: user.name,
            type: 'INTERNAL',
            status: 'ACTIVE',
            isActive: true,
            referralCode,
            userId: user.id,
            approvedAt: new Date(),
            approvedBy: payload.createdBy,
          },
        });
        message = '已成功取得推廣者身份';
      }

      // 記錄操作
      await this.prisma.adminActionLog.create({
        data: {
          adminId: payload.createdBy,
          action: 'ROLE_INVITE_CLAIMED_PROMOTER',
          targetType: 'USER',
          targetId: userId,
          details: { claimedBy: userId, role },
        },
      });
    }

    // 回傳更新後的使用者資料
    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        isAdmin: true,
        isSuperAdmin: true,
        promoter: {
          select: {
            id: true,
            status: true,
            isActive: true,
            referralCode: true,
          },
        },
      },
    });

    return {
      message,
      role,
      user: updatedUser,
    };
  }

  /**
   * 產生唯一推廣碼
   */
  private async generateReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let exists = true;

    while (exists) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.prisma.promoter.findUnique({
        where: { referralCode: code },
      });
      exists = !!existing;
    }

    return code!;
  }
}
