import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IPaymentProvider,
  CreatePaymentParams,
  PaymentResult,
  PaymentVerifyResult,
} from './payment-provider.interface';

@Injectable()
export class EcpayProvider implements IPaymentProvider {
  private merchantId: string;
  private hashKey: string;
  private hashIv: string;
  private isProduction: boolean;

  constructor(private configService: ConfigService) {
    this.merchantId = this.configService.getOrThrow<string>('ECPAY_MERCHANT_ID');
    this.hashKey = this.configService.getOrThrow<string>('ECPAY_HASH_KEY');
    this.hashIv = this.configService.getOrThrow<string>('ECPAY_HASH_IV');
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  private get apiUrl(): string {
    return this.isProduction
      ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
      : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
  }

  /**
   * 建立付款請求
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    try {
      const merchantTradeNo = `EC${params.orderId.substring(0, 16)}`;
      const merchantTradeDate = this.formatDate(new Date());

      const baseParams: Record<string, string> = {
        MerchantID: this.merchantId,
        MerchantTradeNo: merchantTradeNo,
        MerchantTradeDate: merchantTradeDate,
        PaymentType: 'aio',
        TotalAmount: String(params.amount),
        TradeDesc: encodeURIComponent('選情系統訂閱'),
        ItemName: params.description,
        ReturnURL: params.notifyUrl,
        OrderResultURL: params.returnUrl,
        ClientBackURL: params.clientBackUrl || params.returnUrl,
        ChoosePayment: 'Credit',
        EncryptType: '1',
        NeedExtraPaidInfo: 'Y',
      };

      // 計算檢查碼
      const checkMacValue = this.generateCheckMacValue(baseParams);
      baseParams.CheckMacValue = checkMacValue;

      // 回傳表單提交資料
      return {
        success: true,
        paymentUrl: this.apiUrl,
        transactionId: merchantTradeNo,
        rawResponse: {
          formData: baseParams,
          apiUrl: this.apiUrl,
        },
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  /**
   * 驗證回調
   */
  async verifyCallback(callbackData: any): Promise<PaymentVerifyResult> {
    try {
      const { CheckMacValue, ...params } = callbackData;

      // 驗證檢查碼
      const calculatedCheckMac = this.generateCheckMacValue(params);
      if (calculatedCheckMac !== CheckMacValue) {
        return {
          success: false,
          errorMessage: '檢查碼驗證失敗',
        };
      }

      // 檢查交易狀態
      if (callbackData.RtnCode !== '1') {
        return {
          success: false,
          errorMessage: callbackData.RtnMsg || '交易失敗',
          rawResponse: callbackData,
        };
      }

      return {
        success: true,
        transactionId: callbackData.TradeNo,
        amount: parseInt(callbackData.TradeAmt, 10),
        paidAt: this.parseEcpayDate(callbackData.PaymentDate),
        rawResponse: callbackData,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  /**
   * 產生檢查碼
   */
  private generateCheckMacValue(params: Record<string, string>): string {
    // 依照參數名稱排序
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    // 加上 HashKey 和 HashIV
    const rawString = `HashKey=${this.hashKey}&${sortedParams}&HashIV=${this.hashIv}`;

    // URL encode
    const encodedString = encodeURIComponent(rawString).toLowerCase();

    // SHA256 加密
    const hash = crypto.createHash('sha256').update(encodedString).digest('hex');

    return hash.toUpperCase();
  }

  /**
   * 格式化日期為 ECPay 格式
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 解析 ECPay 日期格式
   */
  private parseEcpayDate(dateStr: string): Date {
    // 格式: 2024/01/15 14:30:00
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('/').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }
}
