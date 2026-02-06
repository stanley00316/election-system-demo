import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class AdminPlansService {
  constructor(private prisma: PrismaService) {}

  /**
   * 取得所有方案（包含停用的）
   */
  async getAllPlans() {
    return this.prisma.plan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });
  }

  /**
   * 取得單一方案
   */
  async getPlan(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('找不到該方案');
    }

    return plan;
  }

  /**
   * 建立新方案（僅超級管理者）
   */
  async createPlan(dto: CreatePlanDto) {
    // 檢查 code 是否重複
    const existing = await this.prisma.plan.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('方案代碼已存在');
    }

    return this.prisma.plan.create({
      data: {
        name: dto.name,
        code: dto.code,
        price: dto.price,
        interval: dto.interval,
        voterLimit: dto.voterLimit,
        teamLimit: dto.teamLimit,
        features: dto.features || [],
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        category: dto.category,
        regionLevel: dto.regionLevel,
        populationRatio: dto.populationRatio,
        basePrice: dto.basePrice,
        description: dto.description,
      },
    });
  }

  /**
   * 更新方案（僅超級管理者）
   */
  async updatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('找不到該方案');
    }

    return this.prisma.plan.update({
      where: { id },
      data: {
        name: dto.name,
        price: dto.price,
        interval: dto.interval,
        voterLimit: dto.voterLimit,
        teamLimit: dto.teamLimit,
        features: dto.features,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
        category: dto.category,
        regionLevel: dto.regionLevel,
        populationRatio: dto.populationRatio,
        basePrice: dto.basePrice,
        description: dto.description,
      },
    });
  }

  /**
   * 停用方案（軟刪除）
   */
  async deactivatePlan(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('找不到該方案');
    }

    return this.prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * 取得方案統計
   */
  async getPlanStats() {
    const [totalPlans, activePlans, subscriptionsByPlan] = await Promise.all([
      this.prisma.plan.count(),
      this.prisma.plan.count({ where: { isActive: true } }),
      this.prisma.subscription.groupBy({
        by: ['planId'],
        _count: { id: true },
      }),
    ]);

    return {
      totalPlans,
      activePlans,
      subscriptionsByPlan,
    };
  }
}
