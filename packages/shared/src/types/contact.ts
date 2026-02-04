// 接觸紀錄相關型別定義

export enum ContactType {
  HOME_VISIT = 'HOME_VISIT',         // 家訪
  STREET_VISIT = 'STREET_VISIT',     // 掃街
  PHONE_CALL = 'PHONE_CALL',         // 電話
  LINE_CALL = 'LINE_CALL',           // LINE 通話
  LIVING_ROOM = 'LIVING_ROOM',       // 客廳會
  FUNERAL = 'FUNERAL',               // 公祭
  WEDDING = 'WEDDING',               // 喜事
  EVENT = 'EVENT',                   // 活動
  MARKETPLACE = 'MARKETPLACE',       // 市場
  TEMPLE = 'TEMPLE',                 // 廟宇
  OTHER = 'OTHER',                   // 其他
}

export enum ContactOutcome {
  POSITIVE = 'POSITIVE',         // 正面
  NEUTRAL = 'NEUTRAL',           // 中立
  NEGATIVE = 'NEGATIVE',         // 負面
  NO_RESPONSE = 'NO_RESPONSE',   // 無回應
  NOT_HOME = 'NOT_HOME',         // 不在家
}

export interface Contact {
  id: string;
  voterId: string;
  userId: string;
  campaignId: string;
  type: ContactType;
  outcome: ContactOutcome;
  contactDate: Date;
  location?: string;
  locationCoords?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  topics?: string[];        // 討論議題
  nextAction?: string;      // 下次行動
  followUpDate?: Date;      // 追蹤日期
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContactDto {
  voterId: string;
  campaignId: string;
  type: ContactType;
  outcome: ContactOutcome;
  contactDate?: Date;
  location?: string;
  locationCoords?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  topics?: string[];
  nextAction?: string;
  followUpDate?: Date;
}

export interface UpdateContactDto {
  type?: ContactType;
  outcome?: ContactOutcome;
  contactDate?: Date;
  location?: string;
  notes?: string;
  topics?: string[];
  nextAction?: string;
  followUpDate?: Date;
}

export interface ContactFilter {
  campaignId: string;
  voterId?: string;
  userId?: string;
  type?: ContactType[];
  outcome?: ContactOutcome[];
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'contactDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ContactSummary {
  totalContacts: number;
  byType: Record<ContactType, number>;
  byOutcome: Record<ContactOutcome, number>;
  recentContacts: Contact[];
}
