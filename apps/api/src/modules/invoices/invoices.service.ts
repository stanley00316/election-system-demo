import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface InvoiceData {
  invoiceType: 'PERSONAL' | 'COMPANY';
  carrierType?: 'PHONE' | 'CERTIFICATE' | 'ECPAY';
  carrierNumber?: string;
  companyTaxId?: string;
  companyName?: string;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);
  private readonly merchantId: string;
  private readonly hashKey: string;
  private readonly hashIv: string;
  private readonly isProduction: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.merchantId = this.configService.get<string>('ECPAY_INVOICE_MERCHANT_ID', '');
    this.hashKey = this.configService.get<string>('ECPAY_INVOICE_HASH_KEY', '');
    this.hashIv = this.configService.get<string>('ECPAY_INVOICE_HASH_IV', '');
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  private get apiBaseUrl(): string {
    return this.isProduction
      ? 'https://einvoice.ecpay.com.tw/B2CInvoice'
      : 'https://einvoice-stage.ecpay.com.tw/B2CInvoice';
  }

  /**
   * P1-4: 開立電子發票
   */
  async issueInvoice(paymentId: string, invoiceData: InvoiceData) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: { include: { plan: true, user: true } } },
    });

    if (!payment) {
      throw new BadRequestException('找不到付款記錄');
    }

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('只能為已完成的付款開立發票');
    }

    if (payment.invoiceNumber) {
      throw new BadRequestException('此付款已開立發票');
    }

    // 更新付款記錄中的發票資訊
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        invoiceType: invoiceData.invoiceType,
        carrierType: invoiceData.carrierType,
        carrierNumber: invoiceData.carrierNumber,
        companyTaxId: invoiceData.companyTaxId,
        companyName: invoiceData.companyName,
        invoiceStatus: 'PENDING',
      },
    });

    // 如果 ECPay 發票 API 未設定，記錄為待開立狀態
    if (!this.merchantId || !this.hashKey || !this.hashIv) {
      this.logger.warn('ECPay 電子發票 API 未設定，發票記錄為待開立');
      return {
        success: true,
        status: 'PENDING',
        message: '發票資訊已記錄，待系統設定後自動開立',
      };
    }

    try {
      const invoiceParams = this.buildInvoiceParams(payment, invoiceData);
      const response = await fetch(`${this.apiBaseUrl}/Issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceParams),
      });

      const result: any = await response.json();

      if (result.RtnCode === 1) {
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            invoiceNumber: result.InvoiceNo,
            invoiceStatus: 'ISSUED',
          },
        });

        return {
          success: true,
          invoiceNumber: result.InvoiceNo,
          status: 'ISSUED',
        };
      }

      this.logger.error(`ECPay 發票開立失敗: ${result.RtnMsg}`);
      return {
        success: false,
        errorMessage: '發票開立失敗，請聯繫客服',
      };
    } catch (error: any) {
      this.logger.error('ECPay 發票 API 呼叫失敗', error.stack);
      return {
        success: false,
        errorMessage: '發票系統暫時無法使用',
      };
    }
  }

  /**
   * P1-4: 作廢發票
   */
  async voidInvoice(paymentId: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || !payment.invoiceNumber) {
      throw new BadRequestException('找不到發票記錄');
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { invoiceStatus: 'VOID' },
    });

    if (!this.merchantId) {
      return { success: true, message: '發票已標記為作廢（待 API 設定後同步）' };
    }

    try {
      const voidParams = {
        MerchantID: this.merchantId,
        InvoiceNo: payment.invoiceNumber,
        VoidReason: reason,
      };

      const response = await fetch(`${this.apiBaseUrl}/VoidInvoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voidParams),
      });

      const result: any = await response.json();
      return {
        success: result.RtnCode === 1,
        message: result.RtnCode === 1 ? '發票已作廢' : result.RtnMsg,
      };
    } catch (error: any) {
      this.logger.error('ECPay 作廢發票失敗', error.stack);
      return { success: false, errorMessage: '發票作廢失敗' };
    }
  }

  /**
   * P1-4: 查詢發票
   */
  async getInvoice(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceType: true,
        carrierType: true,
        carrierNumber: true,
        companyTaxId: true,
        companyName: true,
        invoiceStatus: true,
        amount: true,
        paidAt: true,
      },
    });

    if (!payment) {
      throw new BadRequestException('找不到付款記錄');
    }

    return payment;
  }

  private buildInvoiceParams(payment: any, invoiceData: InvoiceData) {
    const now = new Date();
    const params: any = {
      MerchantID: this.merchantId,
      RelateNumber: payment.id.substring(0, 30),
      CustomerID: payment.subscription.userId.substring(0, 20),
      CustomerName: payment.subscription.user.name || '',
      CustomerEmail: payment.subscription.user.email || '',
      Print: '0',
      Donation: '0',
      TaxType: '1',
      SalesAmount: payment.amount,
      InvType: '07',
      vat: '1',
      Items: [{
        ItemName: `選情系統 - ${payment.subscription.plan.name}`,
        ItemCount: 1,
        ItemWord: '式',
        ItemPrice: payment.amount,
        ItemTaxType: '1',
        ItemAmount: payment.amount,
      }],
    };

    if (invoiceData.invoiceType === 'COMPANY') {
      params.CustomerIdentifier = invoiceData.companyTaxId || '';
      params.CustomerName = invoiceData.companyName || params.CustomerName;
      params.Print = '1';
    } else {
      if (invoiceData.carrierType === 'PHONE') {
        params.CarrierType = '3';
        params.CarrierNum = invoiceData.carrierNumber || '';
      } else if (invoiceData.carrierType === 'CERTIFICATE') {
        params.CarrierType = '2';
        params.CarrierNum = invoiceData.carrierNumber || '';
      } else {
        params.CarrierType = '1';
      }
    }

    return params;
  }
}
