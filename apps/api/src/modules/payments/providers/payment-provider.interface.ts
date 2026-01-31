export interface PaymentResult {
  success: boolean;
  paymentUrl?: string;      // 跳轉到支付頁面的 URL
  transactionId?: string;   // 交易 ID
  errorMessage?: string;
  rawResponse?: any;
}

export interface PaymentVerifyResult {
  success: boolean;
  transactionId?: string;
  amount?: number;
  paidAt?: Date;
  errorMessage?: string;
  rawResponse?: any;
}

export interface PaymentProviderConfig {
  merchantId: string;
  hashKey: string;
  hashIv: string;
  isProduction: boolean;
}

export interface CreatePaymentParams {
  orderId: string;          // 訂單編號（Payment ID）
  amount: number;           // 金額
  description: string;      // 商品描述
  returnUrl: string;        // 付款完成後返回 URL
  notifyUrl: string;        // 後端回調 URL
  clientBackUrl?: string;   // 使用者取消時返回 URL
  email?: string;           // 使用者 Email
  userName?: string;        // 使用者名稱
}

export interface IPaymentProvider {
  /**
   * 建立付款請求
   */
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;

  /**
   * 驗證回調
   */
  verifyCallback(callbackData: any): Promise<PaymentVerifyResult>;

  /**
   * 查詢交易狀態
   */
  queryTransaction?(transactionId: string): Promise<PaymentVerifyResult>;
}
