/**
 * 示範模式 API 層
 * 提供與真實 API 相同介面的模擬實作
 * 用於 Vercel 純前端部署
 */

import {
  demoUser,
  demoCampaign,
  demoVoters,
  demoContacts,
  demoEvents,
  demoSchedules,
  demoRelationships,
  demoDistricts,
  demoStats,
  demoPlans,
} from './demo-data';

// 模擬延遲
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 模擬分頁
function paginate<T>(data: T[], page: number = 1, limit: number = 20): { data: T[]; pagination: any } {
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedData = data.slice(start, end);
  
  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      total: data.length,
      totalPages: Math.ceil(data.length / limit),
    },
  };
}

// 暫存資料（用於模擬新增/修改）
let tempVoters = [...demoVoters];
let tempContacts = [...demoContacts];
let tempEvents = [...demoEvents];
let tempSchedules = [...demoSchedules];

// ==================== Auth API ====================
export const demoAuthApi = {
  lineCallback: async (_code: string, _redirectUri: string) => {
    await delay(300);
    return {
      accessToken: 'demo-token-' + Date.now(),
      user: demoUser,
    };
  },
  
  getMe: async () => {
    await delay(100);
    return demoUser;
  },
  
  logout: async () => {
    await delay(100);
    return { success: true };
  },
};

// ==================== Campaigns API ====================
export const demoCampaignsApi = {
  create: async (data: any) => {
    await delay(300);
    return { ...demoCampaign, ...data, id: 'new-campaign-' + Date.now() };
  },
  
  getById: async (_id: string) => {
    await delay(100);
    return demoCampaign;
  },
  
  update: async (id: string, data: any) => {
    await delay(200);
    return { ...demoCampaign, ...data, id };
  },
  
  delete: async (_id: string) => {
    await delay(200);
    return { success: true };
  },
  
  getStats: async (_id: string) => {
    await delay(100);
    return {
      totalVoters: demoStats.totalVoters,
      totalContacts: demoStats.totalContacts,
      totalEvents: demoStats.totalEvents,
      supportRate: 45.2,
      contactRate: 62.8,
    };
  },
  
  getTeam: async (_id: string) => {
    await delay(100);
    return [{
      id: 'team-1',
      userId: demoUser.id,
      role: 'ADMIN',
      user: demoUser,
      joinedAt: new Date().toISOString(),
    }];
  },
  
  invite: async (_id: string, _data: any) => {
    await delay(200);
    return { success: true };
  },
  
  updateMemberRole: async (_id: string, _memberId: string, _role: string) => {
    await delay(200);
    return { success: true };
  },
  
  removeMember: async (_id: string, _memberId: string) => {
    await delay(200);
    return { success: true };
  },
  
  createInviteLink: async (_id: string, data: any) => {
    await delay(200);
    return {
      id: 'invite-' + Date.now(),
      code: 'DEMO' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      ...data,
    };
  },
  
  getInviteLinks: async (_id: string) => {
    await delay(100);
    return [];
  },
  
  deactivateInviteLink: async (_id: string, _inviteId: string) => {
    await delay(200);
    return { success: true };
  },
  
  getInviteInfo: async (_code: string) => {
    await delay(100);
    return {
      campaign: demoCampaign,
      invitedBy: demoUser.name,
    };
  },
  
  joinByInviteCode: async (_code: string) => {
    await delay(300);
    return { success: true };
  },
};

