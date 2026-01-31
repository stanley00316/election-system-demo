import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminPaymentsService } from './admin-payments.service';
import { AdminPaymentFilterDto, RefundPaymentDto } from './dto/payment-filter.dto';
import { AdminGuard } from '../../admin-auth/guards/admin.guard';
import { CurrentAdmin } from '../../admin-auth/decorators/current-admin.decorator';
import { AdminAuthService } from '../../admin-auth/admin-auth.service';

@Controller('admin/payments')
@UseGuards(AdminGuard)
export class AdminPaymentsController {
  constructor(
    private readonly adminPaymentsService: AdminPaymentsService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  /**
   * 取得付款記錄列表
   */
  @Get()
  async getPayments(@Query() filter: AdminPaymentFilterDto) {
    return this.adminPaymentsService.getPayments(filter);
  }

  /**
   * 取得付款統計
   */
  @Get('stats')
  async getPaymentStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminPaymentsService.getPaymentStats(startDate, endDate);
  }

  /**
   * 匯出付款報表
   */
  @Get('export')
  async exportPayments(
    @Query() filter: AdminPaymentFilterDto,
    @Res() res: Response,
  ) {
    const data = await this.adminPaymentsService.exportPayments(filter);

    // 產生 CSV
    const csvRows = [
      data.headers.join(','),
      ...data.rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payments_${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(csvContent);
  }

  /**
   * 取得單一付款詳情
   */
  @Get(':id')
  async getPaymentById(@Param('id') id: string) {
    return this.adminPaymentsService.getPaymentById(id);
  }

  /**
   * 處理退款
   */
  @Post(':id/refund')
  async refundPayment(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
    @CurrentAdmin() admin: any,
    @Req() req: Request,
  ) {
    const result = await this.adminPaymentsService.refundPayment(
      id,
      dto.reason,
      dto.amount,
    );

    // 記錄操作
    await this.adminAuthService.logAction(
      admin.id,
      'PAYMENT_REFUND',
      'PAYMENT',
      id,
      { reason: dto.reason, amount: dto.amount },
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }
}
