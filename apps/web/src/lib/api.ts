import * as demoApi from './demo-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// 檢查是否為示範模式
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
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
      throw new Error(error.message || `HTTP ${response.status}`);
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
  lineCallback: (code: string, redirectUri: string) =>
    api.post<{ accessToken: string; user: any }>('/auth/line/callback', {
      code,
      redirectUri,
    }),
  getMe: () => api.get<any>('/auth/me'),
  logout: () => api.post('/auth/logout'),
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
  getDuplicates: (campaignId: string) =>
    api.get<any[]>('/voters/duplicates', { campaignId }),
  importExcel: (file: File, campaignId: string) =>
    api.uploadFile<any>('/voters/import', file, { campaignId }),
  exportExcel: (campaignId: string) =>
    api.downloadFile('/voters/export', { campaignId }, `選民資料_${new Date().toISOString().split('T')[0]}.xlsx`),
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
  checkIn: (id: string, voterId: string) =>
    api.post(`/events/${id}/check-in`, { voterId }),
};
export const eventsApi = isDemoMode ? demoApi.demoEventsApi : realEventsApi;

// Schedules API
const realSchedulesApi = {
  getByDate: (campaignId: string, date: string) =>
    api.get<any[]>(`/schedules/date/${date}`, { campaignId }),
  getById: (id: string) => api.get<any>(`/schedules/${id}`),
  create: (data: any) => api.post<any>('/schedules', data),
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
  getHistory: () => api.get<any[]>('/payments/history'),
  getPayment: (id: string) => api.get<any>(`/payments/${id}`),
  verifyStripe: (sessionId: string, paymentId: string) =>
    api.get<{ success: boolean }>('/payments/verify/stripe', { session_id: sessionId, payment_id: paymentId }),
  refund: (id: string, reason?: string) => api.post<{ success: boolean }>(`/payments/${id}/refund`, { reason }),
};
export const paymentsApi = isDemoMode ? demoApi.demoPaymentsApi : realPaymentsApi;

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
};
export const adminPaymentsApi = isDemoMode ? demoApi.demoAdminPaymentsApi : realAdminPaymentsApi;

const realAdminAnalyticsApi = {
  getOverview: () => api.get<any>('/admin/analytics/overview'),
  getUserGrowth: (days?: number) => api.get<any[]>('/admin/analytics/users', { days }),
  getRevenueReport: (months?: number) => api.get<any[]>('/admin/analytics/revenue', { months }),
  getSubscriptionDistribution: () => api.get<any>('/admin/analytics/subscriptions'),
  getRecentActivity: (limit?: number) => api.get<any>('/admin/analytics/recent', { limit }),
};
export const adminAnalyticsApi = isDemoMode ? demoApi.demoAdminAnalyticsApi : realAdminAnalyticsApi;