// ==================== Voters API ====================
export const demoVotersApi = {
  getAll: async (params: any) => {
    await delay(200);
    let filtered = [...tempVoters];
    
    // 搜尋篩選
    if (params.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(search) ||
        v.phone?.includes(search) ||
        v.address?.toLowerCase().includes(search)
      );
    }
    
    // 區域篩選
    if (params.district) {
      filtered = filtered.filter(v => v.districtName === params.district);
    }
    
    // 立場篩選
    if (params.stance) {
      filtered = filtered.filter(v => v.stance === params.stance);
    }
    
    // 標籤篩選
    if (params.tag) {
      filtered = filtered.filter(v => v.tags?.includes(params.tag));
    }
    
    return paginate(filtered, params.page || 1, params.limit || 20);
  },
  
  getById: async (id: string) => {
    await delay(100);
    const voter = tempVoters.find(v => v.id === id);
    if (!voter) throw new Error('選民不存在');
    return voter;
  },
  
  create: async (data: any) => {
    await delay(300);
    const newVoter = {
      id: 'voter-new-' + Date.now(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tempVoters.unshift(newVoter);
    return newVoter;
  },
  
  update: async (id: string, data: any) => {
    await delay(200);
    const idx = tempVoters.findIndex(v => v.id === id);
    if (idx === -1) throw new Error('選民不存在');
    tempVoters[idx] = { ...tempVoters[idx], ...data, updatedAt: new Date().toISOString() };
    return tempVoters[idx];
  },
  
  delete: async (id: string) => {
    await delay(200);
    tempVoters = tempVoters.filter(v => v.id !== id);
    return { success: true };
  },
  
  getNearby: async (params: any) => {
    await delay(200);
    const { lat, lng, radius = 1 } = params;
    return tempVoters.filter(v => {
      if (!v.latitude || !v.longitude) return false;
      const distance = Math.sqrt(
        Math.pow((v.latitude - lat) * 111, 2) + 
        Math.pow((v.longitude - lng) * 111 * Math.cos(lat * Math.PI / 180), 2)
      );
      return distance <= radius;
    }).slice(0, 50);
  },
  
  getDuplicates: async (_campaignId: string) => {
    await delay(200);
    return [];
  },
  
  importExcel: async (_file: File, _campaignId: string) => {
    await delay(500);
    return { imported: 0, skipped: 0, errors: [] };
  },
  
  exportExcel: async (_campaignId: string) => {
    await delay(300);
    alert('示範模式不支援匯出功能');
  },
  
  getRelationships: async (id: string) => {
    await delay(100);
    return demoRelationships.filter(r => r.sourceVoterId === id || r.targetVoterId === id);
  },
  
  createRelationship: async (data: any) => {
    await delay(200);
    return { id: 'rel-' + Date.now(), ...data };
  },
  
  recordMeeting: async (_data: any) => {
    await delay(200);
    return { success: true };
  },
  
  batchCreateRelationships: async (_data: any) => {
    await delay(300);
    return { created: 0 };
  },
  
  getRelationshipsByEvent: async (_eventId: string) => {
    await delay(100);
    return { relationships: [], meetings: [] };
  },
  
  getRelationshipMeetings: async (_relationshipId: string) => {
    await delay(100);
    return [];
  },
};

// ==================== Contacts API ====================
export const demoContactsApi = {
  getAll: async (params: any) => {
    await delay(200);
    let filtered = [...tempContacts];
    
    if (params.voterId) {
      filtered = filtered.filter(c => c.voterId === params.voterId);
    }
    
    if (params.type) {
      filtered = filtered.filter(c => c.type === params.type);
    }
    
    if (params.outcome) {
      filtered = filtered.filter(c => c.outcome === params.outcome);
    }
    
    return paginate(filtered, params.page || 1, params.limit || 20);
  },
  
  getById: async (id: string) => {
    await delay(100);
    const contact = tempContacts.find(c => c.id === id);
    if (!contact) throw new Error('紀錄不存在');
    return contact;
  },
  
  create: async (data: any) => {
    await delay(300);
    const voter = tempVoters.find(v => v.id === data.voterId);
    const newContact = {
      id: 'contact-new-' + Date.now(),
      ...data,
      voter: voter ? { id: voter.id, name: voter.name, phone: voter.phone, address: voter.address, stance: voter.stance } : null,
      user: { id: demoUser.id, name: demoUser.name },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tempContacts.unshift(newContact);
    return newContact;
  },
  
  update: async (id: string, data: any) => {
    await delay(200);
    const idx = tempContacts.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('紀錄不存在');
    tempContacts[idx] = { ...tempContacts[idx], ...data, updatedAt: new Date().toISOString() };
    return tempContacts[idx];
  },
  
  delete: async (id: string) => {
    await delay(200);
    tempContacts = tempContacts.filter(c => c.id !== id);
    return { success: true };
  },
  
  getSummary: async (_campaignId: string) => {
    await delay(100);
    return {
      total: tempContacts.length,
      byType: demoStats.contactTypeDistribution,
      byOutcome: [
        { outcome: 'POSITIVE', count: tempContacts.filter(c => c.outcome === 'POSITIVE').length },
        { outcome: 'NEUTRAL', count: tempContacts.filter(c => c.outcome === 'NEUTRAL').length },
        { outcome: 'NEGATIVE', count: tempContacts.filter(c => c.outcome === 'NEGATIVE').length },
      ],
    };
  },
  
  getFollowUps: async (_campaignId: string) => {
    await delay(100);
    return tempContacts.filter(c => c.followUpDate && new Date(c.followUpDate) > new Date()).slice(0, 10);
  },
};

// ==================== Events API ====================
export const demoEventsApi = {
  getAll: async (_campaignId: string, params?: any) => {
    await delay(200);
    let filtered = [...tempEvents];
    
    if (params?.status) {
      filtered = filtered.filter(e => e.status === params.status);
    }
    
    if (params?.type) {
      filtered = filtered.filter(e => e.type === params.type);
    }
    
    return filtered;
  },
  
  getById: async (id: string) => {
    await delay(100);
    const event = tempEvents.find(e => e.id === id);
    if (!event) throw new Error('活動不存在');
    return event;
  },
  
  create: async (data: any) => {
    await delay(300);
    const newEvent = {
      id: 'event-new-' + Date.now(),
      ...data,
      createdBy: demoUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tempEvents.push(newEvent);
    return newEvent;
  },
  
  update: async (id: string, data: any) => {
    await delay(200);
    const idx = tempEvents.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('活動不存在');
    tempEvents[idx] = { ...tempEvents[idx], ...data, updatedAt: new Date().toISOString() };
    return tempEvents[idx];
  },
  
  delete: async (id: string) => {
    await delay(200);
    tempEvents = tempEvents.filter(e => e.id !== id);
    return { success: true };
  },
  
  getAttendees: async (_id: string) => {
    await delay(100);
    return tempVoters.slice(0, 10).map(v => ({
      voterId: v.id,
      status: 'CONFIRMED',
      voter: { id: v.id, name: v.name, phone: v.phone },
    }));
  },
  
  addAttendee: async (_id: string, _voterId: string) => {
    await delay(200);
    return { success: true };
  },
  
  checkIn: async (_id: string, _voterId: string) => {
    await delay(200);
    return { success: true };
  },
};

// ==================== Schedules API ====================
export const demoSchedulesApi = {
  getByDate: async (_campaignId: string, date: string) => {
    await delay(200);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return tempSchedules.filter(s => {
      const scheduleDate = new Date(s.date);
      scheduleDate.setHours(0, 0, 0, 0);
      return scheduleDate.getTime() === targetDate.getTime();
    });
  },
  
  getById: async (id: string) => {
    await delay(100);
    const schedule = tempSchedules.find(s => s.id === id);
    if (!schedule) throw new Error('行程不存在');
    return schedule;
  },
  
  create: async (data: any) => {
    await delay(300);
    const newSchedule = {
      id: 'schedule-new-' + Date.now(),
      ...data,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tempSchedules.push(newSchedule);
    return newSchedule;
  },
  
  addItem: async (id: string, data: any) => {
    await delay(200);
    const schedule = tempSchedules.find(s => s.id === id);
    if (!schedule) throw new Error('行程不存在');
    const newItem = {
      id: 'item-' + Date.now(),
      scheduleId: id,
      order: (schedule.items?.length || 0) + 1,
      ...data,
    };
    schedule.items = [...(schedule.items || []), newItem];
    return newItem;
  },
  
  removeItem: async (scheduleId: string, itemId: string) => {
    await delay(200);
    const schedule = tempSchedules.find(s => s.id === scheduleId);
    if (schedule) {
      schedule.items = schedule.items?.filter((i: any) => i.id !== itemId) || [];
    }
    return { success: true };
  },
  
  optimize: async (_id: string, _startLocation: any) => {
    await delay(500);
    return { optimized: true, message: '路線已優化（示範模式）' };
  },
  
  getSuggestions: async (_campaignId: string, lat: number, lng: number) => {
    await delay(200);
    return tempVoters.filter(v => {
      if (!v.latitude || !v.longitude) return false;
      const distance = Math.sqrt(
        Math.pow((v.latitude - lat) * 111, 2) + 
        Math.pow((v.longitude - lng) * 111 * Math.cos(lat * Math.PI / 180), 2)
      );
      return distance <= 2;
    }).slice(0, 10);
  },
  
  syncToGoogle: async (_id: string) => {
    await delay(300);
    alert('示範模式不支援 Google Calendar 同步');
    return { success: false };
  },
  
  unsyncFromGoogle: async (_id: string) => {
    await delay(200);
    return { success: true };
  },
  
  toggleSyncEnabled: async (_id: string, _enabled: boolean) => {
    await delay(200);
    return { success: true };
  },
};

// ==================== Google API ====================
export const demoGoogleApi = {
  getAuthUrl: async () => {
    await delay(100);
    return { authUrl: '' };
  },
  
  getStatus: async () => {
    await delay(100);
    return { connected: false };
  },
  
  disconnect: async () => {
    await delay(200);
    return { success: true };
  },
  
  syncAll: async () => {
    await delay(300);
    return { success: false, synced: 0, failed: 0 };
  },
};

// ==================== Analysis API ====================
export const demoAnalysisApi = {
  getOverview: async (_campaignId: string) => {
    await delay(200);
    return {
      totalVoters: demoStats.totalVoters,
      totalContacts: demoStats.totalContacts,
      totalEvents: demoStats.totalEvents,
      supportRate: 45.2,
      contactRate: 62.8,
      recentActivity: demoStats.dailyContacts.slice(-7),
    };
  },
  
  getStance: async (_campaignId: string) => {
    await delay(200);
    return {
      distribution: Object.entries(demoStats.stanceDistribution).map(([stance, count]) => ({
        stance,
        count,
        percentage: Math.round((count / demoStats.totalVoters) * 100 * 10) / 10,
      })),
      trend: demoStats.dailyContacts.slice(-14),
    };
  },
  
  getDistrict: async (_campaignId: string) => {
    await delay(200);
    return {
      distribution: demoStats.districtDistribution.map(d => ({
        ...d,
        supportRate: Math.round(Math.random() * 30 + 30),
      })),
    };
  },
  
  getTrend: async (_campaignId: string, days: number = 30) => {
    await delay(200);
    return {
      dailyContacts: demoStats.dailyContacts.slice(-days),
      dailyNewVoters: Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 20 + 5),
      })),
    };
  },
  
  getWinProbability: async (_campaignId: string) => {
    await delay(300);
    return {
      probability: 52.3,
      confidence: 75,
      factors: [
        { name: '支持度', score: 68, weight: 0.4 },
        { name: '接觸率', score: 62, weight: 0.3 },
        { name: '活動數', score: 55, weight: 0.2 },
        { name: '網路聲量', score: 45, weight: 0.1 },
      ],
    };
  },
  
  getInfluence: async (_campaignId: string) => {
    await delay(200);
    const influencers = tempVoters
      .filter(v => v.influenceScore >= 70)
      .sort((a, b) => b.influenceScore - a.influenceScore)
      .slice(0, 20);
    
    return {
      topInfluencers: influencers.map(v => ({
        id: v.id,
        name: v.name,
        influenceScore: v.influenceScore,
        stance: v.stance,
        connections: Math.floor(Math.random() * 20 + 5),
      })),
    };
  },
  
  getHeatmap: async (_campaignId: string) => {
    await delay(200);
    return tempVoters.map(v => ({
      lat: v.latitude,
      lng: v.longitude,
      intensity: v.stance.includes('SUPPORT') ? 1 : v.stance === 'NEUTRAL' ? 0.5 : 0.2,
    }));
  },
  
  getVisitStats: async (_campaignId: string) => {
    await delay(100);
    return {
      todayCompleted: 8,
      todayPlanned: 12,
      todayCompletionRate: 66.7,
      weekCompleted: 45,
      weekPlanned: 60,
      weekCompletionRate: 75,
      uniqueContacted: 312,
      totalVoters: demoStats.totalVoters,
      contactedRate: 62.4,
    };
  },
};

