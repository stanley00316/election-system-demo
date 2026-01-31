// 選區相關型別定義

export interface District {
  id: string;
  name: string;
  level: DistrictLevel;
  parentId?: string;
  code?: string;           // 行政區代碼
  registeredVoters?: number;
  boundary?: GeoJsonPolygon;
  center?: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export enum DistrictLevel {
  CITY = 'CITY',           // 縣市
  DISTRICT = 'DISTRICT',   // 區/鄉/鎮/市
  VILLAGE = 'VILLAGE',     // 里
  NEIGHBORHOOD = 'NEIGHBORHOOD', // 鄰
}

export interface GeoJsonPolygon {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export interface DistrictStats {
  districtId: string;
  districtName: string;
  totalVoters: number;
  supportCount: number;
  neutralCount: number;
  opposeCount: number;
  undecidedCount: number;
  contactedCount: number;
  contactRate: number;
  supportRate: number;
}

export interface DistrictHeatmapData {
  districtId: string;
  center: {
    latitude: number;
    longitude: number;
  };
  intensity: number;     // 0-1
  voterCount: number;
  supportRate: number;
}
