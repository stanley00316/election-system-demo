// 活動相關型別定義

export enum EventType {
  LIVING_ROOM = 'LIVING_ROOM',   // 客廳會
  FUNERAL = 'FUNERAL',           // 公祭
  WEDDING = 'WEDDING',           // 喜事
  COMMUNITY = 'COMMUNITY',       // 社區活動
  TEMPLE = 'TEMPLE',             // 廟會
  CAMPAIGN = 'CAMPAIGN',         // 競選活動
  MEETING = 'MEETING',           // 座談會
  OTHER = 'OTHER',               // 其他
}

export enum EventStatus {
  PLANNED = 'PLANNED',       // 規劃中
  CONFIRMED = 'CONFIRMED',   // 已確認
  IN_PROGRESS = 'IN_PROGRESS', // 進行中
  COMPLETED = 'COMPLETED',   // 已完成
  CANCELLED = 'CANCELLED',   // 已取消
}

export interface Event {
  id: string;
  campaignId: string;
  type: EventType;
  status: EventStatus;
  name: string;
  description?: string;
  hostVoterId?: string;      // 主揪人（如客廳會主人）
  address?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  startTime: Date;
  endTime?: Date;
  expectedAttendees?: number;
  actualAttendees?: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventAttendee {
  id: string;
  eventId: string;
  voterId: string;
  status: AttendeeStatus;
  invitedBy?: string;
  checkedInAt?: Date;
  notes?: string;
  createdAt: Date;
}

export enum AttendeeStatus {
  INVITED = 'INVITED',       // 已邀請
  CONFIRMED = 'CONFIRMED',   // 已確認
  ATTENDED = 'ATTENDED',     // 已出席
  NO_SHOW = 'NO_SHOW',       // 未出席
  CANCELLED = 'CANCELLED',   // 取消
}

export interface CreateEventDto {
  campaignId: string;
  type: EventType;
  name: string;
  description?: string;
  hostVoterId?: string;
  address?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  startTime: Date;
  endTime?: Date;
  expectedAttendees?: number;
  notes?: string;
}

export interface UpdateEventDto {
  type?: EventType;
  status?: EventStatus;
  name?: string;
  description?: string;
  hostVoterId?: string;
  address?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  startTime?: Date;
  endTime?: Date;
  expectedAttendees?: number;
  actualAttendees?: number;
  notes?: string;
}

export interface EventFilter {
  campaignId: string;
  type?: EventType[];
  status?: EventStatus[];
  startDate?: Date;
  endDate?: Date;
  hostVoterId?: string;
  page?: number;
  limit?: number;
}
