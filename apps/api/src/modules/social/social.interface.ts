/**
 * 社群分享介面定義
 */

export type SocialPlatform = 'facebook' | 'line' | 'x' | 'instagram' | 'threads' | 'tiktok' | 'youtube' | 'telegram' | 'whatsapp';

export interface SocialShareRequest {
  /** 要分享的平台列表 */
  platforms: SocialPlatform[];
  /** 自訂訊息文字 */
  message?: string;
}

export interface SocialShareResult {
  platform: SocialPlatform;
  success: boolean;
  postUrl?: string;
  error?: string;
}

export interface AlbumShareData {
  title: string;
  description?: string | null;
  publicUrl: string;
  coverPhotoUrl?: string;
  photoUrls: string[];
  photoCount: number;
  campaignName: string;
}

export interface SocialProvider {
  /** 平台名稱 */
  readonly platform: SocialPlatform;
  /** 是否已設定（有 API key） */
  isConfigured(): boolean;
  /** 發佈貼文 */
  publish(data: AlbumShareData, message?: string): Promise<SocialShareResult>;
}
