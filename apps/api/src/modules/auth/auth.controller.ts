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
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LineCallbackDto } from './dto/line-callback.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

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
  async logout() {
    // JWT 是無狀態的，登出由前端處理（清除 token）
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
}
