// 選情分析相關型別定義

export interface CampaignAnalytics {
  campaignId: string;
  timestamp: Date;
  voterStats: VoterStats;
  contactStats: ContactStats;
  stanceDistribution: StanceDistribution;
  districtBreakdown: DistrictBreakdown[];
  trendData: TrendDataPoint[];
  winProbability: WinProbability;
}

export interface VoterStats {
  totalVoters: number;
  totalRegistered?: number;  // 選區總選民數
  coverageRate: number;      // 涵蓋率
  avgInfluenceScore: number;
  highInfluenceCount: number; // 高影響力選民數
}

export interface ContactStats {
  totalContacts: number;
  uniqueVotersContacted: number;
  contactRate: number;        // 接觸率
  avgContactsPerVoter: number;
  contactsByType: Record<string, number>;
  contactsByOutcome: Record<string, number>;
  recentContactTrend: number; // 近期趨勢 (+/-)
}

export interface StanceDistribution {
  strongSupport: number;
  support: number;
  leanSupport: number;
  neutral: number;
  undecided: number;
  leanOppose: number;
  oppose: number;
  strongOppose: number;
}

export interface DistrictBreakdown {
  districtId: string;
  districtName: string;
  level: string;
  totalVoters: number;
  supportRate: number;
  neutralRate: number;
  opposeRate: number;
  contactRate: number;
  estimatedVotes: number;
  confidence: number;        // 信心度 0-1
}

export interface TrendDataPoint {
  date: Date;
  supportRate: number;
  neutralRate: number;
  opposeRate: number;
  contactCount: number;
  newVoters: number;
}

export interface WinProbability {
  probability: number;       // 0-1
  confidence: number;        // 0-1
  estimatedVotes: number;
  votesNeeded: number;
  margin: number;            // 差距
  scenario: WinScenario;
  factors: ProbabilityFactor[];
}

export enum WinScenario {
  STRONG_WIN = 'STRONG_WIN',     // 穩贏
  LIKELY_WIN = 'LIKELY_WIN',     // 可能贏
  TOSS_UP = 'TOSS_UP',           // 五五波
  LIKELY_LOSE = 'LIKELY_LOSE',   // 可能輸
  STRONG_LOSE = 'STRONG_LOSE',   // 穩輸
}

export interface ProbabilityFactor {
  name: string;
  impact: number;            // -100 to +100
  description: string;
}

// 影響力分析
export interface InfluenceAnalysis {
  voterId: string;
  voterName: string;
  directInfluence: number;   // 直接影響力
  networkInfluence: number;  // 網路影響力
  totalInfluence: number;    // 總影響力
  reachableVoters: number;   // 可觸及選民數
  connections: InfluenceConnection[];
}

export interface InfluenceConnection {
  targetVoterId: string;
  targetName: string;
  relationType: string;
  influenceWeight: number;
  targetStance: string;
}

export interface KeyPersonReport {
  topInfluencers: InfluenceAnalysis[];
  uncommittedInfluencers: InfluenceAnalysis[];
  potentialConverts: InfluenceAnalysis[];
  priorityVisits: InfluenceAnalysis[];
}

// 區域熱度分析
export interface HeatmapData {
  points: HeatmapPoint[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;            // 權重（依支持度、影響力等）
  voterCount: number;
}

// 報表
export interface AnalyticsReport {
  id: string;
  campaignId: string;
  type: ReportType;
  title: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  data: CampaignAnalytics;
  insights: ReportInsight[];
}

export enum ReportType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

export interface ReportInsight {
  type: 'positive' | 'warning' | 'action';
  title: string;
  description: string;
  metric?: string;
  change?: number;
}
