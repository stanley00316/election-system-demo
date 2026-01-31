import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'production') {
      // 依照外鍵依賴順序刪除
      const models = [
        'eventAttendee',
        'scheduleItem',
        'contact',
        'voterRelationship',
        'event',
        'schedule',
        'voter',
        'teamMember',
        'campaign',
        'activityLog',
        'user',
        'district',
      ];

      for (const model of models) {
        await (this as any)[model]?.deleteMany?.();
      }
    }
  }
}
