import { Controller, Post, Headers, ForbiddenException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminSeedService } from './admin-seed.service';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Admin - Seed')
@Controller('admin/seed')
export class AdminSeedController {
  constructor(
    private readonly seedService: AdminSeedService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post()
  @ApiOperation({ summary: '建立範例資料（需要 seed key）' })
  async seed(@Headers('x-seed-key') seedKey: string) {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!seedKey || seedKey !== secret) {
      throw new ForbiddenException('Invalid seed key');
    }

    // 找到第一個 super admin
    const superAdmin = await this.prisma.user.findFirst({
      where: { isSuperAdmin: true },
    });

    if (!superAdmin) {
      throw new ForbiddenException('No super admin found');
    }

    return this.seedService.seedForUser(superAdmin.id);
  }
}
