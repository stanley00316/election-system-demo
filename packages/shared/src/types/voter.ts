// 選民相關型別定義

export enum PoliticalStance {
  STRONG_SUPPORT = 'STRONG_SUPPORT',   // 強力支持
  SUPPORT = 'SUPPORT',                 // 支持
  LEAN_SUPPORT = 'LEAN_SUPPORT',       // 傾向支持
  NEUTRAL = 'NEUTRAL',                 // 中立
  UNDECIDED = 'UNDECIDED',             // 未表態
  LEAN_OPPOSE = 'LEAN_OPPOSE',         // 傾向反對
  OPPOSE = 'OPPOSE',                   // 反對
  STRONG_OPPOSE = 'STRONG_OPPOSE',     // 強烈反對
}

export enum PoliticalParty {
  KMT = 'KMT',           // 國民黨
  DPP = 'DPP',           // 民進黨
  TPP = 'TPP',           // 民眾黨
  NPP = 'NPP',           // 時代力量
  TSP = 'TSP',           // 台灣基進
  OTHER = 'OTHER',       // 其他
  INDEPENDENT = 'INDEPENDENT', // 無黨籍
  UNKNOWN = 'UNKNOWN',   // 不明
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Voter {
  id: string;
  campaignId: string;
  name: string;
  phone?: string;
  email?: string;
  lineId?: string;      // LINE ID
  lineUrl?: string;     // LINE 個人連結
  address?: string;
  city?: string;
  district?: string;
  village?: string;      // 里
  neighborhood?: string; // 鄰
  location?: GeoLocation;
  politicalParty?: PoliticalParty;
  stance: PoliticalStance;
  influenceScore: number;  // 0-100
  age?: number;
  gender?: 'M' | 'F' | 'OTHER';
  occupation?: string;
  tags: string[];
  notes?: string;
  contactCount: number;
  lastContactAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CreateVoterDto {
  campaignId: string;
  name: string;
  phone?: string;
  email?: string;
  lineId?: string;
  lineUrl?: string;
  address?: string;
  city?: string;
  district?: string;
  village?: string;
  neighborhood?: string;
  politicalParty?: PoliticalParty;
  stance?: PoliticalStance;
  age?: number;
  gender?: 'M' | 'F' | 'OTHER';
  occupation?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateVoterDto {
  name?: string;
  phone?: string;
  email?: string;
  lineId?: string;
  lineUrl?: string;
  address?: string;
  city?: string;
  district?: string;
  village?: string;
  neighborhood?: string;
  politicalParty?: PoliticalParty;
  stance?: PoliticalStance;
  influenceScore?: number;
  age?: number;
  gender?: 'M' | 'F' | 'OTHER';
  occupation?: string;
  tags?: string[];
  notes?: string;
}

export interface VoterRelationship {
  id: string;
  sourceVoterId: string;
  targetVoterId: string;
  relationType: RelationType;
  influenceWeight: number; // 影響力權重 0-100
  notes?: string;
  createdAt: Date;
}

export enum RelationType {
  FAMILY = 'FAMILY',           // 家人
  SPOUSE = 'SPOUSE',           // 配偶
  PARENT = 'PARENT',           // 父母
  CHILD = 'CHILD',             // 子女
  SIBLING = 'SIBLING',         // 兄弟姊妹
  NEIGHBOR = 'NEIGHBOR',       // 鄰居
  FRIEND = 'FRIEND',           // 朋友
  COLLEAGUE = 'COLLEAGUE',     // 同事
  COMMUNITY = 'COMMUNITY',     // 社區關係
  OTHER = 'OTHER',             // 其他
}

export interface VoterFilter {
  campaignId: string;
  search?: string;
  city?: string;
  district?: string;
  village?: string;
  stance?: PoliticalStance[];
  politicalParty?: PoliticalParty[];
  minInfluenceScore?: number;
  maxInfluenceScore?: number;
  tags?: string[];
  hasContact?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'influenceScore' | 'lastContactAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface VoterImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

// 選民附件類型
export enum AttachmentType {
  BUSINESS_CARD = 'BUSINESS_CARD',  // 名片
  PHOTO = 'PHOTO',                   // 照片
  DOCUMENT = 'DOCUMENT',             // 文件
  OTHER = 'OTHER',                   // 其他
}

export interface VoterAttachment {
  id: string;
  voterId: string;
  type: AttachmentType;
  fileName: string;
  fileUrl: string;        // 檔案 URL 或 base64 data URL
  fileSize?: number;      // 檔案大小（bytes）
  mimeType?: string;      // MIME 類型
  createdAt: Date;
}
