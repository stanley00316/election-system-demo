// 選舉活動相關型別定義

export enum ElectionType {
  VILLAGE_CHIEF = 'VILLAGE_CHIEF',           // 里長
  TOWNSHIP_REPRESENTATIVE = 'TOWNSHIP_REP',  // 鄉鎮市民代表
  CITY_COUNCILOR = 'CITY_COUNCILOR',         // 縣市議員
  LEGISLATOR = 'LEGISLATOR',                 // 立法委員
  MAYOR = 'MAYOR',                           // 縣市首長
  PRESIDENT = 'PRESIDENT',                   // 總統／副總統
}

export interface Campaign {
  id: string;
  ownerId: string;
  name: string;
  electionType: ElectionType;
  electionDate?: Date;
  city: string;           // 縣市
  district?: string;      // 區
  village?: string;       // 里
  constituency?: number;  // 選區編號（立委用）
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCampaignDto {
  name: string;
  electionType: ElectionType;
  electionDate?: Date;
  city: string;
  district?: string;
  village?: string;
  constituency?: number;
  description?: string;
}

export interface UpdateCampaignDto {
  name?: string;
  electionDate?: Date;
  description?: string;
  isActive?: boolean;
}

// 台灣縣市列表
export const TAIWAN_CITIES = [
  '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
  '基隆市', '新竹市', '嘉義市',
  '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣', '嘉義縣',
  '屏東縣', '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣',
] as const;

export type TaiwanCity = (typeof TAIWAN_CITIES)[number];
