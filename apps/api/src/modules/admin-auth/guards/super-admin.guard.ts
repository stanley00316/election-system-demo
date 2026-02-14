import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { TokenBlacklistService } from '../../auth/token-blacklist.service';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private tokenBlacklist: TokenBlacklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('缺少認證 Token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // OWASP A07: 檢查 token 是否被個別撤銷（登出後的 token 不應再被接受）
      const jti = `${payload.sub}:${payload.iat}`;
      if (await this.tokenBlacklist.isBlacklisted(jti)) {
        throw new UnauthorizedException('Token 已被撤銷');
      }

      // OWASP A07: 檢查使用者的所有 token 是否被全域撤銷（帳號停用時）
      if (payload.iat && await this.tokenBlacklist.isUserTokenRevoked(payload.sub, payload.iat)) {
        throw new UnauthorizedException('Token 已被撤銷');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('使用者不存在');
      }

      if (!user.isActive || user.isSuspended) {
        throw new UnauthorizedException('帳號已停用或被暫停');
      }

      if (!user.isAdmin) {
        throw new ForbiddenException('您沒有管理員權限');
      }

      if (!user.isSuperAdmin) {
        throw new ForbiddenException('此功能僅限超級管理者使用');
      }

      request.user = user;
      request.admin = {
        id: user.id,
        lineUserId: user.lineUserId,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
      };

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('無效的認證 Token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
