import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { AdminGuard } from './guards/admin.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  /**
   * 取得目前管理員資訊（透過一般 LINE 登入後驗證）
   */
  @Get('me')
  @UseGuards(AdminGuard)
  async getMe(@CurrentAdmin() admin: any) {
    return this.adminAuthService.getAdminInfo(admin.id);
  }

  /**
   * 取得所有管理員列表
   */
  @Get('admins')
  @UseGuards(AdminGuard)
  async getAdmins() {
    return this.adminAuthService.getAdmins();
  }

  /**
   * 指派管理員權限
   */
  @Post('admins/:userId')
  @UseGuards(AdminGuard)
  async assignAdmin(
    @Param('userId') userId: string,
    @CurrentAdmin() admin: any,
    @Req() req: Request,
  ) {
    const result = await this.adminAuthService.assignAdmin(userId, admin.id);

    // 記錄操作
    await this.adminAuthService.logAction(
      admin.id,
      'ADMIN_ASSIGN',
      'USER',
      userId,
      null,
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  /**
   * 移除管理員權限
   */
  @Delete('admins/:userId')
  @UseGuards(AdminGuard)
  async removeAdmin(
    @Param('userId') userId: string,
    @CurrentAdmin() admin: any,
    @Req() req: Request,
  ) {
    const result = await this.adminAuthService.removeAdmin(userId, admin.id);

    // 記錄操作
    await this.adminAuthService.logAction(
      admin.id,
      'ADMIN_REMOVE',
      'USER',
      userId,
      null,
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }
}
