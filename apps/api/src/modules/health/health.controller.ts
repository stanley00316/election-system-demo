import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { SuperAdminGuard } from '../admin-auth/guards/super-admin.guard';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '健康檢查' })
  async check() {
    const dbHealthy = await this.checkDatabase();

    return {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
      },
    };
  }

  @Get('ready')
  @ApiOperation({ summary: '就緒檢查' })
  async ready() {
    const dbHealthy = await this.checkDatabase();

    if (!dbHealthy) {
      return {
        status: 'not_ready',
        message: '資料庫連線失敗',
      };
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  // OWASP A01/A03: 移除原本的 db-push 端點
  // 該端點使用 execSync 執行系統命令且無認證保護，
  // 存在命令注入與未授權存取風險。
  // 資料庫 schema 同步應透過 CI/CD pipeline 或手動 CLI 執行。

  @Get('fix-promoter')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '為超級管理員建立推廣人員記錄（需超級管理員權限）' })
  async fixPromoter() {
    try {
      // 找到超級管理員
      const superAdmin = await this.prisma.user.findFirst({
        where: { isSuperAdmin: true },
      });
      if (!superAdmin) return { error: '找不到超級管理員' };

      // 檢查是否已有推廣人員記錄
      const existing = await this.prisma.promoter.findUnique({
        where: { userId: superAdmin.id },
      });
      if (existing) return { message: '推廣人員記錄已存在', promoter: existing };

      // 建立推廣人員記錄
      const promoter = await this.prisma.promoter.create({
        data: {
          userId: superAdmin.id,
          name: superAdmin.name,
          status: 'APPROVED',
          isActive: true,
          type: 'INTERNAL',
          referralCode: `ADMIN_${superAdmin.id.substring(0, 8).toUpperCase()}`,
          approvedAt: new Date(),
        },
      });
      return { message: '推廣人員記錄已建立', promoter };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
