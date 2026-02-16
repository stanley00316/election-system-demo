import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TempTokenGuard } from './guards/temp-token.guard';
import { TokenBlacklistService } from './token-blacklist.service';
import { LineCallbackDto } from './dto/line-callback.dto';
import { AcceptConsentDto } from './dto/accept-consent.dto';
import { VerifyTotpDto } from './dto/verify-totp.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {}

  // OWASP A04: 產生帶 HMAC 簽章的 OAuth state，前端使用此 state 發起 LINE 登入
  @Public()
  @Get('oauth-state')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '產生 OAuth CSRF state' })
  generateOAuthState() {
    return { state: this.authService.generateOAuthState() };
  }

  // OWASP A05: 登入端點使用更嚴格的頻率限制（每分鐘 10 次）
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('line/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'LINE 登入回呼' })
  @ApiBody({ type: LineCallbackDto })
  async lineCallback(@Body() dto: LineCallbackDto) {
    return this.authService.validateLineToken(dto.code, dto.redirectUri, dto.promoterCode, dto.state);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新 Token' })
  async refresh(@Req() req: any) {
    const accessToken = await this.authService.refreshToken(req.user.id);
    return { accessToken };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得當前使用者資訊' })
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @Post('consent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '接受個資法同意書' })
  async acceptConsent(
    @Req() req: any,
    @Body() dto: AcceptConsentDto,
  ) {
    return this.authService.acceptConsent(
      req.user.id,
      dto.consentVersion,
      dto.portraitConsent,
    );
  }

  @Post('revoke-consent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '撤回個資法同意' })
  async revokeConsent(@Req() req: any) {
    return this.authService.revokeConsent(req.user.id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登出' })
  async logout(@Req() req: any) {
    // OWASP A07: 將當前 token 加入黑名單
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        );
        // OWASP A07: 優先使用隨機 JTI，向下相容舊 token 格式
        const jti = payload.jti || `${payload.sub}:${payload.iat}`;
        // 計算剩餘 TTL（token 過期時間 - 當前時間）
        const ttl = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 1800;
        if (ttl > 0) {
          await this.tokenBlacklist.blacklist(jti, ttl);
        }
      } catch {
        // 解析失敗不影響登出
      }
    }
    return { message: '已登出' };
  }

  @Public()
  @Get('dev-login')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: '開發環境測試登入（僅限開發環境）' })
  async devLogin() {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv !== 'development') {
      throw new ForbiddenException('此端點僅限開發環境使用');
    }

    // 使用種子資料的測試使用者
    const user = await this.authService.findUserByLineId('test-line-user-id');
    if (!user) {
      throw new NotFoundException(
        '測試使用者不存在，請先執行 pnpm db:seed 建立種子資料',
      );
    }

    const accessToken = await this.authService.refreshToken(user.id);
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // ==================== 2FA / TOTP ====================

  // OWASP A05: 2FA 端點使用嚴格的頻率限制（每分鐘 5 次，防暴力破解）
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('2fa/setup')
  @UseGuards(TempTokenGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '產生 2FA QR Code（首次設定）' })
  async setup2fa(@Req() req: any) {
    return this.authService.setupTotp(req.user.id);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('2fa/verify-setup')
  @UseGuards(TempTokenGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '驗證 TOTP 並啟用 2FA' })
  @ApiBody({ type: VerifyTotpDto })
  async verifySetup2fa(@Req() req: any, @Body() dto: VerifyTotpDto) {
    return this.authService.verifyAndEnableTotp(req.user.id, dto.code);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('2fa/verify')
  @UseGuards(TempTokenGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '驗證 TOTP 驗證碼（登入）' })
  @ApiBody({ type: VerifyTotpDto })
  async verify2fa(@Req() req: any, @Body() dto: VerifyTotpDto) {
    return this.authService.verifyTotp(req.user.id, dto.code);
  }

  // OWASP A05: 移除 debug-check 端點
  // 該端點公開洩露環境變數狀態、使用者資料和 JWT 功能，已移除。
  // 如需除錯，請使用安全的監控工具（如 Sentry）或透過超級管理員保護的端點。
}
