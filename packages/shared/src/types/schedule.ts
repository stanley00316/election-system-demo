// 行程相關型別定義

export interface Schedule {
  id: string;
  campaignId: string;
  userId: string;
  date: Date;
  title: string;
  description?: string;
  items: ScheduleItem[];
  status: ScheduleStatus;
  totalDistance?: number;    // 總距離（公尺）
  estimatedDuration?: number; // 預估時間（分鐘）
  actualDuration?: number;   // 實際時間（分鐘）
  createdAt: Date;
  updatedAt: Date;
}

export enum ScheduleStatus {
  DRAFT = 'DRAFT',           // 草稿
  PLANNED = 'PLANNED',       // 已規劃
  IN_PROGRESS = 'IN_PROGRESS', // 進行中
  COMPLETED = 'COMPLETED',   // 已完成
  CANCELLED = 'CANCELLED',   // 已取消
}

export interface ScheduleItem {
  id: string;
  scheduleId: string;
  order: number;
  type: ScheduleItemType;
  voterId?: string;
  eventId?: string;
  address?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  plannedTime?: Date;
  actualTime?: Date;
  duration?: number;         // 預計停留時間（分鐘）
  status: ScheduleItemStatus;
  notes?: string;
  travelDistance?: number;   // 到此點的距離（公尺）
  travelDuration?: number;   // 到此點的時間（分鐘）
}

export enum ScheduleItemType {
  VOTER_VISIT = 'VOTER_VISIT',   // 選民拜訪
  EVENT = 'EVENT',               // 活動
  STREET_SWEEP = 'STREET_SWEEP', // 掃街區域
  BREAK = 'BREAK',               // 休息
  OTHER = 'OTHER',               // 其他
}

export enum ScheduleItemStatus {
  PENDING = 'PENDING',       // 待執行
  IN_PROGRESS = 'IN_PROGRESS', // 進行中
  COMPLETED = 'COMPLETED',   // 已完成
  SKIPPED = 'SKIPPED',       // 跳過
}

export interface CreateScheduleDto {
  campaignId: string;
  date: Date;
  title: string;
  description?: string;
}

export interface AddScheduleItemDto {
  type: ScheduleItemType;
  voterId?: string;
  eventId?: string;
  address?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  plannedTime?: Date;
  duration?: number;
  notes?: string;
}

export interface VisitSuggestion {
  voterId: string;
  voterName: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  distance: number;          // 距離（公尺）
  influenceScore: number;
  stance: string;
  lastContactAt?: Date;
  reason: string;            // 建議原因
  priority: number;          // 優先度 1-10
}

export interface RouteOptimizationRequest {
  scheduleId: string;
  startLocation: {
    latitude: number;
    longitude: number;
  };
  endLocation?: {
    latitude: number;
    longitude: number;
  };
  optimizeFor: 'distance' | 'time' | 'priority';
}

export interface RouteOptimizationResult {
  optimizedItems: ScheduleItem[];
  totalDistance: number;
  estimatedDuration: number;
  savings: {
    distanceSaved: number;
    timeSaved: number;
  };
}
