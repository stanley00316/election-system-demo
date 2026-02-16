import * as demoApi from './demo-api';

// 瀏覽器端走 Next.js rewrite proxy 避免 CORS；伺服器端直接連後端
const _configuredUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const API_URL = typeof window !== 'undefined' && _configuredUrl.startsWith('http') ? '/api' : _configuredUrl;

// 檢查是否為示範模式
// 主要：build-time 環境變數
// 備援：client-side hostname 包含 "demo"（解決 Vercel 未設定環境變數的情況）
export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  (typeof window !== 'undefined' && /[-.]demo[-.]/.test(window.location.hostname));

// 正式版 URL（供範例版引導使用者跳轉）
export const PRODUCTION_URL =
  process.env.NEXT_PUBLIC_PRODUCTION_URL || 'https://web-delta-hazel-33.vercel.app';

/**
 * 產生正式版跳轉 URL，自動帶入 ?ref= 推廣碼（若有）
 * 推廣碼來源：cookie ref_code > URL ?ref= 參數
 */
export function getProductionUrl(path: string = ''): string {
  const base = PRODUCTION_URL + path;
  if (typeof window === 'undefined') return base;
  // 從 cookie 讀取推廣碼
  const cookieMatch = document.cookie.match(/(?:^|;\s*)ref_code=([^;]*)/);
  const refCode = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
  if (refCode) {
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}ref=${encodeURIComponent(refCode)}`;
  }
  return base;
}


interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      // OWASP A07: 優先使用 sessionStorage（關閉分頁即清除），向後相容 localStorage
      this.token = sessionStorage.getItem('token') || localStorage.getItem('token');
      // 遷移：若 localStorage 中有 token，移至 sessionStorage
      if (!sessionStorage.getItem('token') && localStorage.getItem('token')) {
        sessionStorage.setItem('token', localStorage.getItem('token')!);
        localStorage.removeItem('token');
      }
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        // OWASP A07: 僅存入 sessionStorage，關閉分頁即失效
        sessionStorage.setItem('token', token);
        localStorage.removeItem('token'); // 清除舊的 localStorage token
      } else {
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
      }
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, ...fetchOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      // 保留完整錯誤資訊供前端處理（包含訂閱驗證的額外欄位）
      const err = new Error(error.message || `HTTP ${response.status}`) as any;
      err.code = error.code;
      err.statusCode = error.statusCode || response.status;
      err.currentPlan = error.currentPlan;
      err.requiredPlan = error.requiredPlan;
      err.upgradeUrl = error.upgradeUrl;
      throw err;
    }

    return response.json();
  }

  get<T>(endpoint: string, params?: Record<string, any>) {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  post<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /** POST with a custom Bearer token (used for 2FA temp token) */
  postWithToken<T>(endpoint: string, token: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async downloadFile(endpoint: string, params?: Record<string, any>, filename?: string) {
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename || 'download.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  }

  async uploadFile<T>(endpoint: string, file: File, data?: Record<string, string>) {
    const formData = new FormData();
    formData.append('file', file);
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json() as T;
  }
}

export const api = new ApiClient(API_URL);

// Auth API
const realAuthApi = {
  lineCallback: (code: string, redirectUri: string, promoterCode?: string, state?: string) =>
    api.post<{
      accessToken?: string;
      user: any;
      requiresTwoFactor?: boolean;
      setupRequired?: boolean;
      tempToken?: string;
    }>('/auth/line/callback', {
      code,
      redirectUri,
      ...(promoterCode && { promoterCode }),
      ...(state && { state }),
    }),
  generateOAuthState: () => api.get<{ state: string }>('/auth/oauth-state'),
  getMe: () => api.get<any>('/auth/me'),
  acceptConsent: (consentVersion: string, portraitConsent: boolean) =>
    api.post<any>('/auth/consent', { consentVersion, portraitConsent }),
  revokeConsent: () => api.post<any>('/auth/revoke-consent'),
  logout: () => api.post('/auth/logout'),
  // 2FA
  setup2fa: (tempToken: string) =>
    api.postWithToken<{ qrCodeDataUrl: string; otpauthUrl: string; secret: string }>(
      '/auth/2fa/setup', tempToken,
    ),
  verifySetup2fa: (tempToken: string, code: string) =>
    api.postWithToken<{ accessToken: string; user: any }>(
      '/auth/2fa/verify-setup', tempToken, { code },
    ),
  verify2fa: (tempToken: string, code: string) =>
    api.postWithToken<{ accessToken: string; user: any }>(
      '/auth/2fa/verify', tempToken, { code },
    ),
};
export const authApi = isDemoMode ? demoApi.demoAuthApi : realAuthApi;

// Campaigns API
const realCampaignsApi = {
  create: (data: any) => api.post<any>('/campaigns', data),
  getById: (id: string) => api.get<any>(`/campaigns/${id}`),
  update: (id: string, data: any) => api.put<any>(`/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/campaigns/${id}`),
  getStats: (id: string) => api.get<any>(`/campaigns/${id}/stats`),
  // 團隊管理
  getTeam: (id: string) => api.get<any[]>(`/campaigns/${id}/team`),
  invite: (id: string, data: any) => api.post(`/campaigns/${id}/invite`, data),
  updateMemberRole: (id: string, memberId: string, role: string) =>
    api.put(`/campaigns/${id}/team/${memberId}/role`, { role }),
  removeMember: (id: string, memberId: string) =>
    api.delete(`/campaigns/${id}/team/${memberId}`),
  // 邀請連結
  createInviteLink: (id: string, data: any) =>
    api.post<any>(`/campaigns/${id}/invite-link`, data),
  getInviteLinks: (id: string) =>
    api.get<any[]>(`/campaigns/${id}/invite-links`),
  deactivateInviteLink: (id: string, inviteId: string) =>
    api.delete(`/campaigns/${id}/invite-link/${inviteId}`),
  getInviteInfo: (code: string) =>
    api.get<any>(`/campaigns/join/${code}`),
  joinByInviteCode: (code: string) =>
    api.post<any>(`/campaigns/join/${code}`),
};
export const campaignsApi = isDemoMode ? demoApi.demoCampaignsApi : realCampaignsApi;

// Voters API
const realVotersApi = {
  getAll: (params: any) => api.get<{ data: any[]; pagination: any }>('/voters', params),
  getById: (id: string) => api.get<any>(`/voters/${id}`),
  create: (data: any) => api.post<any>('/voters', data),
  update: (id: string, data: any) => api.put<any>(`/voters/${id}`, data),
  delete: (id: string) => api.delete(`/voters/${id}`),
  getNearby: (params: any) => api.get<any[]>('/voters/nearby', params),
  searchByLine: (params: { campaignId: string; lineId?: string; lineUrl?: string }) =>
    api.get<{ found: boolean; voters: any[] }>('/voters/search-by-line', params),
  getDuplicates: (campaignId: string) =>
    api.get<any[]>('/voters/duplicates', { campaignId }),
  validateImport: (file: File, campaignId: string) =>
    api.uploadFile<any>('/voters/import/validate', file, { campaignId }),
  importExcel: (file: File, campaignId: string) =>
    api.uploadFile<any>('/voters/import', file, { campaignId }),
  exportExcel: (campaignId: string) =>
    api.downloadFile('/voters/export', { campaignId }, `選民資料_${new Date().toISOString().split('T')[0]}.xlsx`),
  exportCsv: (campaignId: string) =>
    api.downloadFile('/voters/export', { campaignId, format: 'csv' }, `選民資料_${new Date().toISOString().split('T')[0]}.csv`),
  getRelationships: (id: string) => api.get<any[]>(`/voters/${id}/relationships`),
  createRelationship: (data: any) => api.post('/voters/relationships', data),
  // 見面紀錄相關 API
  recordMeeting: (data: any) => api.post('/voters/relationships/meeting', data),
  batchCreateRelationships: (data: any) => api.post('/voters/relationships/batch', data),
  getRelationshipsByEvent: (eventId: string) => api.get<any>(`/voters/relationships/by-event/${eventId}`),
  getRelationshipMeetings: (relationshipId: string) => api.get<any[]>(`/voters/relationships/${relationshipId}/meetings`),
  // 附件相關 API
  getAttachments: (voterId: string) => api.get<any[]>(`/voters/${voterId}/attachments`),
  addAttachment: (voterId: string, data: any) => api.post<any>(`/voters/${voterId}/attachments`, data),
  deleteAttachment: (voterId: string, attachmentId: string) => api.delete(`/voters/${voterId}/attachments/${attachmentId}`),
};
export const votersApi = isDemoMode ? demoApi.demoVotersApi : realVotersApi;

// Contacts API
const realContactsApi = {
  getAll: (params: any) => api.get<{ data: any[]; pagination: any }>('/contacts', params),
  getById: (id: string) => api.get<any>(`/contacts/${id}`),
  create: (data: any) => api.post<any>('/contacts', data),
  update: (id: string, data: any) => api.put<any>(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
  getSummary: (campaignId: string) => api.get<any>('/contacts/summary', { campaignId }),
  getFollowUps: (campaignId: string) =>
    api.get<any[]>('/contacts/follow-ups', { campaignId }),
};
export const contactsApi = isDemoMode ? demoApi.demoContactsApi : realContactsApi;

// Events API
const realEventsApi = {
  getAll: (campaignId: string, params?: any) =>
    api.get<any[]>('/events', { campaignId, ...params }),
  getById: (id: string) => api.get<any>(`/events/${id}`),
  create: (data: any) => api.post<any>('/events', data),
  update: (id: string, data: any) => api.put<any>(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
  getAttendees: (id: string) => api.get<any[]>(`/events/${id}/attendees`),
  addAttendee: (id: string, voterId: string) =>
    api.post(`/events/${id}/attendees`, { voterId }),
  updateAttendeeStatus: (eventId: string, voterId: string, status: string) =>
    api.put(`/events/${eventId}/attendees/${voterId}/status`, { status }),
  removeAttendee: (eventId: string, voterId: string) =>
    api.delete(`/events/${eventId}/attendees/${voterId}`),
  checkIn: (id: string, voterId: string) =>
    api.post(`/events/${id}/check-in`, { voterId }),
};
export const eventsApi = isDemoMode ? demoApi.demoEventsApi : realEventsApi;

// Schedules API
const realSchedulesApi = {
  getAll: (campaignId: string, page = 1, limit = 20) =>
    api.get<any>('/schedules', { campaignId, page, limit }),
  getByDate: (campaignId: string, date: string) =>
    api.get<any[]>(`/schedules/date/${date}`, { campaignId }),
  getById: (id: string) => api.get<any>(`/schedules/${id}`),
  create: (data: any) => api.post<any>('/schedules', data),
  update: (id: string, data: any) => api.put<any>(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
  addItem: (id: string, data: any) => api.post(`/schedules/${id}/items`, data),
  removeItem: (scheduleId: string, itemId: string) =>
    api.delete(`/schedules/${scheduleId}/items/${itemId}`),
  updateItemStatus: (scheduleId: string, itemId: string, status: string) =>
    api.put(`/schedules/${scheduleId}/items/${itemId}/status`, { status }),
  reorderItems: (scheduleId: string, itemIds: string[]) =>
    api.put(`/schedules/${scheduleId}/items/reorder`, { itemIds }),
  optimize: (id: string, startLocation: any) =>
    api.post(`/schedules/${id}/optimize`, { startLocation }),
  getSuggestions: (campaignId: string, lat: number, lng: number) =>
    api.get<any[]>('/schedules/suggestions', { campaignId, lat, lng }),
  // Google Calendar 同步
  syncToGoogle: (id: string) => api.post(`/schedules/${id}/sync`),
  unsyncFromGoogle: (id: string) => api.delete(`/schedules/${id}/sync`),
  toggleSyncEnabled: (id: string, enabled: boolean) =>
    api.put(`/schedules/${id}/sync-enabled`, { enabled }),
  // 匯出行程資料（整月）
  exportByDateRange: (campaignId: string, startDate: string, endDate: string) =>
    api.get<any[]>('/schedules/export', { campaignId, startDate, endDate }),
};
export const schedulesApi = isDemoMode ? demoApi.demoSchedulesApi : realSchedulesApi;

// Google Calendar API
const realGoogleApi = {
  getAuthUrl: () => api.get<{ authUrl: string }>('/google/auth-url'),
  getStatus: () => api.get<{ connected: boolean; calendarId?: string }>('/google/status'),
  disconnect: () => api.delete('/google/disconnect'),
  syncAll: () => api.post<{ success: boolean; synced: number; failed: number }>('/google/sync-all'),
};
export const googleApi = isDemoMode ? demoApi.demoGoogleApi : realGoogleApi;

// Analysis API
const realAnalysisApi = {
  getOverview: (campaignId: string) =>
    api.get<any>('/analysis/overview', { campaignId }),
  getStance: (campaignId: string) =>
    api.get<any>('/analysis/stance', { campaignId }),
  getDistrict: (campaignId: string) =>
    api.get<any>('/analysis/district', { campaignId }),
  getTrend: (campaignId: string, days?: number) =>
    api.get<any>('/analysis/trend', { campaignId, days }),
  getWinProbability: (campaignId: string) =>
    api.get<any>('/analysis/win-probability', { campaignId }),
  getInfluence: (campaignId: string) =>
    api.get<any>('/analysis/influence', { campaignId }),
  getHeatmap: (campaignId: string) =>
    api.get<any>('/analysis/heatmap', { campaignId }),
  getVisitStats: (campaignId: string) =>
    api.get<{
      todayCompleted: number;
      todayPlanned: number;
      todayCompletionRate: number;
      weekCompleted: number;
      weekPlanned: number;
      weekCompletionRate: number;
      uniqueContacted: number;
      totalVoters: number;
      contactedRate: number;
    }>('/analysis/visit-stats', { campaignId }),
};
export const analysisApi = isDemoMode ? demoApi.demoAnalysisApi : realAnalysisApi;

// Maps API
const realMapsApi = {
  geocode: (address: string) => api.get<any>('/maps/geocode', { address }),
  reverseGeocode: (lat: number, lng: number) =>
    api.get<any>('/maps/reverse-geocode', { lat, lng }),
  getDirections: (origin: any, destination: any, waypoints?: any[]) =>
    api.post<any>('/maps/directions', { origin, destination, waypoints }),
};
export const mapsApi = isDemoMode ? demoApi.demoMapsApi : realMapsApi;

// Districts API
const realDistrictsApi = {
  getAll: (level?: string) => api.get<any[]>('/districts', level ? { level } : {}),
  getByCity: (city: string) => api.get<any[]>(`/districts/city/${encodeURIComponent(city)}`),
  getById: (id: string) => api.get<any>(`/districts/${id}`),
  getChildren: (id: string) => api.get<any[]>(`/districts/${id}/children`),
};
export const districtsApi = isDemoMode ? demoApi.demoDistrictsApi : realDistrictsApi;

// Subscriptions API
const realSubscriptionsApi = {
  getPlans: () => api.get<any[]>('/subscriptions/plans'),
  getCurrentSubscription: () => api.get<{ hasSubscription: boolean; subscription: any }>('/subscriptions/current'),
  checkSubscription: () => api.get<{
    hasSubscription: boolean;
    status: string | null;
    plan: any | null;
    expiresAt: string | null;
    isTrialing: boolean;
    trialEndsAt: string | null;
  }>('/subscriptions/check'),
  startTrial: () => api.post<any>('/subscriptions/trial'),
  cancelSubscription: (reason?: string) => api.post<any>('/subscriptions/cancel', { reason }),
  getHistory: () => api.get<any[]>('/subscriptions/history'),
  // 分級定價 API
  getAvailableCities: () => api.get<{
    regionLevel: number;
    label: string;
    cities: string[];
  }[]>('/subscriptions/pricing/cities'),
  getElectionTypes: () => api.get<{
    code: string;
    label: string;
    category: string;
  }[]>('/subscriptions/pricing/election-types'),
  getPlansByCity: (city: string) => api.get<{
    city: string;
    trialPlan: any;
    plans: any[];
  }>('/subscriptions/pricing/by-city', { city }),
  getPlanByLocation: (city: string, electionType: string) => api.get<{
    city: string;
    electionType: string;
    plan: any;
    trialPlan: any;
  }>('/subscriptions/pricing/plan', { city, electionType }),
  // P0-3: 方案升降級
  previewUpgrade: (planId: string) => api.get<any>(`/subscriptions/upgrade/preview/${planId}`),
  upgradeSubscription: (planId: string) => api.post<any>(`/subscriptions/upgrade/${planId}`),
  previewDowngrade: (planId: string) => api.get<any>(`/subscriptions/downgrade/preview/${planId}`),
  downgradeSubscription: (planId: string) => api.post<any>(`/subscriptions/downgrade/${planId}`),
  cancelDowngrade: () => api.post<any>('/subscriptions/downgrade/cancel'),
  // P2-11: 自動續約
  toggleAutoRenew: (autoRenew: boolean) => api.put<any>('/subscriptions/auto-renew', { autoRenew }),
};
export const subscriptionsApi = isDemoMode ? demoApi.demoSubscriptionsApi : realSubscriptionsApi;

// Payments API
const realPaymentsApi = {
  createPayment: (data: {
    subscriptionId: string;
    provider: 'ECPAY' | 'NEWEBPAY' | 'STRIPE';
    returnUrl?: string;
    clientBackUrl?: string;
  }) => api.post<{
    paymentId: string;
    paymentUrl?: string;
    formData?: Record<string, string>;
    apiUrl?: string;
  }>('/payments/create', data),
  // P1-5: 銀行轉帳
  createBankTransfer: (data: { subscriptionId: string }) =>
    api.post<{ paymentId: string; amount: number; bankInfo: any; message: string }>('/payments/bank-transfer', data),
  getHistory: () => api.get<any[]>('/payments/history'),
  getPayment: (id: string) => api.get<any>(`/payments/${id}`),
  verifyStripe: (sessionId: string, paymentId: string) =>
    api.get<{ success: boolean }>('/payments/verify/stripe', { session_id: sessionId, payment_id: paymentId }),
  refund: (id: string, reason?: string) => api.post<{ success: boolean }>(`/payments/${id}/refund`, { reason }),
};
export const paymentsApi = isDemoMode ? demoApi.demoPaymentsApi : realPaymentsApi;

// Invoices API
export const invoicesApi = {
  issueInvoice: (data: {
    paymentId: string;
    invoiceType: 'PERSONAL' | 'COMPANY';
    carrierType?: string;
    carrierNumber?: string;
    companyTaxId?: string;
    companyName?: string;
  }) => api.post<any>('/invoices/issue', data),
  getInvoice: (paymentId: string) => api.get<any>(`/invoices/${paymentId}`),
};

// Referrals API
const realReferralsApi = {
  getMyCode: () => api.get<{ code: string; shareUrl: string }>('/referrals/my-code'),
  applyCode: (code: string) => api.post<{ success: boolean; message: string; referral?: any }>('/referrals/apply', { referralCode: code }),
  getMyReferrals: () => api.get<any[]>('/referrals/my-referrals'),
  getStats: () => api.get<{
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    totalRewardMonths: number;
  }>('/referrals/stats'),
  getPending: () => api.get<{
    hasPendingReferral: boolean;
    referral?: {
      id: string;
      referrerName: string;
      status: string;
      createdAt: string;
    };
  }>('/referrals/pending'),
};
export const referralsApi = isDemoMode ? demoApi.demoReferralsApi : realReferralsApi;

// ==================== Admin APIs ====================
// 管理員 API 使用一般用戶的 Token（isAdmin 的用戶）

const realAdminAuthApi = {
  // 取得管理員資訊（驗證是否為管理員）
  getMe: () => api.get<any>('/admin/auth/me'),
  // 取得所有管理員列表
  getAdmins: () => api.get<any[]>('/admin/auth/admins'),
  // 指派管理員權限
  assignAdmin: (userId: string) => api.post<any>(`/admin/auth/admins/${userId}`),
  // 移除管理員權限
  removeAdmin: (userId: string) => api.delete<any>(`/admin/auth/admins/${userId}`),
};
export const adminAuthApi = isDemoMode ? demoApi.demoAdminAuthApi : realAdminAuthApi;

const realAdminUsersApi = {
  getUsers: (params?: any) => api.get<{ data: any[]; pagination: any }>('/admin/users', params),
  getStats: () => api.get<any>('/admin/users/stats'),
  getUser: (id: string) => api.get<any>(`/admin/users/${id}`),
  getUserActivity: (id: string, params?: any) => api.get<any>(`/admin/users/${id}/activity`, params),
  getUserPayments: (id: string, params?: any) => api.get<any>(`/admin/users/${id}/payments`, params),
  getUserReferrals: (id: string) => api.get<any>(`/admin/users/${id}/referrals`),
  getUserVoters: (id: string, params?: any) => api.get<any>(`/admin/users/${id}/voters`, params),
  getUserContacts: (id: string, params?: any) => api.get<any>(`/admin/users/${id}/contacts`, params),
  getUserCampaignStats: (id: string) => api.get<any>(`/admin/users/${id}/campaign-stats`),
  updateUser: (id: string, data: { name?: string; email?: string; phone?: string }) =>
    api.put<any>(`/admin/users/${id}`, data),
  suspendUser: (id: string, reason: string) => api.put<any>(`/admin/users/${id}/suspend`, { reason }),
  activateUser: (id: string) => api.put<any>(`/admin/users/${id}/activate`),
};
export const adminUsersApi = isDemoMode ? demoApi.demoAdminUsersApi : realAdminUsersApi;

const realAdminSubscriptionsApi = {
  getSubscriptions: (params?: any) => api.get<{ data: any[]; pagination: any }>('/admin/subscriptions', params),
  getStats: () => api.get<any>('/admin/subscriptions/stats'),
  getPlans: () => api.get<any[]>('/admin/subscriptions/plans'),
  getSubscription: (id: string) => api.get<any>(`/admin/subscriptions/${id}`),
  updatePlan: (id: string, planId: string) => api.put<any>(`/admin/subscriptions/${id}/plan`, { planId }),
  extendTrial: (id: string, days: number) => api.put<any>(`/admin/subscriptions/${id}/extend-trial`, { days }),
  cancelSubscription: (id: string, reason?: string) => api.put<any>(`/admin/subscriptions/${id}/cancel`, { reason }),
};
export const adminSubscriptionsApi = isDemoMode ? demoApi.demoAdminSubscriptionsApi : realAdminSubscriptionsApi;

const realAdminPaymentsApi = {
  getPayments: (params?: any) => api.get<{ data: any[]; pagination: any }>('/admin/payments', params),
  getStats: (startDate?: string, endDate?: string) => api.get<any>('/admin/payments/stats', { startDate, endDate }),
  getPayment: (id: string) => api.get<any>(`/admin/payments/${id}`),
  refundPayment: (id: string, reason?: string, amount?: number) =>
    api.post<any>(`/admin/payments/${id}/refund`, { reason, amount }),
  // P2-12: 營收報表
  getRevenueChart: (months?: number) => api.get<any[]>('/admin/payments/revenue-chart', months ? { months: String(months) } : {}),
  getConversionFunnel: () => api.get<any>('/admin/payments/conversion-funnel'),
  getMRR: () => api.get<any>('/admin/payments/mrr'),
  // P1-5: 手動確認
  getPendingManual: () => api.get<any[]>('/admin/payments/pending-manual'),
  confirmPayment: (id: string, notes?: string) => api.post<any>(`/admin/payments/${id}/confirm`, { notes }),
};
export const adminPaymentsApi = isDemoMode ? demoApi.demoAdminPaymentsApi : realAdminPaymentsApi;

const realAdminAnalyticsApi = {
  getOverview: () => api.get<any>('/admin/analytics/overview'),
  getUserGrowth: (days?: number) => api.get<any[]>('/admin/analytics/users', { days }),
  getRevenueReport: (months?: number) => api.get<any[]>('/admin/analytics/revenue', { months }),
  getSubscriptionDistribution: () => api.get<any>('/admin/analytics/subscriptions'),
  getRecentActivity: (limit?: number) => api.get<any>('/admin/analytics/recent', { limit }),
  // 用戶深度分析
  getRetentionAnalysis: (months?: number) => api.get<any[]>('/admin/analytics/retention', { months }),
  getActiveUserStats: (days?: number) => api.get<any>('/admin/analytics/active-users', { days }),
  getSubscriptionLifecycle: () => api.get<any>('/admin/analytics/subscription-lifecycle'),
  getGeographicDistribution: () => api.get<any[]>('/admin/analytics/geographic'),
  getUserBehaviorAnalysis: () => api.get<any>('/admin/analytics/behavior'),
  getUserValueAnalysis: () => api.get<any>('/admin/analytics/user-value'),
  // 地區總覽
  getRegionalOverview: (city?: string, electionType?: string) =>
    api.get<any>('/admin/analytics/regional-overview', { city, electionType }),
};
export const adminAnalyticsApi = isDemoMode ? demoApi.demoAdminAnalyticsApi : realAdminAnalyticsApi;

// Admin Plans API
const realAdminPlansApi = {
  getPlans: () => api.get<any[]>('/admin/plans'),
  createPlan: (data: any) => api.post<any>('/admin/plans', data),
  updatePlan: (id: string, data: any) => api.put<any>(`/admin/plans/${id}`, data),
  deactivatePlan: (id: string) => api.put<any>(`/admin/plans/${id}/deactivate`),
};
export const adminPlansApi = isDemoMode ? demoApi.demoAdminPlansApi : realAdminPlansApi;

// Admin Referrals API
const realAdminReferralsApi = {
  getReferrals: (params?: any) => api.get<{ data: any[]; pagination: any }>('/admin/referrals', params),
  getStats: () => api.get<any>('/admin/referrals/stats'),
  getLeaderboard: (limit?: number) => api.get<any[]>('/admin/referrals/leaderboard', { limit }),
  expireOld: () => api.post<any>('/admin/referrals/expire-old'),
};
export const adminReferralsApi = isDemoMode ? demoApi.demoAdminReferralsApi : realAdminReferralsApi;

// Admin Data Retention API
const realAdminDataRetentionApi = {
  getStats: () => api.get<any>('/admin/data-retention/stats'),
  getPendingCampaigns: () => api.get<any[]>('/admin/data-retention/pending'),
  getDeletedCampaigns: () => api.get<any[]>('/admin/data-retention/deleted'),
  restoreCampaign: (id: string) => api.post<any>(`/admin/data-retention/${id}/restore`),
  deleteCampaign: (id: string) => api.delete<any>(`/admin/data-retention/${id}`),
  hardDelete: (id: string) => api.delete<any>(`/admin/data-retention/${id}/hard`),
  batchDelete: (ids: string[]) => api.post<any>('/admin/data-retention/batch-delete', { ids }),
};
export const adminDataRetentionApi = isDemoMode ? demoApi.demoAdminDataRetentionApi : realAdminDataRetentionApi;

// Admin Promoters API（超級管理者專用）
const realAdminPromotersApi = {
  // 推廣者 CRUD
  getPromoters: (params?: any) => api.get<{ data: any[]; pagination: any }>('/admin/promoters', params),
  getPromoter: (id: string) => api.get<any>(`/admin/promoters/${id}`),
  createPromoter: (data: any) => api.post<any>('/admin/promoters', data),
  updatePromoter: (id: string, data: any) => api.put<any>(`/admin/promoters/${id}`, data),
  approvePromoter: (id: string, data?: any) => api.post<any>(`/admin/promoters/${id}/approve`, data || {}),
  rejectPromoter: (id: string) => api.post<any>(`/admin/promoters/${id}/reject`),
  suspendPromoter: (id: string) => api.post<any>(`/admin/promoters/${id}/suspend`),
  activatePromoter: (id: string) => api.post<any>(`/admin/promoters/${id}/activate`),

  // 獎勵與試用設定
  updateRewardConfig: (id: string, data: any) => api.put<any>(`/admin/promoters/${id}/reward-config`, data),
  updateTrialConfig: (id: string, data: any) => api.put<any>(`/admin/promoters/${id}/trial-config`, data),

  // 推廣者子資源
  getPromoterReferrals: (id: string, params?: any) => api.get<{ data: any[]; pagination: any }>(`/admin/promoters/${id}/referrals`, params),
  getPromoterTrialInvites: (id: string, params?: any) => api.get<{ data: any[]; pagination: any }>(`/admin/promoters/${id}/trial-invites`, params),
  getPromoterShareLinks: (id: string) => api.get<any[]>(`/admin/promoters/${id}/share-links`),

  // 統計
  getOverviewStats: () => api.get<any>('/admin/promoters/stats/overview'),
  getFunnelStats: () => api.get<any>('/admin/promoters/stats/funnel'),
  getChannelStats: () => api.get<any[]>('/admin/promoters/stats/channels'),
  getLeaderboard: (limit?: number) => api.get<any[]>('/admin/promoters/stats/leaderboard', { limit }),
  getPendingPromoters: () => api.get<any[]>('/admin/promoters/pending'),

  // 試用管理
  getAllTrialInvites: (params?: any) => api.get<{ data: any[]; pagination: any }>('/admin/promoters/trial-invites', params),
  getTrialStats: () => api.get<any>('/admin/promoters/trial-invites/stats'),
  cancelTrialInvite: (trialId: string) => api.post<any>(`/admin/promoters/trial-invites/${trialId}/cancel`),
  extendTrialInvite: (trialId: string, extraDays: number) => api.post<any>(`/admin/promoters/trial-invites/${trialId}/extend`, { extraDays }),
};
export const adminPromotersApi = isDemoMode ? demoApi.demoAdminPromotersApi : realAdminPromotersApi;

// 推廣者公開 API（不需認證 / 部分需認證）
export const promotersPublicApi = {
  // 公開端點
  register: (data: { name: string; phone?: string; email?: string; lineId?: string; notes?: string }) =>
    api.post<{ success: boolean; message: string; promoter: any }>('/promoters/register', data),
  validateCode: (code: string) =>
    api.get<{ valid: boolean; promoter?: { name: string; referralCode: string }; message?: string }>(`/promoters/validate/${code}`),
  getShareLink: (code: string) =>
    api.get<{ promoter: { name: string; referralCode: string }; channel: string; targetUrl?: string }>(`/promoters/share/${code}`),
  getTrialInfo: (code: string) =>
    api.get<{ code: string; trialDays: number; promoterName: string; plan: any; status: string; isAvailable: boolean; message: string }>(`/promoters/trial/${code}`),
  // 需認證端點
  claimTrial: (code: string) =>
    api.post<{ success: boolean; message: string; subscription: any }>('/promoters/trial/claim', { code }),
  applyReferral: (code: string) =>
    api.post<{ success: boolean; message: string; referral: any }>('/promoters/referral/apply', { code }),
};

// 推廣者自助 API（需認證 + 推廣者身份）
const realPromoterSelfApi = {
  getProfile: () => api.get<any>('/promoter/me'),
  updateProfile: (data: Record<string, any>) => api.put<any>('/promoter/me', data),
  getStats: () => api.get<any>('/promoter/me/stats'),
  getReferrals: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ data: any[]; pagination: any }>('/promoter/me/referrals', params),
  getShareLinks: () => api.get<any[]>('/promoter/me/share-links'),
  createShareLink: (data: { channel: string; targetUrl?: string }) =>
    api.post<any>('/promoter/me/share-links', data),
  getTrialInvites: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ data: any[]; pagination: any }>('/promoter/me/trial-invites', params),
  createTrialInvite: (data: {
    trialDays: number;
    inviteMethod: string;
    inviteeName?: string;
    inviteePhone?: string;
    inviteeEmail?: string;
    channel?: string;
  }) => api.post<any>('/promoter/me/trial-invites', data),
};

export const promoterSelfApi = isDemoMode ? demoApi.demoPromoterSelfApi : realPromoterSelfApi;

// Albums API
const realAlbumsApi = {
  getAll: (params: { campaignId: string; eventId?: string; isPublished?: string }) =>
    api.get<any[]>('/albums', params),
  getById: (id: string) => api.get<any>(`/albums/${id}`),
  create: (data: { campaignId: string; eventId?: string; title: string; description?: string }) =>
    api.post<any>('/albums', data),
  update: (id: string, data: { title?: string; description?: string; sortOrder?: number }) =>
    api.patch<any>(`/albums/${id}`, data),
  delete: (id: string) => api.delete(`/albums/${id}`),
  publish: (id: string) => api.post<any>(`/albums/${id}/publish`),
  unpublish: (id: string) => api.post<any>(`/albums/${id}/unpublish`),
  setCoverPhoto: (id: string, photoId: string) =>
    api.patch<any>(`/albums/${id}/cover`, { photoId }),
  uploadPhotos: (albumId: string, files: File[], caption?: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (caption) formData.append('caption', caption);

    const headers: Record<string, string> = {};
    const token = api.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return fetch(`${API_URL}/albums/${albumId}/photos`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${res.status}`);
      }
      return res.json();
    });
  },
  reorderPhotos: (albumId: string, photoIds: string[]) =>
    api.patch<any>(`/albums/${albumId}/photos/reorder`, { photoIds }),
  shareSocial: (albumId: string, data: { platforms: string[]; message?: string }) =>
    api.post<any[]>(`/albums/${albumId}/share-social`, data),
  getSocialStatus: () =>
    api.get<Record<string, boolean>>('/albums/social/status'),
};
export const albumsApi = isDemoMode
  ? demoApi.demoAlbumsApi
  : realAlbumsApi;

