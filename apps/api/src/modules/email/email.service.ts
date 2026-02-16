import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly provider: 'resend' | 'ses' | 'none';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('EMAIL_API_KEY', '');
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'noreply@example.com');
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME', '選情系統');
    this.provider = this.apiKey ? 'resend' : 'none';
  }

  get isConfigured(): boolean {
    return this.provider !== 'none';
  }

  /**
   * 發送 Email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn('Email 服務未設定（缺少 EMAIL_API_KEY），跳過發送');
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        this.logger.error(`Email 發送失敗: ${JSON.stringify(errorData)}`);
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error('Email 發送失敗', error.stack);
      return false;
    }
  }

  /**
   * 付款收據 Email
   */
  async sendPaymentReceipt(to: string, data: { planName: string; amount: number; paidAt: string; paymentId: string }) {
    return this.sendEmail({
      to,
      subject: `[選情系統] 付款收據 - ${data.planName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">付款收據</h2>
          <p>感謝您的支持！以下是您的付款明細：</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">方案</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.planName}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">金額</td><td style="padding: 8px; border-bottom: 1px solid #eee;">NT$ ${data.amount.toLocaleString()}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">付款時間</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.paidAt}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">交易編號</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.paymentId}</td></tr>
          </table>
          <p style="color: #666; font-size: 14px;">如有任何問題，請聯繫客服。</p>
        </div>
      `,
    });
  }

  /**
   * 訂閱確認 Email
   */
  async sendSubscriptionConfirmation(to: string, data: { planName: string; expiresAt: string }) {
    return this.sendEmail({
      to,
      subject: `[選情系統] 訂閱已啟用 - ${data.planName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">訂閱已啟用</h2>
          <p>您的訂閱方案「${data.planName}」已成功啟用。</p>
          <p>有效期限至：${data.expiresAt}</p>
          <p>您現在可以使用所有進階功能。</p>
          <p style="color: #666; font-size: 14px;">如有任何問題，請聯繫客服。</p>
        </div>
      `,
    });
  }

  /**
   * 到期提醒 Email
   */
  async sendExpirationReminder(to: string, data: { planName: string; daysLeft: number }) {
    return this.sendEmail({
      to,
      subject: `[選情系統] 訂閱即將到期提醒`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e67e22;">訂閱即將到期</h2>
          <p>您的「${data.planName}」方案將在 <strong>${data.daysLeft} 天</strong>後到期。</p>
          <p>請及時續約，以避免服務中斷。</p>
          <p style="color: #666; font-size: 14px;">如有任何問題，請聯繫客服。</p>
        </div>
      `,
    });
  }
}
