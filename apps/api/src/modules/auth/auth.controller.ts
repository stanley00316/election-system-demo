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
import { TokenBlacklistService } from './token-blacklist.service';
import { LineCallbackDto } from './dto/line-callback.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {}

  // OWASP A05: 登入端點使用更嚴格的頻率限制（每分鐘 10 次）
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('line/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'LINE 登入回呼' })
  @ApiBody({ type: LineCallbackDto })
  async lineCallback(@Body() dto: LineCallbackDto) {
    return this.authService.validateLineToken(dto.code, dto.redirectUri);
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
        const jti = `${payload.sub}:${payload.iat}`;
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

  // OWASP A05: 移除 debug-check 端點
  // 該端點公開洩露環境變數狀態、使用者資料和 JWT 功能，已移除。
  // 如需除錯，請使用安全的監控工具（如 Sentry）或透過超級管理員保護的端點。
}
