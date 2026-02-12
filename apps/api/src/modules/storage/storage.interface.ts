/**
 * 儲存服務介面
 * 抽象化檔案儲存操作，支援 S3 與本地磁碟
 */
export interface StorageProvider {
  /** 上傳檔案 */
  upload(key: string, buffer: Buffer, mimeType: string): Promise<void>;

  /** 刪除檔案 */
  delete(key: string): Promise<void>;

  /**
   * 取得簽名 URL（私有存取）
   * @param key 檔案的 storage key
   * @param expiresIn 有效時間（秒），預設 3600
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * 取得公開 URL（公開相簿用）
   * @param key 檔案的 storage key
   */
  getPublicUrl(key: string): string;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
