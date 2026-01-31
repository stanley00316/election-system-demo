import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminUsersService } from './admin-users.service';
import { AdminUserFilterDto, SuspendUserDto } from './dto/user-filter.dto';
import { AdminGuard } from '../../admin-auth/guards/admin.guard';
import { CurrentAdmin } from '../../admin-auth/decorators/current-admin.decorator';
import { AdminAuthService } from '../../admin-auth/admin-auth.service';

@Controller('admin/users')
@UseGuards(AdminGuard)
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

    // 記錄操作
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

    // 記錄操作
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