// Photos API
const realPhotosApi = {
  upload: (file: File, data: { campaignId: string; albumId?: string; voterId?: string; caption?: string }) =>
    api.uploadFile<any>('/photos/upload', file, data as any),
  getById: (id: string) => api.get<any>(`/photos/${id}`),
  update: (id: string, data: { caption?: string; sortOrder?: number }) =>
    api.patch<any>(`/photos/${id}`, data),
  delete: (id: string) => api.delete(`/photos/${id}`),
};
export const photosApi = isDemoMode
  ? demoApi.demoPhotosApi
  : realPhotosApi;

// Public Albums API（不需登入）
export const publicAlbumsApi = {
  getBySlug: (slug: string) => api.get<any>(`/public/albums/${slug}`),
};

// Voter Avatar API
const realVoterAvatarApi = {
  upload: (voterId: string, file: File) =>
    api.uploadFile<any>(`/voters/${voterId}/avatar`, file),
  delete: (voterId: string) => api.delete(`/voters/${voterId}/avatar`),
};
export const voterAvatarApi = isDemoMode
  ? demoApi.demoVoterAvatarApi
  : realVoterAvatarApi;

// Role Invites API（超級管理者 QR 邀請）
const realRoleInvitesApi = {
  generate: (data: { role: 'ADMIN' | 'PROMOTER'; expiresInHours?: number; notes?: string }) =>
    api.post<{ token: string; expiresAt: string; role: string }>('/admin/role-invites/generate', data),
  claimInvite: (token: string) =>
    api.post<{ message: string; role: string; user: any }>('/auth/claim-role-invite', { token }),
};
export const roleInvitesApi = isDemoMode ? demoApi.demoRoleInvitesApi : realRoleInvitesApi;