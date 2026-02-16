import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ReferralsService } from '../referrals/referrals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EcpayProvider } from './providers/ecpay.provider';
import { NewebpayProvider } from './providers/newebpay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { CreatePaymentParams, PaymentVerifyResult } from './providers/payment-provider.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private baseUrl: string;

  // OWASP A10: 允許的 returnUrl 域名白名單
  private allowedReturnDomains: string[];

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private subscriptionsService: SubscriptionsService,
    @Inject(forwardRef(() => ReferralsService))
    private referralsService: ReferralsService,
    private notificationsService: NotificationsService,
    private ecpayProvider: EcpayProvider,
    private newebpayProvider: NewebpayProvider,
    private stripeProvider: StripeProvider,
  ) {
    this.baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    // OWASP A10: 設定允許的 returnUrl 域名白名單
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN', '');
    const extraDomains = corsOrigin ? corsOrigin.split(',').map(o => o.trim()).filter(Boolean) : [];
    this.allowedReturnDomains = [this.baseUrl, ...extraDomains];
  }

  /**
   * OWASP A09: 記錄付款相關審計日誌
   */
  private async logPaymentActivity(userId: string, action: string, entityId?: string, details?: any) {
    try {
      await this.prisma.activityLog.create({
        data: { userId, action, entity: 'PAYMENT', entityId, details },
      });
    } catch (err) {
      this.logger.warn(`審計日誌寫入失敗: ${action}`, err instanceof Error ? err.message : undefined);
    }
  }

  /**
   * OWASP A10: 驗證 returnUrl 是否為允許的域名，防止 Open Redirect
   */
  private validateReturnUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    try {
      const parsed = new URL(url);
      const isAllowed = this.allowedReturnDomains.some(allowed => {
        try {
          const allowedParsed = new URL(allowed);
          return parsed.origin === allowedParsed.origin;
        } catch {
          return false;
        }
      });
      if (!isAllowed) {
        this.logger.warn(`OWASP A10: 拒絕不允許的 returnUrl: ${url}`);
        return undefined;
      }
      return url;
    } catch {
      this.logger.warn(`OWASP A10: 拒絕無效的 returnUrl: ${url}`);
      return undefined;
    }
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

    // OWASP A04: 訂閱狀態驗證 — 只允許特定狀態建立付款
    const payableStatuses = ['TRIAL', 'PENDING', 'PAST_DUE'];
    if (!payableStatuses.includes(subscription.status)) {
      throw new BadRequestException(`目前訂閱狀態（${subscription.status}）不允許建立付款`);
    }

    // OWASP A04: 竟態條件保護 — 檢查是否已有進行中的付款
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        subscriptionId,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
      },
    });
    if (existingPayment) {
      throw new BadRequestException('此訂閱已有進行中的付款，請等待付款完成或取消後再試');
    }

    // P0-2: 計算實際付款金額（超管調整 > 方案原價）
    const basePrice = subscription.plan.price;
    let finalAmount: number;
    let discountAmount: number | undefined;
    let adjustmentNote: string | undefined;

    if (subscription.customPrice !== null && subscription.customPrice !== undefined) {
      finalAmount = subscription.customPrice;
      discountAmount = basePrice - finalAmount;
      adjustmentNote = `超管自訂金額（原價 ${basePrice}）`;
    } else if (subscription.priceAdjustment !== null && subscription.priceAdjustment !== undefined) {
      finalAmount = Math.max(0, basePrice + subscription.priceAdjustment);
      discountAmount = -subscription.priceAdjustment;
      adjustmentNote = `超管調整 ${subscription.priceAdjustment > 0 ? '+' : ''}${subscription.priceAdjustment}`;
    } else {
      finalAmount = basePrice;
    }

    // 建立付款記錄
    const payment = await this.prisma.payment.create({
      data: {
        subscriptionId,
        amount: finalAmount,
        originalAmount: basePrice !== finalAmount ? basePrice : undefined,
        discountAmount,
        adjustmentNote,
        currency: 'TWD',
        status: PaymentStatus.PENDING,
        provider,
      },
    });

    // OWASP A10: 驗證並清理 returnUrl/clientBackUrl，防止 Open Redirect
    const safeReturnUrl = this.validateReturnUrl(returnUrl);
    const safeClientBackUrl = this.validateReturnUrl(clientBackUrl);

    // 準備付款參數
    const paymentParams: CreatePaymentParams = {
      orderId: payment.id,
      amount: finalAmount,
      description: `選情系統 - ${subscription.plan.name}`,
      returnUrl: safeReturnUrl || `${this.baseUrl}/dashboard/settings/billing?payment=${payment.id}`,
      notifyUrl: `${this.baseUrl}/api/payments/webhooks/${provider.toLowerCase()}`,
      clientBackUrl: safeClientBackUrl || `${this.baseUrl}/pricing`,
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

    // OWASP A09: 記錄付款建立審計日誌
    await this.logPaymentActivity(subscription.userId, 'CREATE_PAYMENT', payment.id, {
      provider, amount: payment.amount, subscriptionId,
    });

    return {
      paymentId: payment.id,
      paymentUrl: result.paymentUrl,
      formData: result.rawResponse?.formData,
      apiUrl: result.rawResponse?.apiUrl,
    };
  }

  /**
   * P1-5: 建立銀行轉帳付款（手動確認模式）
   */
  async createBankTransferPayment(userId: string, subscriptionId: string, returnUrl?: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, user: true },
    });

    if (!subscription) {
      throw new NotFoundException('找不到訂閱');
    }
    if (subscription.userId !== userId) {
      throw new BadRequestException('無權限操作此訂閱');
    }

    const payableStatuses = ['TRIAL', 'PENDING', 'PAST_DUE'];
    if (!payableStatuses.includes(subscription.status)) {
      throw new BadRequestException(`目前訂閱狀態不允許建立付款`);
    }

    // 計算金額（同 createPayment 的 P0-2 邏輯）
    const basePrice = subscription.plan.price;
    let finalAmount = basePrice;
    if (subscription.customPrice !== null && subscription.customPrice !== undefined) {
      finalAmount = subscription.customPrice;
    } else if (subscription.priceAdjustment !== null && subscription.priceAdjustment !== undefined) {
      finalAmount = Math.max(0, basePrice + subscription.priceAdjustment);
    }

    const payment = await this.prisma.payment.create({
      data: {
        subscriptionId,
        amount: finalAmount,
        originalAmount: basePrice !== finalAmount ? basePrice : undefined,
        currency: 'TWD',
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.MANUAL,
        bankTransferInfo: {
          bankName: '台灣銀行',
          bankCode: '004',
          accountNumber: '待設定',
          accountName: '選情系統',
        },
      },
    });

    return {
      paymentId: payment.id,
      amount: finalAmount,
      bankInfo: payment.bankTransferInfo,
      message: '請完成銀行轉帳後，管理員將於 1-2 個工作天內確認您的付款。',
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
      this.logger.error(`找不到付款記錄: ${paymentId}`);
      return;
    }

    // OWASP A04: 冪等性保護 — 已完成或已退款的付款不再處理
    if (payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.REFUNDED) {
      this.logger.warn(`付款已處理，跳過重複回呼: paymentId=${paymentId}, status=${payment.status}`);
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

      // P0-1: 發送付款成功通知
      try {
        await this.notificationsService.sendPaymentSuccessNotification(
          payment.subscription.userId,
          payment.id,
        );
      } catch (error) {
        this.logger.error('發送付款成功通知失敗', error instanceof Error ? error.stack : undefined);
      }

      // 發放推薦獎勵（如果有推薦人）
      try {
        await this.referralsService.grantReferralReward(payment.subscription.userId);
      } catch (error) {
        // 推薦獎勵發放失敗不應影響付款流程
        this.logger.error('發放推薦獎勵失敗', error instanceof Error ? error.stack : undefined);
      }

      // 處理推廣者推薦記錄（如果有）
      try {
        await this.processPromoterReferralOnPayment(
          payment.subscription.userId,
          payment.subscriptionId,
        );
      } catch (error) {
        this.logger.error('處理推廣者推薦記錄失敗', error instanceof Error ? error.stack : undefined);
      }

      // 處理試用邀請轉換（如果有）
      try {
        await this.processTrialInviteConversion(
          payment.subscription.userId,
          payment.subscriptionId,
        );
      } catch (error) {
        this.logger.error('處理試用邀請轉換失敗', error instanceof Error ? error.stack : undefined);
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

      // P0-1: 發送付款失敗通知
      try {
        await this.notificationsService.sendPaymentFailedNotification(
          payment.subscription.userId,
          payment.id,
        );
      } catch (error) {
        this.logger.error('發送付款失敗通知失敗', error instanceof Error ? error.stack : undefined);
      }
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
   * OWASP A01: 驗證付款記錄屬於當前使用者
   */
  async getPayment(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
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

    if (!payment) {
      throw new NotFoundException('找不到付款記錄');
    }

    if (payment.subscription.userId !== userId) {
      throw new BadRequestException('無權限查看此付款記錄');
    }

    return payment;
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
   * OWASP A01: 驗證付款記錄屬於當前使用者
   */
  async refundPayment(paymentId: string, userId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: true },
    });

    if (!payment) {
      throw new NotFoundException('找不到付款記錄');
    }

    if (payment.subscription.userId !== userId) {
      throw new BadRequestException('無權限操作此付款記錄');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('此付款無法退款');
    }

    // P1-6: 根據 provider 呼叫對應的退款 API
    if (!payment.providerPaymentId) {
      throw new BadRequestException('缺少支付商交易 ID，無法執行退款');
    }

    let refundResult: { success: boolean; errorMessage?: string };

    switch (payment.provider) {
      case PaymentProvider.STRIPE:
        refundResult = await this.stripeProvider.refund(payment.providerPaymentId);
        break;
      case PaymentProvider.ECPAY: {
        const providerData = payment.providerData as any;
        const tradeNo = providerData?.TradeNo || payment.providerPaymentId;
        refundResult = await this.ecpayProvider.refund(payment.providerPaymentId, tradeNo, payment.amount);
        break;
      }
      case PaymentProvider.NEWEBPAY:
        refundResult = await this.newebpayProvider.refund(payment.providerPaymentId, payment.amount);
        break;
      case PaymentProvider.MANUAL:
        refundResult = { success: true };
        break;
      default:
        throw new BadRequestException('此支付方式暫不支援退款');
    }

    if (!refundResult.success) {
      throw new BadRequestException(refundResult.errorMessage || '退款處理失敗');
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

    // 取消訂閱（payment.subscription 已在查詢時 include）
    if (payment.subscription) {
      await this.subscriptionsService.cancelSubscription(
        payment.subscription.userId,
        reason || '退款取消',
      );
    }

    return { success: true };
  }
}
