// API 相關常數

export const API_ROUTES = {
  // Auth
  AUTH: {
    LINE_LOGIN: '/auth/line',
    LINE_CALLBACK: '/auth/line/callback',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  
  // Users
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    PROFILE: '/users/profile',
  },
  
  // Campaigns
  CAMPAIGNS: {
    BASE: '/campaigns',
    BY_ID: (id: string) => `/campaigns/${id}`,
    TEAM: (id: string) => `/campaigns/${id}/team`,
    INVITE: (id: string) => `/campaigns/${id}/invite`,
    STATS: (id: string) => `/campaigns/${id}/stats`,
  },
  
  // Voters
  VOTERS: {
    BASE: '/voters',
    BY_ID: (id: string) => `/voters/${id}`,
    IMPORT: '/voters/import',
    EXPORT: '/voters/export',
    SEARCH: '/voters/search',
    NEARBY: '/voters/nearby',
    DUPLICATES: '/voters/duplicates',
    MERGE: '/voters/merge',
    RELATIONSHIPS: (id: string) => `/voters/${id}/relationships`,
  },
  
  // Contacts
  CONTACTS: {
    BASE: '/contacts',
    BY_ID: (id: string) => `/contacts/${id}`,
    BY_VOTER: (voterId: string) => `/contacts/voter/${voterId}`,
    SUMMARY: '/contacts/summary',
  },
  
  // Events
  EVENTS: {
    BASE: '/events',
    BY_ID: (id: string) => `/events/${id}`,
    ATTENDEES: (id: string) => `/events/${id}/attendees`,
    CHECK_IN: (id: string) => `/events/${id}/check-in`,
  },
  
  // Schedules
  SCHEDULES: {
    BASE: '/schedules',
    BY_ID: (id: string) => `/schedules/${id}`,
    BY_DATE: (date: string) => `/schedules/date/${date}`,
    ITEMS: (id: string) => `/schedules/${id}/items`,
    OPTIMIZE: (id: string) => `/schedules/${id}/optimize`,
    SUGGESTIONS: '/schedules/suggestions',
  },
  
  // Districts
  DISTRICTS: {
    BASE: '/districts',
    BY_ID: (id: string) => `/districts/${id}`,
    BY_CITY: (city: string) => `/districts/city/${city}`,
    STATS: (id: string) => `/districts/${id}/stats`,
    BOUNDARY: (id: string) => `/districts/${id}/boundary`,
  },
  
  // Analysis
  ANALYSIS: {
    OVERVIEW: '/analysis/overview',
    STANCE: '/analysis/stance',
    DISTRICT: '/analysis/district',
    TREND: '/analysis/trend',
    WIN_PROBABILITY: '/analysis/win-probability',
    INFLUENCE: '/analysis/influence',
    KEY_PERSONS: '/analysis/key-persons',
    HEATMAP: '/analysis/heatmap',
    REPORT: '/analysis/report',
  },
  
  // Maps
  MAPS: {
    GEOCODE: '/maps/geocode',
    REVERSE_GEOCODE: '/maps/reverse-geocode',
    DIRECTIONS: '/maps/directions',
    DISTANCE_MATRIX: '/maps/distance-matrix',
  },
} as const;

// 分頁預設值
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// 錯誤代碼
export const ERROR_CODES = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Business logic errors
  CAMPAIGN_NOT_ACTIVE: 'CAMPAIGN_NOT_ACTIVE',
  IMPORT_FAILED: 'IMPORT_FAILED',
  GEOCODING_FAILED: 'GEOCODING_FAILED',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
