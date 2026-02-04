// 選舉相關常數

import { ElectionType } from '../types/campaign';

// 各類選舉的選區設定
export const ELECTION_CONFIG: Record<ElectionType, ElectionConfig> = {
  [ElectionType.VILLAGE_CHIEF]: {
    name: '里長',
    requireCity: true,
    requireDistrict: true,
    requireVillage: true,
    requireConstituency: false,
    votingSystem: 'plurality', // 相對多數
  },
  [ElectionType.TOWNSHIP_REPRESENTATIVE]: {
    name: '鄉鎮市民代表',
    requireCity: true,
    requireDistrict: true,
    requireVillage: false,
    requireConstituency: false,
    votingSystem: 'plurality',
  },
  [ElectionType.CITY_COUNCILOR]: {
    name: '縣市議員',
    requireCity: true,
    requireDistrict: false,
    requireVillage: false,
    requireConstituency: true,
    votingSystem: 'sntv', // 複數選區單記不可讓渡
  },
  [ElectionType.LEGISLATOR]: {
    name: '立法委員',
    requireCity: true,
    requireDistrict: false,
    requireVillage: false,
    requireConstituency: true,
    votingSystem: 'plurality',
  },
  [ElectionType.MAYOR]: {
    name: '縣市首長',
    requireCity: true,
    requireDistrict: false,
    requireVillage: false,
    requireConstituency: false,
    votingSystem: 'plurality',
  },
  [ElectionType.PRESIDENT]: {
    name: '總統',
    requireCity: false,
    requireDistrict: false,
    requireVillage: false,
    requireConstituency: false,
    votingSystem: 'plurality',
  },
};

export interface ElectionConfig {
  name: string;
  requireCity: boolean;
  requireDistrict: boolean;
  requireVillage: boolean;
  requireConstituency: boolean;
  votingSystem: 'plurality' | 'sntv' | 'proportional';
}

// 政治傾向分數對應（用於分析計算）
export const STANCE_SCORES = {
  STRONG_SUPPORT: 100,
  SUPPORT: 80,
  LEAN_SUPPORT: 60,
  NEUTRAL: 50,
  UNDECIDED: 50,
  LEAN_OPPOSE: 40,
  OPPOSE: 20,
  STRONG_OPPOSE: 0,
} as const;

// 政治傾向中文對照
export const STANCE_LABELS = {
  STRONG_SUPPORT: '強力支持',
  SUPPORT: '支持',
  LEAN_SUPPORT: '傾向支持',
  NEUTRAL: '中立',
  UNDECIDED: '未表態',
  LEAN_OPPOSE: '傾向反對',
  OPPOSE: '反對',
  STRONG_OPPOSE: '強烈反對',
} as const;

// 政黨中文對照
export const PARTY_LABELS = {
  KMT: '國民黨',
  DPP: '民進黨',
  TPP: '民眾黨',
  NPP: '時代力量',
  TSP: '台灣基進',
  OTHER: '其他',
  INDEPENDENT: '無黨籍',
  UNKNOWN: '不明',
} as const;

// 接觸類型中文對照
export const CONTACT_TYPE_LABELS = {
  HOME_VISIT: '家訪',
  STREET_VISIT: '掃街',
  PHONE_CALL: '電話',
  LINE_CALL: 'LINE 通話',
  LIVING_ROOM: '客廳會',
  FUNERAL: '公祭',
  WEDDING: '喜事',
  EVENT: '活動',
  MARKETPLACE: '市場',
  TEMPLE: '廟宇',
  OTHER: '其他',
} as const;

// 接觸結果中文對照
export const CONTACT_OUTCOME_LABELS = {
  POSITIVE: '正面',
  NEUTRAL: '中立',
  NEGATIVE: '負面',
  NO_RESPONSE: '無回應',
  NOT_HOME: '不在家',
} as const;

// 關係類型中文對照
export const RELATION_TYPE_LABELS = {
  FAMILY: '家人',
  SPOUSE: '配偶',
  PARENT: '父母',
  CHILD: '子女',
  SIBLING: '兄弟姊妹',
  NEIGHBOR: '鄰居',
  FRIEND: '朋友',
  COLLEAGUE: '同事',
  COMMUNITY: '社區關係',
  OTHER: '其他',
} as const;

// 活動類型中文對照
export const EVENT_TYPE_LABELS = {
  LIVING_ROOM: '客廳會',
  FUNERAL: '公祭',
  WEDDING: '喜事',
  COMMUNITY: '社區活動',
  TEMPLE: '廟會',
  CAMPAIGN: '競選活動',
  MEETING: '座談會',
  OTHER: '其他',
} as const;

// 影響力等級
export const INFLUENCE_LEVELS = [
  { min: 80, max: 100, label: '極高', color: '#dc2626' },
  { min: 60, max: 79, label: '高', color: '#ea580c' },
  { min: 40, max: 59, label: '中', color: '#ca8a04' },
  { min: 20, max: 39, label: '低', color: '#16a34a' },
  { min: 0, max: 19, label: '極低', color: '#64748b' },
] as const;
