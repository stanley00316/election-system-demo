import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PromoterGuard } from './guards/promoter.guard';
import { PromoterSelfService } from './promoter-self.service';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { CreateTrialInviteDto } from './dto/create-trial-invite.dto';

@ApiTags('promoter-self')
@Controller('promoter/me')
@UseGuards(PromoterGuard)
@ApiBearerAuth()
export class PromoterSelfController {
  constructor(private readonly promoterSelfService: PromoterSelfService) {}

  @Get()
  @ApiOperation({ summary: '取得推廣者自身資料' })
  async getProfile(@Req() req: any) {
    return this.promoterSelfService.getProfile(req.promoter.id);
  }

  @Get('stats')
  @ApiOperation({ summary: '取得推廣者統計摘要' })
  async getStats(@Req() req: any) {
    return this.promoterSelfService.getStats(req.promoter.id);
  }

  @Get('referrals')
  @ApiOperation({ summary: '取得推薦紀錄' })
  async getReferrals(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.promoterSelfService.getReferrals(req.promoter.id, {
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('share-links')
  @ApiOperation({ summary: '取得分享連結列表' })
  async getShareLinks(@Req() req: any) {
    return this.promoterSelfService.getShareLinks(req.promoter.id);
  }

  @Post('share-links')
  @ApiOperation({ summary: '建立新分享連結' })
  async createShareLink(@Req() req: any, @Body() dto: CreateShareLinkDto) {
    return this.promoterSelfService.createShareLink(req.promoter.id, dto);
  }

  @Get('trial-invites')
  @ApiOperation({ summary: '取得試用邀請列表' })
  async getTrialInvites(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.promoterSelfService.getTrialInvites(req.promoter.id, {
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('trial-invites')
  @ApiOperation({ summary: '建立新試用邀請' })
  async createTrialInvite(@Req() req: any, @Body() dto: CreateTrialInviteDto) {
    return this.promoterSelfService.createTrialInvite(req.promoter.id, dto);
  }
}
