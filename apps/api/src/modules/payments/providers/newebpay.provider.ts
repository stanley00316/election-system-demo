import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(NewebpayProvider.name);
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
    } catch (error: any) {
      // OWASP A05: 不洩漏藍新金流內部錯誤給客戶端
      this.logger.error('NewebPay createPayment failed', error.stack);
      return {
        success: false,
        errorMessage: '付款建立失敗，請稍後再試',
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

      // OWASP A08: 驗證 MerchantID 是否為自己的，防止重放攻擊
      if (tradeResult.Result?.MerchantID && tradeResult.Result.MerchantID !== this.merchantId) {
        this.logger.warn(`NewebPay MerchantID 不符: expected=${this.merchantId}, got=${tradeResult.Result.MerchantID}`);
        return {
          success: false,
          errorMessage: '商店 ID 驗證失敗',
        };
      }

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
    } catch (error: any) {
      // OWASP A05: 不洩漏藍新金流驗證錯誤給客戶端
      this.logger.error('NewebPay verifyCallback failed', error.stack);
      return {
        success: false,
        errorMessage: '付款驗證失敗',
      };
    }
  }

  /**
   * P1-6: NewebPay 退款（信用卡取消授權/退刷）
   */
  async refund(merchantOrderNo: string, amount: number): Promise<{ success: boolean; errorMessage?: string }> {
    try {
      const closeUrl = this.isProduction
        ? 'https://core.newebpay.com/API/CreditCard/Close'
        : 'https://ccore.newebpay.com/API/CreditCard/Close';

      const postData: Record<string, any> = {
        RespondType: 'JSON',
        Version: '1.1',
        Amt: amount,
        MerchantOrderNo: merchantOrderNo,
        TimeStamp: Math.floor(Date.now() / 1000),
        IndexType: 1,
        CloseType: 2,
      };

      const postDataStr = Object.entries(postData)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');

      const encryptedData = this.aesEncrypt(postDataStr);

      const response = await fetch(closeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          MerchantID_: this.merchantId,
          PostData_: encryptedData,
        }).toString(),
      });

      const result: any = await response.json();
      if (result.Status === 'SUCCESS') {
        return { success: true };
      }
      return { success: false, errorMessage: result.Message || '退款失敗' };
    } catch (error: any) {
      this.logger.error('NewebPay refund failed', error.stack);
      return { success: false, errorMessage: '退款處理失敗，請稍後再試' };
    }
  }

  /**
   * P2-10: NewebPay 交易查詢
   */
  async queryTransaction(merchantOrderNo: string): Promise<PaymentVerifyResult> {
    try {
      const queryUrl = this.isProduction
        ? 'https://core.newebpay.com/API/QueryTradeInfo'
        : 'https://ccore.newebpay.com/API/QueryTradeInfo';

      const queryData: Record<string, any> = {
        MerchantID: this.merchantId,
        Version: '1.3',
        RespondType: 'JSON',
        TimeStamp: Math.floor(Date.now() / 1000),
        MerchantOrderNo: merchantOrderNo,
        Amt: 0,
      };

      const checkValue = crypto.createHash('sha256')
        .update(`IV=${this.hashIv}&Amt=${queryData.Amt}&MerchantID=${this.merchantId}&MerchantOrderNo=${merchantOrderNo}&Key=${this.hashKey}`)
        .digest('hex')
        .toUpperCase();

      queryData.CheckValue = checkValue;

      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(queryData).toString(),
      });

      const result: any = await response.json();
      if (result.Status === 'SUCCESS' && result.Result) {
        const r = result.Result;
        return {
          success: r.TradeStatus === '1',
          transactionId: r.TradeNo,
          amount: parseInt(r.Amt, 10) || undefined,
          paidAt: r.PayTime ? new Date(r.PayTime) : undefined,
          rawResponse: result,
        };
      }
      return { success: false, errorMessage: result.Message || '查詢失敗', rawResponse: result };
    } catch (error: any) {
      this.logger.error('NewebPay queryTransaction failed', error.stack);
      return { success: false, errorMessage: '交易查詢失敗' };
    }
  }

  /**
   * AES-256-CBC 加密（藍新金流 API 協議要求 AES-256-CBC，非自選加密模式）
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
