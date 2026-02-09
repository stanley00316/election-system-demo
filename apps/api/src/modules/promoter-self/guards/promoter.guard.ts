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
export class PromoterGuard implements CanActivate {
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
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // 從資料庫取得使用者
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('使用者不存在');
      }

      if (!user.isActive || user.isSuspended) {
        throw new UnauthorizedException('帳號已停用或被暫停');
      }

      // 查詢推廣者紀錄
      const promoter = await this.prisma.promoter.findUnique({
        where: { userId: user.id },
        include: {
          rewardConfig: true,
          trialConfig: true,
        },
      });

      if (!promoter) {
        throw new ForbiddenException('您不是推廣者');
      }

      if (!promoter.isActive || promoter.status !== 'APPROVED') {
        throw new ForbiddenException('您的推廣者帳號尚未啟用或已停用');
      }

      // 將資訊附加到 request
      request.user = user;
      request.promoter = promoter;

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
