import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklistService } from '../token-blacklist.service';

/**
 * TempTokenGuard：僅允許含 pending2fa: true 的臨時 token
 * 用於保護 2FA 設定和驗證端點
 */
@Injectable()
export class TempTokenGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private tokenBlacklist: TokenBlacklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少認證 token');
    }

    const token = authHeader.replace('Bearer ', '');

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token 無效或已過期');
    }

    // 僅接受 pending2fa 標記的臨時 token
    if (!payload.pending2fa) {
      throw new UnauthorizedException('需要 2FA 臨時 token');
    }

    // 檢查 token 是否被撤銷
    const jti = `${payload.sub}:${payload.iat}`;
    if (await this.tokenBlacklist.isBlacklisted(jti)) {
      throw new UnauthorizedException('Token 已被撤銷');
    }

    // 附加 payload 到 request
    request.user = { id: payload.sub, lineUserId: payload.lineUserId, name: payload.name };
    request.tempTokenPayload = payload;

    return true;
  }
}
