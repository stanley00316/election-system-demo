import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ReferralsService } from '../referrals/referrals.service';
import { EcpayProvider } from './providers/ecpay.provider';
import { NewebpayProvider } from './providers/newebpay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { CreatePaymentParams, PaymentVerifyResult } from './providers/payment-provider.interface';

@Injectable()
export class PaymentsService {
  private baseUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private subscriptionsService: SubscriptionsService,
    @Inject(forwardRef(() => ReferralsService))
    private referralsService: ReferralsService,
    private ecpayProvider: EcpayProvider,
    private newebpayProvider: NewebpayProvider,
    private stripeProvider: StripeProvider,
  ) {
    this.baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
  }

  /**
   * 建立付款
   */
  async createPayment(
    userId: string,
    subscriptionId: string,
    provider: PaymentProvider,
    returnUrl?: string,
    clientBackUrl?: string,
  ) {
    // 取得訂閱資訊
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: true,
        user: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('找不到訂閱');
    }

    if (subscription.userId !== userId) {
      throw new BadRequestException('無權限操作此訂閱');
    }

    // 建立付款記錄
    const payment = await this.prisma.payment.create({
      data: {
        subscriptionId,
        amount: subscription.plan.price,
        currency: 'TWD',
        status: PaymentStatus.PENDING,
        provider,
      },
    });

    // 準備付款參數
    const paymentParams: CreatePaymentParams = {
      orderId: payment.id,
      amount: subscription.plan.price,
      description: `選情系統 - ${subscription.plan.name}`,
      returnUrl: returnUrl || `${this.baseUrl}/dashboard/settings/billing?payment=${payment.id}`,
      notifyUrl: `${this.baseUrl}/api/payments/webhooks/${provider.toLowerCase()}`,
      clientBackUrl: clientBackUrl || `${this.baseUrl}/pricing`,
      email: subscription.user.email || undefined,
      userName: subscription.user.name,
    };

    // 依照支付商建立付款
    let result;
    switch (provider) {
      case PaymentProvider.ECPAY:
        result = await this.ecpayProvider.createPayment(paymentParams);
        break;
      case PaymentProvider.NEWEBPAY:
        result = await this.newebpayProvider.createPayment(paymentParams);
        break;
      case PaymentProvider.STRIPE:
        result = await this.stripeProvider.createPayment(paymentParams);
        break;
      default:
        throw new BadRequestException('不支援的支付方式');
    }

    if (!result.success) {
      // 標記付款失敗
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          failureReason: result.errorMessage,
        },
      });
      throw new BadRequestException(result.errorMessage || '建立付款失敗');
    }

    // 更新付款記錄
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PROCESSING,
        providerPaymentId: result.transactionId,
        providerData: result.rawResponse,
      },
    });

    return {
      paymentId: payment.id,
      paymentUrl: result.paymentUrl,
      formData: result.rawResponse?.formData,
      apiUrl: result.rawResponse?.apiUrl,
    };
  }

  /**
   * 處理 ECPay 回調
   */
  async handleEcpayCallback(callbackData: any): Promise<string> {
    const result = await this.ecpayProvider.verifyCallback(callbackData);
    await this.processPaymentResult(callbackData.MerchantTradeNo, result, PaymentProvider.ECPAY);
    return result.success ? '1|OK' : '0|Fail';
  }

  /**
   * 處理 NewebPay 回調
   */
  async handleNewebpayCallback(callbackData: any): Promise<void> {
    const result = await this.newebpayProvider.verifyCallback(callbackData);
    // 從解密後的資料中取得訂單編號
    const orderId = result.rawResponse?.Result?.MerchantOrderNo?.replace('NP', '');
    if (orderId) {
      await this.processPaymentResult(orderId, result, PaymentProvider.NEWEBPAY);
    }
  }

  /**
   * 處理 Stripe Webhook
   */
  async handleStripeWebhook(payload: string | Buffer, signature: string): Promise<void> {
    const result = await this.stripeProvider.verifyCallback({ payload, signature });
    
    if (result.rawResponse?.metadata?.orderId) {
      await this.processPaymentResult(
        result.rawResponse.metadata.orderId,
        result,
        PaymentProvider.STRIPE,
      );
    }
  }

  /**
   * 驗證 Stripe Checkout Session（用於前端確認付款）
   */
  async verifyStripeSession(sessionId: string, paymentId: string): Promise<boolean> {
    const result = await this.stripeProvider.queryTransaction(sessionId);
    
    if (result.success) {
      await this.processPaymentResult(paymentId, result, PaymentProvider.STRIPE);
      return true;
    }
    
    return false;
  }

  /**
   * 處理付款結果
   */
  private async processPaymentResult(
    paymentIdOrOrderNo: string,
    result: PaymentVerifyResult,
    provider: PaymentProvider,
  ): Promise<void> {
    // 從訂單編號取得付款 ID
    let paymentId = paymentIdOrOrderNo;
    if (paymentIdOrOrderNo.startsWith('EC') || paymentIdOrOrderNo.startsWith('NP')) {
      paymentId = paymentIdOrOrderNo.substring(2);
    }

    // 尋找付款記錄
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: true },
    });

    if (!payment) {
      console.error(`找不到付款記錄: ${paymentId}`);
      return;
    }

    if (result.success) {
      // 更新付款為成功
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          providerPaymentId: result.transactionId,
          paidAt: result.paidAt || new Date(),
          providerData: result.rawResponse,
        },
      });

      // 啟用訂閱
      await this.subscriptionsService.activateSubscription(payment.subscriptionId);

      // 發放推薦獎勵（如果有推薦人）
      try {
        await this.referralsService.grantReferralReward(payment.subscription.userId);
      } catch (error) {
        // 推薦獎勵發放失敗不應影響付款流程
        console.error('發放推薦獎勵失敗:', error);
      }

      // 處理推廣者推薦記錄（如果有）
      try {
        await this.processPromoterReferralOnPayment(
          payment.subscription.userId,
          payment.subscriptionId,
        );
      } catch (error) {
        console.error('處理推廣者推薦記錄失敗:', error);
      }

      // 處理試用邀請轉換（如果有）
      try {
        await this.processTrialInviteConversion(
          payment.subscription.userId,
          payment.subscriptionId,
        );
      } catch (error) {
        console.error('處理試用邀請轉換失敗:', error);
      }
    } else {
      // 更新付款為失敗
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          failureReason: result.errorMessage,
          providerData: result.rawResponse,
        },
      });
    }
  }

  /**
   * 取得付款歷史
   */
  async getPaymentHistory(userId: string) {
    return this.prisma.payment.findMany({
      where: {
        subscription: {
          userId,
        },
      },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 取得單筆付款
   */
  async getPayment(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: {
          include: {
            plan: true,
            user: true,
          },
        },
      },
    });
  }

  /**
   * 處理推廣者推薦記錄 - 付款成功時更新狀態
   */
  private async processPromoterReferralOnPayment(
    userId: string,
    subscriptionId: string,
  ): Promise<void> {
    const promoterReferral = await this.prisma.promoterReferral.findUnique({
      where: { referredUserId: userId },
      include: {
        promoter: {
          include: { rewardConfig: true },
        },
      },
    });

    if (!promoterReferral) return;
    if (['SUBSCRIBED', 'RENEWED'].includes(promoterReferral.status)) return;

    // 更新推薦記錄狀態
    const updateData: any = {
      status: 'SUBSCRIBED',
      subscribedAt: new Date(),
      subscriptionId,
    };

    // 計算推廣者獎勵
    const rewardConfig = promoterReferral.promoter.rewardConfig;
    if (rewardConfig) {
      switch (rewardConfig.rewardType) {
        case 'FIXED_AMOUNT':
          if (rewardConfig.fixedAmount) {
            updateData.rewardAmount = rewardConfig.fixedAmount;
            updateData.rewardGrantedAt = new Date();
            updateData.rewardNotes = `固定獎勵 NT$${rewardConfig.fixedAmount}`;
          }
          break;
        case 'SUBSCRIPTION_EXTENSION':
          if (rewardConfig.extensionMonths) {
            // 查找推廣者的訂閱並延長
            if (promoterReferral.promoter.userId) {
              const promoterSub = await this.prisma.subscription.findFirst({
                where: {
                  userId: promoterReferral.promoter.userId,
                  status: { in: ['TRIAL', 'ACTIVE'] },
                },
              });
              if (promoterSub) {
                const currentEnd = new Date(promoterSub.currentPeriodEnd);
                currentEnd.setMonth(currentEnd.getMonth() + rewardConfig.extensionMonths);
                await this.prisma.subscription.update({
                  where: { id: promoterSub.id },
                  data: { currentPeriodEnd: currentEnd },
                });
              }
            }
            updateData.rewardNotes = `訂閱延長 ${rewardConfig.extensionMonths} 個月`;
            updateData.rewardGrantedAt = new Date();
          }
          break;
        case 'PERCENTAGE':
          // 百分比獎勵需要知道付款金額，在此僅記錄
          if (rewardConfig.percentage) {
            updateData.rewardNotes = `待計算百分比獎勵 ${rewardConfig.percentage}%`;
          }
          break;
      }
    }

    await this.prisma.promoterReferral.update({
      where: { id: promoterReferral.id },
      data: updateData,
    });
  }

  /**
   * 處理試用邀請轉換 - 付款成功時標記為已轉換
   */
  private async processTrialInviteConversion(
    userId: string,
    subscriptionId: string,
  ): Promise<void> {
    const trialInvite = await this.prisma.trialInvite.findUnique({
      where: { activatedUserId: userId },
    });

    if (!trialInvite) return;
    if (trialInvite.status === 'CONVERTED') return;

    await this.prisma.trialInvite.update({
      where: { id: trialInvite.id },
      data: {
        status: 'CONVERTED',
        convertedAt: new Date(),
        subscriptionId,
      },
    });
  }

  /**
   * 申請退款（僅支援 Stripe）
   */
  async refundPayment(paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('找不到付款記錄');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('此付款無法退款');
    }

    // 目前僅支援 Stripe 退款
    if (payment.provider !== PaymentProvider.STRIPE) {
      throw new BadRequestException('此支付方式暫不支援線上退款，請聯繫客服');
    }

    // 更新付款狀態
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        refundAmount: payment.amount,
      },
    });

    // 取消訂閱
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: payment.subscriptionId },
    });

    if (subscription) {
      await this.subscriptionsService.cancelSubscription(
        subscription.userId,
        reason || '退款取消',
      );
    }

    return { success: true };
  }
}
