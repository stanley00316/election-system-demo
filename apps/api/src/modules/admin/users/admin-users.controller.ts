import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminUsersService } from './admin-users.service';
import { AdminUserFilterDto, SuspendUserDto, UpdateUserDto } from './dto/user-filter.dto';
import { AdminGuard } from '../../admin-auth/guards/admin.guard';
import { CurrentAdmin } from '../../admin-auth/decorators/current-admin.decorator';
import { AdminAuthService } from '../../admin-auth/admin-auth.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('admin/users')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  /**
   * 取得使用者列表
   */
  @Get()
  async getUsers(@Query() filter: AdminUserFilterDto) {
    return this.adminUsersService.getUsers(filter);
  }

  /**
   * 取得使用者統計
   */
  @Get('stats')
  async getUserStats() {
    return this.adminUsersService.getUserStats();
  }

  /**
   * 匯出使用者列表（CSV）
   */
  @Get('export')
  async exportUsers(
    @Query() filter: AdminUserFilterDto,
    @Res() res: Response,
  ) {
    const data = await this.adminUsersService.exportUsers(filter);

    const csvRows = [
      data.headers.join(','),
      ...data.rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="users_${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(csvContent);
  }

  /**
   * 取得單一使用者詳情
   */
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.adminUsersService.getUserById(id);
  }

  /**
   * 取得使用者活動記錄
   */
  @Get(':id/activity')
  async getUserActivity(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminUsersService.getUserActivity(id, page, limit);
  }

  /**
   * 匯出個人完整資料（CSV）
   */
  @Get(':id/export')
  async exportUserDetail(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const data = await this.adminUsersService.exportUserDetail(id);

    const csvRows: string[] = [];
    data.sections.forEach((section) => {
      csvRows.push('');
      csvRows.push(`=== ${section.title} ===`);
      csvRows.push(section.headers.join(','));
      section.rows.forEach((row) => {
        csvRows.push(row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','));
      });
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="user_${data.userName}_${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(csvContent);
  }

  /**
   * 取得使用者付款歷史
   */
  @Get(':id/payments')
  async getUserPayments(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminUsersService.getUserPayments(id, page || 1, limit || 20);
  }

  /**
   * 取得使用者推薦關係
   */
  @Get(':id/referrals')
  async getUserReferrals(@Param('id') id: string) {
    return this.adminUsersService.getUserReferrals(id);
  }

  /**
   * 取得使用者選民名單
   */
  @Get(':id/voters')
  async getUserVoters(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminUsersService.getUserVoters(id, page || 1, limit || 20, search);
  }

  /**
   * 取得使用者接觸紀錄
   */
  @Get(':id/contacts')
  async getUserContacts(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminUsersService.getUserContacts(id, page || 1, limit || 20);
  }

  /**
   * 取得使用者選情統計
   */
  @Get(':id/campaign-stats')
  async getUserCampaignStats(@Param('id') id: string) {
    return this.adminUsersService.getUserCampaignStats(id);
  }

  /**
   * 更新使用者基本資料（name, email, phone）
   * lineUserId 為認證用途，不可修改
   */
  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminUsersService.updateUser(id, dto);
  }

  /**
   * 停用使用者帳號
   */
  @Put(':id/suspend')
  async suspendUser(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @CurrentAdmin() admin: any,
    @Req() req: Request,
  ) {
    const result = await this.adminUsersService.suspendUser(id, dto.reason);

    await this.adminAuthService.logAction(
      admin.id,
      'USER_SUSPEND',
      'USER',
      id,
      { reason: dto.reason },
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  /**
   * 啟用使用者帳號
   */
  @Put(':id/activate')
  async activateUser(
    @Param('id') id: string,
    @CurrentAdmin() admin: any,
    @Req() req: Request,
  ) {
    const result = await this.adminUsersService.activateUser(id);

    await this.adminAuthService.logAction(
      admin.id,
      'USER_ACTIVATE',
      'USER',
      id,
      null,
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }
}
