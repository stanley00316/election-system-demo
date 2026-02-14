import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuperAdminGuard } from '../../admin-auth/guards/super-admin.guard';
import { CurrentAdmin } from '../../admin-auth/decorators/current-admin.decorator';
import { AdminSeedService } from './admin-seed.service';

@ApiTags('Admin - Seed')
@Controller('admin/seed')
@UseGuards(SuperAdminGuard)
@ApiBearerAuth()
export class AdminSeedController {
  constructor(private readonly seedService: AdminSeedService) {}

  @Post()
  @ApiOperation({ summary: '建立範例資料（僅限超級管理員）' })
  async seed(@CurrentAdmin() admin: any) {
    return this.seedService.seedForUser(admin.id);
  }

  @Post('cleanup')
  @ApiOperation({ summary: '清理錯誤資料並重新 seed（僅限超級管理員）' })
  async cleanupAndReseed(@CurrentAdmin() admin: any) {
    return this.seedService.cleanupAndReseed(admin.id);
  }
}
