import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { SuperAdminGuard } from '../admin-auth/guards/super-admin.guard';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '健康檢查' })
  async check() {
    // OWASP A05: 公開端點只回傳最小資訊，不暴露內部服務狀態
    const dbHealthy = await this.checkDatabase();
    return {
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '就緒檢查（需超級管理員權限）' })
  async ready() {
    // OWASP A05: 詳細服務狀態需要認證
    const dbHealthy = await this.checkDatabase();
    return {
      status: dbHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
      },
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
      const superAdmin = await this.prisma.user.findFirst({
        where: { isSuperAdmin: true },
      });
      if (!superAdmin) return { error: '找不到超級管理員' };

      const existing = await this.prisma.promoter.findUnique({
        where: { userId: superAdmin.id },
      });
      if (existing) return { message: '推廣人員記錄已存在', promoter: existing };

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
      // OWASP A05: 不洩漏內部錯誤訊息給客戶端
      this.logger.error('Fix promoter failed', error.stack);
      return { error: '操作失敗，請查看伺服器日誌' };
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
