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
export class NewebpayProvider implements IPaymentProvider {
  private merchantId: string;
  private hashKey: string;
  private hashIv: string;
  private isProduction: boolean;

  constructor(private configService: ConfigService) {
    this.merchantId = this.configService.get<string>('NEWEBPAY_MERCHANT_ID') || '';
    this.hashKey = this.configService.get<string>('NEWEBPAY_HASH_KEY') || '';
    this.hashIv = this.configService.get<string>('NEWEBPAY_HASH_IV') || '';
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  private get apiUrl(): string {
    return this.isProduction
      ? 'https://core.newebpay.com/MPG/mpg_gateway'
      : 'https://ccore.newebpay.com/MPG/mpg_gateway';
  }

  /**
   * 建立付款請求
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    try {
      const orderNo = `NP${params.orderId.substring(0, 16)}`;
      const timeStamp = Math.floor(Date.now() / 1000);

      // 交易資料
      const tradeInfo: Record<string, any> = {
        MerchantID: this.merchantId,
        RespondType: 'JSON',
        TimeStamp: timeStamp,
        Version: '2.0',
        MerchantOrderNo: orderNo,
        Amt: params.amount,
        ItemDesc: params.description,
        ReturnURL: params.returnUrl,
        NotifyURL: params.notifyUrl,
        ClientBackURL: params.clientBackUrl || params.returnUrl,
        Email: params.email || '',
        LoginType: 0,
        CREDIT: 1,
      };

      // 將交易資料轉為 query string
      const tradeInfoStr = Object.entries(tradeInfo)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

      // AES 加密
      const encryptedTradeInfo = this.aesEncrypt(tradeInfoStr);

      // SHA256 雜湊
      const tradeSha = this.sha256Hash(encryptedTradeInfo);

      // 組合表單資料
      const formData = {
        MerchantID: this.merchantId,
        TradeInfo: encryptedTradeInfo,
        TradeSha: tradeSha,
        Version: '2.0',
      };

      return {
        success: true,
        paymentUrl: this.apiUrl,
        transactionId: orderNo,
        rawResponse: {
          formData,
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
      const { TradeInfo, TradeSha } = callbackData;

      // 驗證 SHA256
      const calculatedSha = this.sha256Hash(TradeInfo);
      if (calculatedSha !== TradeSha) {
        return {
          success: false,
          errorMessage: '簽章驗證失敗',
        };
      }

      // 解密交易資料
      const decryptedData = this.aesDecrypt(TradeInfo);
      const tradeResult = JSON.parse(decryptedData);

      // 檢查交易狀態
      if (tradeResult.Status !== 'SUCCESS') {
        return {
          success: false,
          errorMessage: tradeResult.Message || '交易失敗',
          rawResponse: tradeResult,
        };
      }

      const result = tradeResult.Result;
      return {
        success: true,
        transactionId: result.TradeNo,
        amount: parseInt(result.Amt, 10),
        paidAt: new Date(result.PayTime),
        rawResponse: tradeResult,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  /**
   * AES-256-CBC 加密
   */
  private aesEncrypt(data: string): string {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      this.hashKey,
      this.hashIv,
    );
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * AES-256-CBC 解密
   */
  private aesDecrypt(encrypted: string): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      this.hashKey,
      this.hashIv,
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * SHA256 雜湊
   */
  private sha256Hash(data: string): string {
    const hashStr = `HashKey=${this.hashKey}&${data}&HashIV=${this.hashIv}`;
    return crypto.createHash('sha256').update(hashStr).digest('hex').toUpperCase();
  }
}
