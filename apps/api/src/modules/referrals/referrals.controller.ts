import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApplyReferralDto } from './dto';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  /**
   * 取得我的推薦碼
   */
  @Get('my-code')
  async getMyReferralCode(@CurrentUser() user: any) {
    return this.referralsService.getMyReferralCode(user.id);
  }

  /**
   * 使用推薦碼
   */
  @Post('apply')
  @HttpCode(HttpStatus.OK)
  async applyReferralCode(
    @CurrentUser() user: any,
    @Body() dto: ApplyReferralDto,
  ) {
    return this.referralsService.applyReferralCode(user.id, dto.referralCode);
  }

  /**
   * 取得我推薦的人列表
   */
  @Get('my-referrals')
  async getMyReferrals(@CurrentUser() user: any) {
    return this.referralsService.getMyReferrals(user.id);
  }

  /**
   * 取得推薦統計
   */
  @Get('stats')
  async getReferralStats(@CurrentUser() user: any) {
    return this.referralsService.getReferralStats(user.id);
  }

  /**
   * 檢查是否有待處理的推薦
   */
  @Get('pending')
  async checkPendingReferral(@CurrentUser() user: any) {
    return this.referralsService.checkPendingReferral(user.id);
  }
}
