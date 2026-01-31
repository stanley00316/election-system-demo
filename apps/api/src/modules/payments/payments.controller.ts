import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreatePaymentDto, EcpayCallbackDto, NewebpayCallbackDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * 建立付款
   */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(
      user.id,
      dto.subscriptionId,
      dto.provider,
      dto.returnUrl,
      dto.clientBackUrl,
    );
  }

  /**
   * 取得付款歷史
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getPaymentHistory(@CurrentUser() user: any) {
    return this.paymentsService.getPaymentHistory(user.id);
  }

  /**
   * 取得單筆付款詳情
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPayment(@Param('id') id: string) {
    return this.paymentsService.getPayment(id);
  }

  /**
   * 驗證 Stripe 付款（前端用）
   */
  @Get('verify/stripe')
  @UseGuards(JwtAuthGuard)
  async verifyStripePayment(
    @Query('session_id') sessionId: string,
    @Query('payment_id') paymentId: string,
  ) {
    const success = await this.paymentsService.verifyStripeSession(sessionId, paymentId);
    return { success };
  }

  // ==================== Webhooks ====================

  /**
   * ECPay 回調
   */
  @Post('webhooks/ecpay')
  @Public()
  @HttpCode(HttpStatus.OK)
  async ecpayWebhook(@Body() callbackData: EcpayCallbackDto) {
    const response = await this.paymentsService.handleEcpayCallback(callbackData);
    return response;
  }

  /**
   * NewebPay 回調
   */
  @Post('webhooks/newebpay')
  @Public()
  @HttpCode(HttpStatus.OK)
  async newebpayWebhook(@Body() callbackData: NewebpayCallbackDto) {
    await this.paymentsService.handleNewebpayCallback(callbackData);
    return { status: 'ok' };
  }

  /**
   * Stripe Webhook
   */
  @Post('webhooks/stripe')
  @Public()
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const payload = req.rawBody;
    if (!payload) {
      return { status: 'error', message: 'No raw body' };
    }
    await this.paymentsService.handleStripeWebhook(payload, signature);
    return { received: true };
  }

  /**
   * 申請退款
   */
  @Post(':id/refund')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refundPayment(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.paymentsService.refundPayment(id, reason);
  }
}
