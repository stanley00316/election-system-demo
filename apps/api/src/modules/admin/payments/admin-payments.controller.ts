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
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('admin/payments')
@UseGuards(AdminGuard)
@ApiBearerAuth()
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
   * P2-12: 營收趨勢圖
   */
  @Get('revenue-chart')
  async getRevenueChart(@Query('months') months?: string) {
    return this.adminPaymentsService.getRevenueChart(months ? parseInt(months, 10) : 12);
  }

  /**
   * P2-12: 轉換漏斗
   */
  @Get('conversion-funnel')
  async getConversionFunnel() {
    return this.adminPaymentsService.getConversionFunnel();
  }

  /**
   * P2-12: MRR
   */
  @Get('mrr')
  async getMRR() {
    return this.adminPaymentsService.getMRR();
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
   * P1-5: 取得待確認的手動付款列表
   * 注意：此路由必須在 :id 路由之前，否則 'pending-manual' 會被當作 :id 參數
   */
  @Get('pending-manual')
  async getPendingManualPayments() {
    return this.adminPaymentsService.getPendingManualPayments();
  }

  /**
   * 取得單一付款詳情
   */
  @Get(':id')
  async getPaymentById(@Param('id') id: string) {
    return this.adminPaymentsService.getPaymentById(id);
  }

  /**
   * P1-5: 手動確認付款
   */
  @Post(':id/confirm')
  async confirmPayment(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @CurrentAdmin() admin: any,
    @Req() req: Request,
  ) {
    const result = await this.adminPaymentsService.confirmPayment(id, admin.id, notes);

    await this.adminAuthService.logAction(
      admin.id,
      'PAYMENT_CONFIRM',
      'PAYMENT',
      id,
      { notes },
      req.ip,
      req.headers['user-agent'],
    );

    return result;
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
