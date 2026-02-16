import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);
  private readonly encryptionKey: Buffer;
  private readonly appName: string;

  constructor(private configService: ConfigService) {
    const keyHex = this.configService.get<string>('TOTP_ENCRYPTION_KEY', '');
    if (!keyHex || keyHex.length < 64) {
      this.logger.warn(
        'TOTP_ENCRYPTION_KEY 未設定或長度不足 32 bytes，使用 JWT_SECRET 衍生金鑰',
      );
      // OWASP A02: 禁止使用 fallback 預設值，強制要求 JWT_SECRET 已設定
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret || jwtSecret.length < 32) {
        throw new Error(
          'JWT_SECRET 環境變數未設定或長度不足 32 字元。' +
          '請設定安全的 JWT_SECRET 或提供 TOTP_ENCRYPTION_KEY（64 字元 hex）。',
        );
      }
      this.encryptionKey = crypto
        .createHash('sha256')
        .update(jwtSecret)
        .digest();
    } else {
      this.encryptionKey = Buffer.from(keyHex, 'hex');
    }
    this.appName = this.configService.get<string>('TOTP_APP_NAME', '選情系統');
  }

  /**
   * 產生 TOTP 密鑰 + QR Code base64 圖片
   */
  async generateTotpSecret(
    userId: string,
    userName: string,
  ): Promise<{ secret: string; qrCodeDataUrl: string; otpauthUrl: string }> {
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      secret,
      label: userName,
      issuer: this.appName,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    this.logger.log(`TOTP 密鑰已產生: userId=${userId}`);
    return { secret, qrCodeDataUrl, otpauthUrl };
  }

  /**
   * 驗證 TOTP 驗證碼（含前後 1 個時間窗口容錯）
   */
  verifyToken(secret: string, token: string): boolean {
    try {
      const result = verifySync({ token, secret } as any);
      return result.valid;
    } catch {
      return false;
    }
  }

  /**
   * AES-256-GCM 加密 TOTP 密鑰
   * OWASP A02: 靜態資料加密保護
   */
  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    // 格式: iv:authTag:encrypted（全部 base64）
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  /**
   * AES-256-GCM 解密 TOTP 密鑰
   */
  decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }
    const [ivB64, authTagB64, encryptedB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
