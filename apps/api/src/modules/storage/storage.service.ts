import { Inject, Injectable } from '@nestjs/common';
import { StorageProvider, STORAGE_PROVIDER } from './storage.interface';

/**
 * 統一儲存服務入口
 * 根據環境變數 STORAGE_PROVIDER 自動切換底層實作
 */
@Injectable()
export class StorageService implements StorageProvider {
  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly provider: StorageProvider,
  ) {}

  upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    return this.provider.upload(key, buffer, mimeType);
  }

  delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }

  getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    return this.provider.getSignedUrl(key, expiresIn);
  }

  getPublicUrl(key: string): string {
    return this.provider.getPublicUrl(key);
  }
}
