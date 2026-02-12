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

  async validate(payload: JwtPayload & { iat?: number }) {
    // OWASP A07: 檢查 token 是否被個別撤銷
    const jti = `${payload.sub}:${payload.iat}`;
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
