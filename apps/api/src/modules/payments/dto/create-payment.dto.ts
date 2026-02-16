import { IsString, IsEnum, IsOptional, IsNumber, IsUUID, MaxLength } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class CreatePaymentDto {
  @IsUUID()
  subscriptionId: string;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  returnUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  clientBackUrl?: string;
}

export class ProcessPaymentDto {
  @IsUUID()
  paymentId: string;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;
}

// ECPay 回調資料
export class EcpayCallbackDto {
  MerchantID: string;
  MerchantTradeNo: string;
  StoreID?: string;
  RtnCode: string;
  RtnMsg: string;
  TradeNo: string;
  TradeAmt: string;
  PaymentDate: string;
  PaymentType: string;
  PaymentTypeChargeFee: string;
  TradeDate: string;
  SimulatePaid: string;
  CheckMacValue: string;
}

// NewebPay 回調資料
export class NewebpayCallbackDto {
  Status: string;
  MerchantID: string;
  TradeInfo: string;
  TradeSha: string;
  Version: string;
}

// Stripe Webhook 事件
export class StripeWebhookDto {
  id: string;
  object: string;
  type: string;
  data: {
    object: any;
  };
}
