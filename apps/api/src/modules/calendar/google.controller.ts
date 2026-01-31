import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GoogleService } from '../auth/google.service';
import { GoogleCalendarService } from './google-calendar.service';

@ApiTags('Google')
@Controller('google')
export class GoogleController {
  constructor(
    private googleService: GoogleService,
    private googleCalendarService: GoogleCalendarService,
    private configService: ConfigService,
  ) {}

  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得 Google OAuth 授權 URL' })
  getAuthUrl(@CurrentUser() user: any) {
    // 使用 userId 作為 state 以便回調時識別使用者
    const authUrl = this.googleService.getAuthUrl(user.id);
    return { authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Google OAuth 回調' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get('CORS_ORIGIN', 'http://localhost:3000');

    if (error) {
      return res.redirect(`${frontendUrl}/dashboard/settings?google=error&message=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/dashboard/settings?google=error&message=missing_params`);
    }

    try {
      // state 中儲存了 userId
      await this.googleService.handleCallback(code, state);
      return res.redirect(`${frontendUrl}/dashboard/settings?google=success`);
    } catch (err) {
      console.error('Google callback error:', err);
      return res.redirect(`${frontendUrl}/dashboard/settings?google=error&message=auth_failed`);
    }
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得 Google 連結狀態' })
  async getStatus(@CurrentUser() user: any) {
    return this.googleService.getConnectionStatus(user.id);
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '斷開 Google 連結' })
  async disconnect(@CurrentUser() user: any) {
    await this.googleService.revokeAccess(user.id);
    return { success: true, message: '已斷開 Google 連結' };
  }

  @Post('sync-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '同步所有啟用的行程到 Google Calendar' })
  async syncAll(@CurrentUser() user: any) {
    const result = await this.googleCalendarService.syncAllSchedules(user.id);
    return {
      success: true,
      ...result,
      message: `已同步 ${result.synced} 個行程${result.failed > 0 ? `，${result.failed} 個失敗` : ''}`,
    };
  }
}
