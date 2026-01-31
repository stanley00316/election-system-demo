import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminPaymentFilterDto } from './dto/payment-filter.dto';
import { Prisma, PaymentStatus, PaymentProvider } from '@prisma/client';

@Injectable()
export class AdminPaymentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 取得付款記錄列表
   */
  async getPayments(filter: AdminPaymentFilterDto) {
    const {
      status,
      provider,
      userId,
      subscriptionId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const where: Prisma.PaymentWhereInput = {};

    if (status) {
      where.status = status as PaymentStatus;
    }

    if (provider) {
      where.provider = provider as PaymentProvider;
    }

    if (subscriptionId) {
      where.subscriptionId = subscriptionId;
    }

    if (userId) {
      where.subscription = { userId };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const orderBy: Prisma.PaymentOrderByWithRelationInput = {};
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'amount') {
      orderBy.amount = sortOrder;
    } else if (sortBy === 'paidAt') {
      orderBy.paidAt = sortOrder;
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          subscription: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              plan: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 取得單一付款詳情
   */
  async getPaymentById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            plan: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('付款記錄不存在');
    }

    return payment;
  }

  /**
   * 處理退款
   */
  async refundPayment(id: string, reason?: string, amount?: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('付款記錄不存在');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('只能退款已完成的付款');
    }

    if (payment.refundedAt) {
      throw new BadRequestException('此付款已退款');
    }

    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) {
      throw new BadRequestException('退款金額不能超過原付款金額');
    }

    // 更新付款狀態
    return this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        refundAmount,
        providerData: {
          ...(payment.providerData as any || {}),
          refundReason: reason,
          refundedByAdmin: true,
        },
      },
      include: {
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            plan: true,
          },
        },
      },
    });
  }

  /**
   * 取得付款統計
   */
  async getPaymentStats(startDate?: string, endDate?: string) {
    const where: Prisma.PaymentWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // 取得各狀態統計
    const statusStats = await this.prisma.payment.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
      _sum: { amount: true },
    });

    // 取得各支付商統計
    const providerStats = await this.prisma.payment.groupBy({
      by: ['provider'],
      where: { ...where, status: PaymentStatus.COMPLETED },
      _count: { id: true },
      _sum: { amount: true },
    });

    // 計算總營收
    const completedPayments = statusStats.find((s) => s.status === 'COMPLETED');
    const refundedPayments = statusStats.find((s) => s.status === 'REFUNDED');

    const totalRevenue = (completedPayments?._sum?.amount || 0) -
      (refundedPayments?._sum?.amount || 0);

    return {
      totalRevenue,
      byStatus: statusStats.map((s) => ({
        status: s.status,
        count: s._count.id,
        amount: s._sum.amount || 0,
      })),
      byProvider: providerStats.map((p) => ({
        provider: p.provider,
        count: p._count.id,
        amount: p._sum.amount || 0,
      })),
    };
  }

  /**
   * 匯出付款報表
   */
  async exportPayments(filter: AdminPaymentFilterDto) {
    const { startDate, endDate, status, provider } = filter;

    const where: Prisma.PaymentWhereInput = {};

    if (status) {
      where.status = status as PaymentStatus;
    }

    if (provider) {
      where.provider = provider as PaymentProvider;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            plan: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 轉換為 CSV 格式
    const headers = [
      '付款編號',
      '使用者',
      'Email',
      '方案',
      '金額',
      '幣別',
      '狀態',
      '支付商',
      '付款時間',
      '建立時間',
      '發票號碼',
    ];

    const rows = payments.map((p) => [
      p.id,
      p.subscription.user.name,
      p.subscription.user.email || '',
      p.subscription.plan.name,
      p.amount,
      p.currency,
      p.status,
      p.provider,
      p.paidAt ? p.paidAt.toISOString() : '',
      p.createdAt.toISOString(),
      p.invoiceNumber || '',
    ]);

    return {
      headers,
      rows,
      total: payments.length,
    };
  }
}
