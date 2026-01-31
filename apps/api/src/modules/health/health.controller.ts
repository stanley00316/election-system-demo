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

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
