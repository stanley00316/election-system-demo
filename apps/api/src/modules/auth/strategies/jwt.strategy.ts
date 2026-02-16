import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';
import { TokenBlacklistService } from '../token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
    private tokenBlacklist: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload & { iat?: number; pending2fa?: boolean }) {
    // OWASP A07: 拒絕未完成 2FA 驗證的臨時 token 存取一般 API
    if (payload.pending2fa) {
      throw new UnauthorizedException('請先完成雙因素驗證');
    }

    // OWASP A07: 檢查 token 是否被個別撤銷（優先使用隨機 JTI，向下相容舊格式）
    const jti = payload.jti || `${payload.sub}:${payload.iat}`;
    if (await this.tokenBlacklist.isBlacklisted(jti)) {
      throw new UnauthorizedException('Token 已被撤銷');
    }

    // OWASP A07: 檢查使用者的所有 token 是否被全域撤銷
    if (payload.iat && await this.tokenBlacklist.isUserTokenRevoked(payload.sub, payload.iat)) {
      throw new UnauthorizedException('Token 已被撤銷');
    }

    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
