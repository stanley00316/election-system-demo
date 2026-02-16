import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Headers,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, IsOptional, IsUrl, MinLength, MaxLength } from 'class-validator';
import { PromotersService } from './promoters.service';
import { RegisterPromoterDto } from './dto/register-promoter.dto';
import { ActivateTrialDto, ApplyPromoterReferralDto } from './dto/activate-trial.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class TrackRefDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  code: string;

  @IsOptional()
  @IsString()
  url?: string;
}

@ApiTags('promoters')
@Controller('promoters')
export class PromotersController {
  constructor(private readonly promotersService: PromotersService) {}

  // === 公開端點（不需認證）===

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '外部推廣者自助註冊' })
  async registerPromoter(@Body() dto: RegisterPromoterDto) {
    return this.promotersService.registerExternalPromoter(dto);
  }

  @Get('validate/:code')
  @ApiOperation({ summary: '驗證推廣碼是否有效' })
  async validateCode(@Param('code') code: string) {
    return this.promotersService.validatePromoterCode(code);
  }

  @Get('share/:code')
  @ApiOperation({ summary: '取得分享連結資訊並記錄點擊' })
  async getShareLink(
    @Param('code') code: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('referer') referer: string,
  ) {
    return this.promotersService.getShareLinkAndRecordClick(code, ip, userAgent, referer);
  }

  @Get('trial/:code')
  @ApiOperation({ summary: '取得試用邀請資訊' })
  async getTrialInfo(@Param('code') code: string) {
    return this.promotersService.getTrialInviteInfo(code);
  }

  @Post('track-ref')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: '記錄 ?ref=CODE 追蹤點擊' })
  async trackRef(
    @Body() dto: TrackRefDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('referer') referer: string,
  ) {
    return this.promotersService.trackRefClick(dto.code, dto.url, ip, userAgent, referer);
  }

  // === 需認證端點 ===

  @Post('trial/claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '已登入使用者認領試用' })
  async claimTrial(@Req() req: any, @Body() dto: ActivateTrialDto) {
    return this.promotersService.claimTrial(req.user.id, dto.code);
  }

  @Post('referral/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '已登入使用者套用推廣碼' })
  async applyReferral(@Req() req: any, @Body() dto: ApplyPromoterReferralDto) {
    return this.promotersService.applyPromoterReferral(req.user.id, dto.code);
  }
}
