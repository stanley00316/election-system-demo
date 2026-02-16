import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  IPaymentProvider,
  CreatePaymentParams,
  PaymentResult,
  PaymentVerifyResult,
} from './payment-provider.interface';

@Injectable()
export class StripeProvider implements IPaymentProvider {
  private readonly logger = new Logger(StripeProvider.name);
  private stripe: Stripe | null = null;
  private webhookSecret: string;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';

    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    }
  }

  /**
   * 建立付款請求（使用 Stripe Checkout Session）
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    if (!this.stripe) {
      return {
        success: false,
        errorMessage: 'Stripe 尚未設定',
      };
    }

    try {
      // 建立 Checkout Session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'twd',
              product_data: {
                name: params.description,
              },
              unit_amount: params.amount, // Stripe 使用最小貨幣單位，TWD 就是元
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${params.returnUrl}?session_id={CHECKOUT_SESSION_ID}&payment_id=${params.orderId}`,
        cancel_url: params.clientBackUrl || params.returnUrl,
        metadata: {
          orderId: params.orderId,
        },
        customer_email: params.email,
      });

      return {
        success: true,
        paymentUrl: session.url || undefined,
        transactionId: session.id,
        rawResponse: session,
      };
    } catch (error: any) {
      // OWASP A05: 不洩漏 Stripe 內部錯誤給客戶端
      this.logger.error('Stripe createPayment failed', error.stack);
      return {
        success: false,
        errorMessage: '付款建立失敗，請稍後再試',
      };
    }
  }

  /**
   * 驗證 Webhook 回調
   */
  async verifyCallback(callbackData: {
    payload: string | Buffer;
    signature: string;
  }): Promise<PaymentVerifyResult> {
    if (!this.stripe) {
      return {
        success: false,
        errorMessage: 'Stripe 尚未設定',
      };
    }

    try {
      // 驗證 Webhook 簽章
      const event = this.stripe.webhooks.constructEvent(
        callbackData.payload,
        callbackData.signature,
        this.webhookSecret,
      );

      // 處理不同事件類型
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          return {
            success: true,
            transactionId: session.id,
            amount: session.amount_total || 0,
            paidAt: new Date(),
            rawResponse: session,
          };
        }

        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          return {
            success: true,
            transactionId: paymentIntent.id,
            amount: paymentIntent.amount,
            paidAt: new Date(),
            rawResponse: paymentIntent,
          };
        }

        case 'payment_intent.payment_failed': {
          const failedIntent = event.data.object as Stripe.PaymentIntent;
          return {
            success: false,
            transactionId: failedIntent.id,
            errorMessage: failedIntent.last_payment_error?.message || '付款失敗',
            rawResponse: failedIntent,
          };
        }

        default:
          return {
            success: false,
            errorMessage: `不支援的事件類型: ${event.type}`,
            rawResponse: event,
          };
      }
    } catch (error: any) {
      // OWASP A05: 不洩漏 Stripe webhook 錯誤給客戶端
      this.logger.error('Stripe verifyCallback failed', error.stack);
      return {
        success: false,
        errorMessage: '付款驗證失敗',
      };
    }
  }

  /**
   * 查詢 Checkout Session 狀態
   */
  async queryTransaction(sessionId: string): Promise<PaymentVerifyResult> {
    if (!this.stripe) {
      return {
        success: false,
        errorMessage: 'Stripe 尚未設定',
      };
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
        return {
          success: true,
          transactionId: session.id,
          amount: session.amount_total || 0,
          paidAt: new Date(),
          rawResponse: session,
        };
      }

      return {
        success: false,
        transactionId: session.id,
        errorMessage: `付款狀態: ${session.payment_status}`,
        rawResponse: session,
      };
    } catch (error: any) {
      // OWASP A05: 不洩漏 Stripe 查詢錯誤給客戶端
      this.logger.error('Stripe queryTransaction failed', error.stack);
      return {
        success: false,
        errorMessage: '付款查詢失敗',
      };
    }
  }

  /**
   * OWASP A04: 實際呼叫 Stripe Refund API 進行退款
   */
  async refund(paymentIntentId: string, amount?: number): Promise<{ success: boolean; refundId?: string; errorMessage?: string }> {
    if (!this.stripe) {
      return { success: false, errorMessage: 'Stripe 尚未設定' };
    }

    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };
      if (amount) {
        refundParams.amount = amount;
      }

      const refund = await this.stripe.refunds.create(refundParams);
      return {
        success: refund.status === 'succeeded' || refund.status === 'pending',
        refundId: refund.id,
      };
    } catch (error: any) {
      this.logger.error('Stripe refund failed', error.stack);
      return {
        success: false,
        errorMessage: '退款處理失敗，請稍後再試',
      };
    }
  }
}
