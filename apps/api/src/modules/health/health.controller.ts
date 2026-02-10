import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

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

  @Get('db-push')
  @ApiOperation({ summary: '手動觸發 DB Schema 同步（臨時）' })
  async dbPush() {
    const { execSync } = require('child_process');
    const results: any = {};

    // 1. 先嘗試啟用 PostGIS
    try {
      await this.prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;');
      results.postgis = 'OK';
    } catch (error: any) {
      results.postgis = `FAILED: ${error.message}`;

      // 嘗試不使用 PostGIS
      try {
        // 修改 schema 移除 PostGIS
        execSync('cp prisma/schema.prisma prisma/schema.prisma.bak', { cwd: process.cwd() });
        execSync("sed -i 's/  extensions = \\[postgis\\]/  \\/\\/ extensions = [postgis]/' prisma/schema.prisma", { cwd: process.cwd() });
        execSync('sed -i \'s/location       Unsupported("geometry(Point, 4326)")?/\\/\\/ location       Unsupported("geometry(Point, 4326)")?/\' prisma/schema.prisma', { cwd: process.cwd() });
        execSync('sed -i \'s/boundary         Unsupported("geometry(MultiPolygon, 4326)")?/\\/\\/ boundary         Unsupported("geometry(MultiPolygon, 4326)")?/\' prisma/schema.prisma', { cwd: process.cwd() });
        results.schemaModified = true;
      } catch (sedError: any) {
        results.schemaModified = `FAILED: ${sedError.message}`;
      }
    }

    // 2. 執行 prisma db push
    try {
      const output = execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', {
        cwd: process.cwd(),
        timeout: 60000,
        encoding: 'utf-8',
      });
      results.dbPush = 'OK';
      results.dbPushOutput = output.substring(0, 500);
    } catch (error: any) {
      results.dbPush = 'FAILED';
      results.dbPushOutput = (error.stdout || error.message || '').substring(0, 500);
    }

    // 3. 恢復原始 schema
    try {
      execSync('[ -f prisma/schema.prisma.bak ] && mv prisma/schema.prisma.bak prisma/schema.prisma || true', { cwd: process.cwd() });
      results.schemaRestored = true;
    } catch (e) {
      results.schemaRestored = false;
    }

    // 4. 驗證資料表
    try {
      const tables = await this.prisma.$queryRaw`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `;
      results.tables = tables;
    } catch (error: any) {
      results.tables = `ERROR: ${error.message}`;
    }

    return results;
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
