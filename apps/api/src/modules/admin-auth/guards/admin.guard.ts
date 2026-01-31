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

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('缺少認證 Token');
    }

    try {
      // 使用一般 JWT_SECRET 驗證（與一般用戶相同）
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // 從資料庫取得使用者，確認 isAdmin 狀態
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

      // 將管理員資訊附加到 request（同時保留為 user 和 admin）
      request.user = user;
      request.admin = {
        id: user.id,
        lineUserId: user.lineUserId,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      };

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
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