// ==================== Maps API ====================
export const demoMapsApi = {
  geocode: async (address: string) => {
    await delay(200);
    // 簡單模擬：回傳台北市中心附近的座標
    return {
      lat: 25.033 + (Math.random() - 0.5) * 0.1,
      lng: 121.565 + (Math.random() - 0.5) * 0.1,
      formattedAddress: address,
    };
  },
  
  reverseGeocode: async (lat: number, lng: number) => {
    await delay(200);
    return {
      address: `台北市（${lat.toFixed(4)}, ${lng.toFixed(4)}）`,
      city: '台北市',
      district: '大安區',
    };
  },
  
  getDirections: async (_origin: any, _destination: any, _waypoints?: any[]) => {
    await delay(300);
    return {
      distance: Math.round(Math.random() * 10 + 2),
      duration: Math.round(Math.random() * 30 + 10),
      polyline: '',
    };
  },
};

// ==================== Districts API ====================
export const demoDistrictsApi = {
  getAll: async (level?: string) => {
    await delay(100);
    if (level) {
      return demoDistricts.filter(d => d.level === level);
    }
    return demoDistricts;
  },
  
  getByCity: async (city: string) => {
    await delay(100);
    const cityDistrict = demoDistricts.find(d => d.name === city && d.level === 'CITY');
    if (!cityDistrict) return [];
    return demoDistricts.filter(d => d.parentId === cityDistrict.id);
  },
  
  getById: async (id: string) => {
    await delay(100);
    const district = demoDistricts.find(d => d.id === id);
    if (!district) throw new Error('選區不存在');
    return district;
  },
  
  getChildren: async (id: string) => {
    await delay(100);
    return demoDistricts.filter(d => d.parentId === id);
  },
};

// ==================== Subscriptions API ====================
export const demoSubscriptionsApi = {
  getPlans: async () => {
    await delay(100);
    return demoPlans;
  },
  
  getCurrentSubscription: async () => {
    await delay(100);
    return {
      hasSubscription: true,
      subscription: {
        id: 'demo-sub',
        planId: 'plan-free',
        plan: demoPlans[0],
        status: 'TRIALING',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  },
  
  checkSubscription: async () => {
    await delay(100);
    return {
      hasSubscription: true,
      status: 'TRIALING',
      plan: demoPlans[0],
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      isTrialing: true,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };
  },
  
  startTrial: async () => {
    await delay(300);
    return { success: true };
  },
  
  cancelSubscription: async (_reason?: string) => {
    await delay(300);
    return { success: true };
  },
  
  getHistory: async () => {
    await delay(100);
    return [];
  },
};

// ==================== Payments API ====================
export const demoPaymentsApi = {
  createPayment: async (_data: any) => {
    await delay(300);
    alert('示範模式不支援付款功能');
    return { paymentId: '', paymentUrl: '' };
  },
  
  getHistory: async () => {
    await delay(100);
    return [];
  },
  
  getPayment: async (_id: string) => {
    await delay(100);
    return null;
  },
  
  verifyStripe: async (_sessionId: string, _paymentId: string) => {
    await delay(100);
    return { success: false };
  },
  
  refund: async (_id: string, _reason?: string) => {
    await delay(300);
    return { success: false };
  },
};

// ==================== Admin APIs ====================
// 示範模式下不提供管理功能
export const demoAdminAuthApi = {
  getMe: async () => {
    await delay(100);
    throw new Error('示範模式不支援管理功能');
  },
  getAdmins: async () => {
    await delay(100);
    return [];
  },
  assignAdmin: async (_userId: string) => {
    await delay(200);
    throw new Error('示範模式不支援管理功能');
  },
  removeAdmin: async (_userId: string) => {
    await delay(200);
    throw new Error('示範模式不支援管理功能');
  },
};

export const demoAdminUsersApi = {
  getUsers: async () => {
    await delay(100);
    return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  },
  getStats: async () => {
    await delay(100);
    return {};
  },
  getUser: async (_id: string) => {
    await delay(100);
    return null;
  },
  getUserActivity: async (_id: string) => {
    await delay(100);
    return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  },
  suspendUser: async (_id: string, _reason: string) => {
    await delay(200);
    throw new Error('示範模式不支援管理功能');
  },
  activateUser: async (_id: string) => {
    await delay(200);
    throw new Error('示範模式不支援管理功能');
  },
};

export const demoAdminSubscriptionsApi = {
  getSubscriptions: async () => ({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
  getStats: async () => ({}),
  getPlans: async () => demoPlans,
  getSubscription: async (_id: string) => null,
  updatePlan: async () => { throw new Error('示範模式不支援管理功能'); },
  extendTrial: async () => { throw new Error('示範模式不支援管理功能'); },
  cancelSubscription: async () => { throw new Error('示範模式不支援管理功能'); },
};

export const demoAdminPaymentsApi = {
  getPayments: async () => ({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
  getStats: async () => ({}),
  getPayment: async (_id: string) => null,
  refundPayment: async () => { throw new Error('示範模式不支援管理功能'); },
};

export const demoAdminAnalyticsApi = {
  getOverview: async () => ({}),
  getUserGrowth: async () => [],
  getRevenueReport: async () => [],
  getSubscriptionDistribution: async () => ({}),
  getRecentActivity: async () => ({ users: [], payments: [], subscriptions: [] }),
};
