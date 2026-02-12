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

// 暫存邀請連結資料
let tempInviteLinks: any[] = [];

// 暫存活動參與者資料（eventId -> attendees[]）
const tempEventAttendees = new Map<string, Array<{ voterId: string; status: string; joinedAt: string }>>();

// 初始化：為每個活動隨機分配 5-15 位選民作為初始參與者
function initEventAttendees() {
  tempEvents.forEach((event, eventIndex) => {
    const attendeeCount = 5 + Math.floor((eventIndex * 7 + 3) % 11); // 確定性偽隨機 5-15
    const startIdx = (eventIndex * 13) % tempVoters.length;
    const attendees: Array<{ voterId: string; status: string; joinedAt: string }> = [];
    const statuses = ['INVITED', 'CONFIRMED', 'ATTENDED', 'CONFIRMED', 'ATTENDED'];
    for (let i = 0; i < attendeeCount && i < tempVoters.length; i++) {
      const voterIdx = (startIdx + i) % tempVoters.length;
      attendees.push({
        voterId: tempVoters[voterIdx].id,
        status: statuses[i % statuses.length],
        joinedAt: new Date(Date.now() - (attendeeCount - i) * 3600000).toISOString(),
      });
    }
    tempEventAttendees.set(event.id, attendees);
  });
}
initEventAttendees();

// ==================== Auth API ====================
export const demoAuthApi = {
  lineCallback: async (_code: string, _redirectUri: string, _promoterCode?: string) => {
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
    const newLink = {
      id: 'invite-' + Date.now(),
      code: 'DEMO' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      role: data.role || 'VIEWER',
      maxUses: data.maxUses || null,
      usedCount: 0,
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      creator: {
        id: demoUser.id,
        name: demoUser.name,
      },
    };
    tempInviteLinks.unshift(newLink);
    return newLink;
  },
  
  getInviteLinks: async (_id: string) => {
    await delay(100);
    return tempInviteLinks;
  },
  
  deactivateInviteLink: async (_id: string, inviteId: string) => {
    await delay(200);
    const link = tempInviteLinks.find(l => l.id === inviteId);
    if (link) {
      link.isActive = false;
    }
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
    if (params.city) {
      filtered = filtered.filter(v => v.city === params.city);
    }
    if (params.district) {
      filtered = filtered.filter(v => v.districtName === params.district);
    }
    if (params.village) {
      filtered = filtered.filter(v => v.village === params.village);
    }
    
    // 排除指定選民（用於同區域查詢）
    if (params.excludeId) {
      filtered = filtered.filter(v => v.id !== params.excludeId);
    }
    
    // 立場篩選
    if (params.stance) {
      filtered = filtered.filter(v => v.stance === params.stance);
    }
    
    // 標籤篩選
    if (params.tag) {
      filtered = filtered.filter(v => v.tags?.includes(params.tag));
    }
    
    // 影響力分數範圍篩選
    if (params.influenceRange) {
      switch (params.influenceRange) {
        case 'high':
          filtered = filtered.filter(v => v.influenceScore >= 80);
          break;
        case 'medium':
          filtered = filtered.filter(v => v.influenceScore >= 50 && v.influenceScore < 80);
          break;
        case 'low':
          filtered = filtered.filter(v => v.influenceScore < 50);
          break;
      }
    }
    
    // 接觸狀態篩選
    if (params.contactStatus) {
      if (params.contactStatus === 'contacted') {
        filtered = filtered.filter(v => v.contactCount > 0);
      } else if (params.contactStatus === 'not_contacted') {
        filtered = filtered.filter(v => !v.contactCount || v.contactCount === 0);
      }
    }

    // 建立日期篩選
    if (params.createdAfter) {
      const afterDate = new Date(params.createdAfter);
      filtered = filtered.filter(v => new Date(v.createdAt) >= afterDate);
    }
    if (params.createdBefore) {
      const beforeDate = new Date(params.createdBefore);
      filtered = filtered.filter(v => new Date(v.createdAt) <= beforeDate);
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
    // 多人防重複：檢查 LINE ID/URL 是否已存在於同一活動
    if (data.lineId || data.lineUrl) {
      const existing = tempVoters.find(v =>
        v.campaignId === data.campaignId &&
        ((data.lineId && v.lineId === data.lineId) ||
         (data.lineUrl && v.lineUrl === data.lineUrl))
      );
      if (existing) {
        return { ...existing, _alreadyExists: true };
      }
    }
    const newVoter = {
      id: 'voter-new-' + Date.now(),
      ...data,
      contactCount: 0,
      lastContactAt: null,
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
    // 支援兩種參數名稱：lat/lng 或 latitude/longitude
    const lat = params.lat ?? params.latitude;
    const lng = params.lng ?? params.longitude;
    const radius = params.radius ?? 1;
    
    if (!lat || !lng) {
      return [];
    }
    
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
    const XLSX = await import('xlsx');
    
    const stanceLabels: Record<string, string> = {
      STRONG_SUPPORT: '強力支持', SUPPORT: '支持', LEAN_SUPPORT: '傾向支持',
      NEUTRAL: '中立', UNDECIDED: '未表態', LEAN_OPPOSE: '傾向反對',
      OPPOSE: '反對', STRONG_OPPOSE: '強力反對',
    };
    const genderLabels: Record<string, string> = { M: '男', F: '女' };

    const data = demoVoters.map(v => ({
      '姓名': v.name,
      '電話': v.phone || '',
      '地址': v.address,
      '區域': v.districtName,
      '里': v.village,
      '政治傾向': stanceLabels[v.stance] || v.stance,
      '影響力分數': v.influenceScore,
      '年齡': v.age,
      '性別': genderLabels[v.gender] || v.gender,
      '職業': v.occupation,
      '標籤': (v.tags || []).join('、'),
      '備註': v.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    // 設定欄寬
    ws['!cols'] = [
      { wch: 8 }, { wch: 14 }, { wch: 30 }, { wch: 8 }, { wch: 8 },
      { wch: 10 }, { wch: 10 }, { wch: 6 }, { wch: 6 }, { wch: 10 },
      { wch: 20 }, { wch: 15 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '選民資料');
    XLSX.writeFile(wb, `選民資料_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  exportCsv: async (_campaignId: string) => {
    await delay(300);
    
    const headers = ['姓名', '電話', '地址', '區域', '里', '政治傾向', '影響力分數', '年齡', '性別', '職業', '標籤', '備註'];
    const stanceLabels: Record<string, string> = {
      STRONG_SUPPORT: '強力支持', SUPPORT: '支持', LEAN_SUPPORT: '傾向支持',
      NEUTRAL: '中立', UNDECIDED: '未表態', LEAN_OPPOSE: '傾向反對',
      OPPOSE: '反對', STRONG_OPPOSE: '強力反對',
    };
    const genderLabels: Record<string, string> = { M: '男', F: '女' };

    const rows = demoVoters.map(v => [
      v.name, v.phone || '', v.address, v.districtName, v.village,
      stanceLabels[v.stance] || v.stance, v.influenceScore, v.age,
      genderLabels[v.gender] || v.gender, v.occupation,
      (v.tags || []).join('、'), v.notes || '',
    ]);

    const csvContent = '\uFEFF' + [headers, ...rows].map(row =>
      row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `選民資料_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
  
  // 附件相關 API
  getAttachments: async (voterId: string) => {
    await delay(100);
    return tempVoterAttachments.filter(a => a.voterId === voterId);
  },
  
  addAttachment: async (voterId: string, data: {
    type: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }) => {
    await delay(200);
    const newAttachment = {
      id: 'attachment-' + Date.now(),
      voterId,
      type: data.type,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      createdAt: new Date().toISOString(),
    };
    tempVoterAttachments.push(newAttachment);
    return newAttachment;
  },
  
  deleteAttachment: async (_voterId: string, attachmentId: string) => {
    await delay(200);
    tempVoterAttachments = tempVoterAttachments.filter(a => a.id !== attachmentId);
    return { success: true };
  },
  
  searchByLine: async (params: { campaignId: string; lineId?: string; lineUrl?: string }) => {
    await delay(200);
    const voters = tempVoters.filter(v => {
      if (params.lineId && v.lineId === params.lineId) return true;
      if (params.lineUrl && v.lineUrl === params.lineUrl) return true;
      return false;
    });
    return {
      found: voters.length > 0,
      voters,
    };
  },
};

// 暫存附件資料
let tempVoterAttachments: any[] = [];

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

    if (params.timeRange) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      let startDate: Date = now;

      if (params.timeRange === 'today') {
        startDate = now;
      } else if (params.timeRange === 'week') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - startDate.getDay());
      } else if (params.timeRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      filtered = filtered.filter(c => new Date(c.contactDate) >= startDate);
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
    // 若未提供地理位置，給予預設台北市座標（Demo 模式模擬）
    const locationLat = data.locationLat || (25.033 + (Math.random() - 0.5) * 0.02);
    const locationLng = data.locationLng || (121.565 + (Math.random() - 0.5) * 0.02);
    const location = data.location || '台北市信義區';
    const newContact = {
      id: 'contact-new-' + Date.now(),
      ...data,
      locationLat,
      locationLng,
      location,
      voter: voter ? { id: voter.id, name: voter.name, phone: voter.phone, address: voter.address, stance: voter.stance } : null,
      user: { id: demoUser.id, name: demoUser.name },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tempContacts.unshift(newContact);
    // 更新選民的 contactCount 和 lastContactAt
    if (voter) {
      const voterIdx = tempVoters.findIndex(v => v.id === voter.id);
      if (voterIdx !== -1) {
        tempVoters[voterIdx] = {
          ...tempVoters[voterIdx],
          contactCount: (tempVoters[voterIdx].contactCount || 0) + 1,
          lastContactAt: new Date().toISOString(),
        };
      }
    }
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
    // 轉換為物件格式 {TYPE_NAME: count}
    const byType: Record<string, number> = {};
    demoStats.contactTypeDistribution.forEach(item => {
      byType[item.type] = item.count;
    });
    
    const byOutcome: Record<string, number> = {
      POSITIVE: tempContacts.filter(c => c.outcome === 'POSITIVE').length,
      NEUTRAL: tempContacts.filter(c => c.outcome === 'NEUTRAL').length,
      NEGATIVE: tempContacts.filter(c => c.outcome === 'NEGATIVE').length,
      NOT_HOME: tempContacts.filter(c => c.outcome === 'NOT_HOME').length,
      NO_RESPONSE: tempContacts.filter(c => c.outcome === 'NO_RESPONSE').length,
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayContacts = tempContacts.filter(c => new Date(c.contactDate) >= today).length;
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekContacts = tempContacts.filter(c => new Date(c.contactDate) >= weekAgo).length;
    
    return {
      totalContacts: tempContacts.length,
      todayContacts,
      weekContacts,
      byType,
      byOutcome,
      recentContacts: tempContacts.slice(0, 10),
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
  
  getAttendees: async (id: string) => {
    await delay(100);
    const attendeeRecords = tempEventAttendees.get(id) || [];
    return attendeeRecords.map(record => {
      const voter = tempVoters.find(v => v.id === record.voterId);
      return {
        id: `${id}-${record.voterId}`,
        voterId: record.voterId,
        status: record.status,
        joinedAt: record.joinedAt,
        voter: voter ? { id: voter.id, name: voter.name, phone: voter.phone } : null,
      };
    });
  },

  addAttendee: async (id: string, voterId: string) => {
    await delay(200);
    const attendees = tempEventAttendees.get(id) || [];
    // 檢查是否已存在
    if (attendees.some(a => a.voterId === voterId)) {
      throw new Error('該選民已是此活動的參與者');
    }
    const newRecord = {
      voterId,
      status: 'CONFIRMED',
      joinedAt: new Date().toISOString(),
    };
    attendees.push(newRecord);
    tempEventAttendees.set(id, attendees);
    const voter = tempVoters.find(v => v.id === voterId);
    return {
      id: `${id}-${voterId}`,
      voterId,
      status: 'CONFIRMED',
      joinedAt: newRecord.joinedAt,
      voter: voter ? { id: voter.id, name: voter.name, phone: voter.phone } : null,
    };
  },

  updateAttendeeStatus: async (eventId: string, voterId: string, status: string) => {
    await delay(200);
    const attendees = tempEventAttendees.get(eventId) || [];
    const record = attendees.find(a => a.voterId === voterId);
    if (!record) throw new Error('參與者不存在');
    record.status = status;
    return { success: true };
  },

  removeAttendee: async (eventId: string, voterId: string) => {
    await delay(200);
    const attendees = tempEventAttendees.get(eventId) || [];
    const filtered = attendees.filter(a => a.voterId !== voterId);
    tempEventAttendees.set(eventId, filtered);
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
  
  updateItemStatus: async (scheduleId: string, itemId: string, status: string) => {
    await delay(200);
    const schedule = tempSchedules.find(s => s.id === scheduleId);
    if (!schedule) throw new Error('行程不存在');
    
    const item = schedule.items?.find((i: any) => i.id === itemId);
    if (!item) throw new Error('行程項目不存在');
    
    item.status = status;
    return item;
  },
  
  reorderItems: async (scheduleId: string, itemIds: string[]) => {
    await delay(200);
    const schedule = tempSchedules.find(s => s.id === scheduleId);
    if (!schedule) throw new Error('行程不存在');
    
    // 根據 itemIds 重新排序 items
    const reorderedItems = itemIds.map((id, index) => {
      const item = schedule.items?.find((i: any) => i.id === id);
      if (item) {
        return { ...item, order: index + 1 };
      }
      return null;
    }).filter(Boolean);
    
    schedule.items = reorderedItems;
    return schedule;
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
  
  // 匯出行程資料（整月）
  exportByDateRange: async (campaignId: string, startDate: string, endDate: string) => {
    await delay(300);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return tempSchedules.filter(s => {
      const scheduleDate = new Date(s.date);
      return scheduleDate >= start && scheduleDate <= end;
    }).map(schedule => ({
      ...schedule,
      items: schedule.items?.map((item: any) => ({
        ...item,
        voter: item.voterId ? tempVoters.find(v => v.id === item.voterId) : null,
      })),
    }));
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
    const uniqueVotersContacted = new Set(tempContacts.map(c => c.voterId)).size;
    
    return {
      voterStats: {
        totalVoters: demoStats.totalVoters,
        highInfluenceCount: tempVoters.filter(v => v.influenceScore >= 70).length,
      },
      contactStats: {
        totalContacts: demoStats.totalContacts,
        uniqueVotersContacted,
        contactRate: uniqueVotersContacted / demoStats.totalVoters,
      },
      stanceDistribution: demoStats.stanceDistribution,
      totalEvents: demoStats.totalEvents,
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
      probability: 0.523,  // 比例值，供 formatPercent 使用
      confidence: 0.75,
      scenario: 'COMPETITIVE',
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
        voterId: v.id,
        voterName: v.name,
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
      todayCompletionRate: 0.667,  // 比例值
      weekCompleted: 45,
      weekPlanned: 60,
      weekCompletionRate: 0.75,  // 比例值
      uniqueContacted: 312,
      totalVoters: demoStats.totalVoters,
      contactedRate: 0.624,  // 比例值
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
        currentPeriodStart: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
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

  // 分級定價 API（Demo 版）
  getAvailableCities: async () => {
    await delay(100);
    return [
      { regionLevel: 1, label: '一級戰區（六都）', cities: ['新北市', '台北市', '桃園市', '台中市', '台南市', '高雄市'] },
      { regionLevel: 2, label: '二級戰區', cities: ['彰化縣', '屏東縣', '新竹縣', '新竹市'] },
      { regionLevel: 3, label: '三級戰區（基準）', cities: ['南投縣', '苗栗縣', '雲林縣', '宜蘭縣'] },
      { regionLevel: 4, label: '四級戰區', cities: ['嘉義縣', '基隆市', '花蓮縣', '嘉義市', '台東縣'] },
      { regionLevel: 5, label: '五級戰區（離島）', cities: ['金門縣', '澎湖縣', '連江縣'] },
    ];
  },

  getElectionTypes: async () => {
    await delay(100);
    return [
      { code: 'VILLAGE_CHIEF', label: '里長', category: 'VILLAGE_CHIEF' },
      { code: 'TOWNSHIP_REP', label: '民代', category: 'REPRESENTATIVE' },
      { code: 'CITY_COUNCILOR', label: '議員', category: 'COUNCILOR' },
      { code: 'MAYOR', label: '市長', category: 'MAYOR' },
      { code: 'LEGISLATOR', label: '立委', category: 'LEGISLATOR' },
    ];
  },

  getPlansByCity: async (city: string) => {
    await delay(100);
    return {
      city,
      trialPlan: demoPlans[0],
      plans: demoPlans.slice(1),
    };
  },

  getPlanByLocation: async (city: string, electionType: string) => {
    await delay(100);
    // Demo 模式返回示範價格
    const demoPrice = {
      VILLAGE_CHIEF: 26800,
      TOWNSHIP_REP: 29800,
      CITY_COUNCILOR: 39800,
      MAYOR: 168000,
      LEGISLATOR: 116800,
    };
    const electionLabels: Record<string, string> = {
      VILLAGE_CHIEF: '里長',
      TOWNSHIP_REP: '民代',
      CITY_COUNCILOR: '議員',
      MAYOR: '市長',
      LEGISLATOR: '立委',
    };
    return {
      city,
      electionType,
      plan: {
        id: `demo-plan-${city}-${electionType}`,
        name: `${city}${electionLabels[electionType] || electionType}方案`,
        code: `${city}_${electionType}_MONTHLY`,
        price: demoPrice[electionType as keyof typeof demoPrice] || 29800,
        interval: 'MONTH',
        voterLimit: null,
        teamLimit: 10,
        features: ['三級戰區定價', '無限選民數量', '10 位團隊成員', '完整選情分析'],
        isActive: true,
        sortOrder: 1,
        city,
        category: electionType,
        regionLevel: 3,
        description: `${city}${electionLabels[electionType] || electionType}選舉專用方案`,
      },
      trialPlan: demoPlans[0],
    };
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

// ==================== Referrals API ====================
export const demoReferralsApi = {
  getMyCode: async () => {
    await delay(100);
    return {
      code: 'DEMO1234',
      shareUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=DEMO1234`,
    };
  },

  applyCode: async (code: string) => {
    await delay(300);
    if (code === 'INVALID') {
      throw new Error('推薦碼無效或已過期');
    }
    return {
      success: true,
      message: '推薦碼套用成功！付費後您和推薦人都將獲得一個月免費使用',
      referral: {
        id: 'demo-referral-' + Date.now(),
        referrerName: '示範推薦人',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
    };
  },

  getMyReferrals: async () => {
    await delay(100);
    return [
      {
        id: 'referral-1',
        referredUser: {
          id: 'user-1',
          name: '王小明',
          avatarUrl: null,
          joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        status: 'COMPLETED',
        rewardMonths: 1,
        rewardGrantedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'referral-2',
        referredUser: {
          id: 'user-2',
          name: '李小華',
          avatarUrl: null,
          joinedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        status: 'PENDING',
        rewardMonths: 0,
        rewardGrantedAt: null,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  },

  getStats: async () => {
    await delay(100);
    return {
      totalReferrals: 5,
      completedReferrals: 2,
      pendingReferrals: 3,
      totalRewardMonths: 2,
    };
  },

  getPending: async () => {
    await delay(100);
    return {
      hasPendingReferral: false,
      referral: undefined,
    };
  },
};

// ==================== Admin APIs ====================
// 示範模式下不提供管理功能
export const demoAdminAuthApi = {
  getMe: async () => {
    await delay(100);
    return { id: 'demo-user-id', name: '示範使用者', isAdmin: true, isSuperAdmin: false };
  },
  getAdmins: async () => {
    await delay(100);
    return demoUsers.filter((u) => u.isAdmin);
  },
  assignAdmin: async (userId: string) => {
    await delay(200);
    const user = demoUsers.find((u) => u.id === userId);
    if (user) user.isAdmin = true;
    return { message: '已指派為管理員', user };
  },
  removeAdmin: async (userId: string) => {
    await delay(200);
    const user = demoUsers.find((u) => u.id === userId);
    if (user) user.isAdmin = false;
    return { message: '已移除管理員權限', user };
  },
};

// 示範用使用者資料
const demoUsers = [
  {
    id: 'demo-user-1',
    name: '王小明',
    email: 'xiaoming@example.com',
    phone: '0912-345-678',
    avatarUrl: null,
    isAdmin: false,
    isSuperAdmin: false,
    isActive: true,
    isSuspended: false,
    createdAt: '2025-11-15T08:00:00Z',
    promoter: null,
    subscriptions: [{ id: 'demo-sub-1', plan: { id: 'plan-pro', name: '專業版' }, status: 'ACTIVE' }],
    campaigns: [],
    teamMembers: [],
    _count: { contacts: 25, createdVoters: 80, campaigns: 1 },
  },
  {
    id: 'demo-user-2',
    name: '李美華',
    email: 'meihua@example.com',
    phone: '0923-456-789',
    avatarUrl: null,
    isAdmin: true,
    isSuperAdmin: false,
    isActive: true,
    isSuspended: false,
    createdAt: '2025-10-20T10:00:00Z',
    promoter: null,
    subscriptions: [{ id: 'demo-sub-2', plan: { id: 'plan-free', name: '免費試用' }, status: 'TRIAL' }],
    campaigns: [],
    teamMembers: [],
    _count: { contacts: 60, createdVoters: 200, campaigns: 2 },
  },
  {
    id: 'demo-user-3',
    name: '張志豪',
    email: 'zhihao@example.com',
    phone: '0934-567-890',
    avatarUrl: null,
    isAdmin: false,
    isSuperAdmin: false,
    isActive: true,
    isSuspended: true,
    createdAt: '2026-01-05T14:00:00Z',
    promoter: {
      id: 'demo-promoter-ext',
      referralCode: 'ZH2026',
      isActive: false,
      status: 'SUSPENDED',
    },
    subscriptions: [{ id: 'demo-sub-3', plan: { id: 'plan-pro', name: '專業版' }, status: 'CANCELLED' }],
    campaigns: [],
    teamMembers: [],
    _count: { contacts: 10, createdVoters: 30, campaigns: 0 },
  },
  {
    id: 'demo-user-4',
    name: '陳雅芳',
    email: 'yafang@example.com',
    phone: '0945-678-901',
    avatarUrl: null,
    isAdmin: false,
    isSuperAdmin: false,
    isActive: true,
    isSuspended: false,
    createdAt: '2025-12-01T09:00:00Z',
    promoter: null,
    subscriptions: [{ id: 'demo-sub-4', plan: { id: 'plan-pro', name: '專業版' }, status: 'PAST_DUE' }],
    campaigns: [],
    teamMembers: [],
    _count: { contacts: 5, createdVoters: 15, campaigns: 1 },
  },
  {
    id: 'demo-user-id',
    name: '示範使用者',
    email: 'demo@example.com',
    phone: '0912345678',
    avatarUrl: null,
    isAdmin: true,
    isSuperAdmin: true,
    isActive: true,
    isSuspended: false,
    createdAt: '2024-01-01T00:00:00Z',
    promoter: {
      id: 'demo-promoter-id',
      referralCode: 'DEMO1234',
      isActive: true,
      status: 'APPROVED',
    },
    subscriptions: [{ id: 'demo-sub', plan: { id: 'plan-free', name: '免費試用' }, status: 'TRIALING' }],
    campaigns: [],
    teamMembers: [],
    _count: { contacts: 0, createdVoters: 500, campaigns: 1 },
  },
];

// 管理後台用的活動資料（含選情統計）
const demoCampaignsForAdmin = [
  {
    id: 'campaign-1', ownerId: 'demo-user-id', name: '2026市議員選舉', city: '台北市',
    district: '大安區', village: null, electionType: 'CITY_COUNCILOR',
    voterCount: 320, contactCount: 198, supportCount: 131,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'campaign-2', ownerId: 'demo-user-1', name: '2026里長選舉', city: '台北市',
    district: '信義區', village: '永春里', electionType: 'VILLAGE_CHIEF',
    voterCount: 180, contactCount: 125, supportCount: 76,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'campaign-3', ownerId: 'demo-user-2', name: '2026鄉鎮代表', city: '新北市',
    district: '板橋區', village: null, electionType: 'TOWNSHIP_REP',
    voterCount: 250, contactCount: 160, supportCount: 100,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 'campaign-4', ownerId: 'demo-user-3', name: '2026市議員第二選區', city: '桃園市',
    district: null, village: null, electionType: 'CITY_COUNCILOR',
    voterCount: 420, contactCount: 280, supportCount: 185,
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
  },
  {
    id: 'campaign-5', ownerId: 'demo-user-4', name: '2026里長選舉', city: '台中市',
    district: '西屯區', village: '福星里', electionType: 'VILLAGE_CHIEF',
    voterCount: 150, contactCount: 98, supportCount: 68,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'campaign-6', ownerId: 'demo-user-1', name: '2026鄉民代表', city: '台北市',
    district: '松山區', village: null, electionType: 'TOWNSHIP_REP',
    voterCount: 200, contactCount: 140, supportCount: 88,
    createdAt: new Date(Date.now() - 80 * 86400000).toISOString(),
  },
];

export const demoAdminUsersApi = {
  getUsers: async (params?: any) => {
    await delay(100);
    let filtered = [...demoUsers];

    // 依帳號停用狀態篩選
    if (params?.isSuspended === true) {
      filtered = filtered.filter((u) => u.isSuspended);
    } else if (params?.isSuspended === false) {
      filtered = filtered.filter((u) => !u.isSuspended);
    }

    // 依訂閱狀態篩選
    if (params?.hasSubscription === true) {
      filtered = filtered.filter((u) => u.subscriptions && u.subscriptions.length > 0);
    } else if (params?.hasSubscription === false) {
      filtered = filtered.filter((u) => !u.subscriptions || u.subscriptions.length === 0);
    }
    if (params?.subscriptionStatus) {
      filtered = filtered.filter((u) =>
        u.subscriptions?.some((s: any) => s.status === params.subscriptionStatus)
      );
    }

    // 依搜尋關鍵字篩選
    if (params?.search) {
      const keyword = params.search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(keyword) ||
          u.email?.toLowerCase().includes(keyword) ||
          u.phone?.includes(keyword)
      );
    }

    // 為每個使用者附加選情指標
    const usersWithStats = filtered.map((u) => {
      const userCampaigns = demoCampaignsForAdmin.filter((c) => c.ownerId === u.id);
      const totalVoters = userCampaigns.reduce((sum, c) => sum + c.voterCount, 0);
      const totalContacts = userCampaigns.reduce((sum, c) => sum + c.contactCount, 0);
      const supportCount = userCampaigns.reduce((sum, c) => sum + c.supportCount, 0);
      return {
        ...u,
        currentSubscription: u.subscriptions?.[0] || null,
        campaignStats: {
          totalVoters,
          totalContacts,
          supportRate: totalVoters > 0 ? Math.round((supportCount / totalVoters) * 1000) / 10 : 0,
          contactRate: totalVoters > 0 ? Math.round((totalContacts / totalVoters) * 1000) / 10 : 0,
        },
      };
    });

    return {
      data: usersWithStats,
      pagination: { page: 1, limit: 20, total: filtered.length, totalPages: 1 },
    };
  },
  getStats: async () => {
    await delay(100);
    return {
      totalUsers: demoUsers.length,
      activeUsers: demoUsers.filter((u) => !u.isSuspended).length,
      trialUsers: demoUsers.filter((u) => u.subscriptions?.some((s: any) => ['TRIALING', 'TRIAL'].includes(s.status))).length,
      paidUsers: demoUsers.filter((u) => u.subscriptions?.some((s: any) => s.status === 'ACTIVE')).length,
    };
  },
  getUser: async (id: string) => {
    await delay(100);
    const user = demoUsers.find((u) => u.id === id);
    if (!user) return null;
    // 增加 campaigns 資料
    const userCampaigns = demoCampaignsForAdmin.filter((c) => c.ownerId === id);
    return {
      ...user,
      campaigns: userCampaigns.map((c) => ({
        id: c.id,
        name: c.name,
        electionType: c.electionType,
        city: c.city,
        district: c.district || null,
        village: c.village || null,
        isActive: true,
        createdAt: c.createdAt,
        _count: { voters: c.voterCount, contacts: c.contactCount, teamMembers: 3 },
      })),
    };
  },
  getUserActivity: async (_id: string) => {
    await delay(100);
    return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  },
  getUserPayments: async (id: string, params?: any) => {
    await delay(100);
    const userPayments = demoPayments.filter((p: any) => p.user?.id === id || p.subscription?.user?.id === id);
    return {
      data: userPayments.map((p: any) => ({
        ...p,
        subscription: { plan: { id: 'plan-pro', name: '專業版', code: 'pro' } },
      })),
      pagination: { page: 1, limit: 20, total: userPayments.length, totalPages: 1 },
    };
  },
  getUserReferrals: async (id: string) => {
    await delay(100);
    const asReferrer = demoReferrals.filter((r: any) => r.referrer?.id === id).map((r: any) => ({
      ...r, referred: r.referred,
    }));
    const asReferred = demoReferrals.filter((r: any) => r.referred?.id === id).map((r: any) => ({
      ...r, referrer: r.referrer,
    }));
    return { asReferrer, asReferred };
  },
  getUserVoters: async (id: string, params?: any) => {
    await delay(100);
    const userCampaigns = demoCampaignsForAdmin.filter((c) => c.ownerId === id);
    // 根據使用者的活動生成選民
    const voters = userCampaigns.flatMap((c) => {
      const stances = ['STRONG_SUPPORT', 'SUPPORT', 'LEAN_SUPPORT', 'NEUTRAL', 'UNDECIDED', 'LEAN_OPPOSE', 'OPPOSE'];
      return Array.from({ length: Math.min(c.voterCount, 20) }, (_, i) => ({
        id: `voter-${c.id}-${i}`,
        name: `選民${i + 1}`,
        phone: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        email: null,
        city: c.city,
        districtName: c.district || '',
        village: c.village || '',
        stance: stances[i % stances.length],
        contactCount: Math.floor(Math.random() * 5),
        lastContactAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
        campaignId: c.id,
        campaignName: c.name,
        createdAt: new Date(Date.now() - Math.random() * 60 * 86400000).toISOString(),
      }));
    });
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const start = (page - 1) * limit;
    return {
      data: voters.slice(start, start + limit),
      pagination: { page, limit, total: voters.length, totalPages: Math.ceil(voters.length / limit) },
    };
  },
  getUserContacts: async (id: string, params?: any) => {
    await delay(100);
    const userCampaigns = demoCampaignsForAdmin.filter((c) => c.ownerId === id);
    const types = ['HOME_VISIT', 'STREET_VISIT', 'PHONE_CALL', 'LINE_CALL', 'MARKETPLACE', 'TEMPLE'];
    const outcomes = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'NOT_HOME', 'NO_RESPONSE'];
    const contacts = userCampaigns.flatMap((c) =>
      Array.from({ length: Math.min(c.contactCount, 15) }, (_, i) => ({
        id: `contact-${c.id}-${i}`,
        voter: { id: `voter-${c.id}-${i}`, name: `選民${i + 1}`, phone: '0912345678' },
        type: types[i % types.length],
        outcome: outcomes[i % outcomes.length],
        contactDate: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
        notes: '',
        campaignId: c.id,
        campaignName: c.name,
      }))
    );
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const start = (page - 1) * limit;
    return {
      data: contacts.slice(start, start + limit),
      pagination: { page, limit, total: contacts.length, totalPages: Math.ceil(contacts.length / limit) },
    };
  },
  getUserCampaignStats: async (id: string) => {
    await delay(150);
    const userCampaigns = demoCampaignsForAdmin.filter((c) => c.ownerId === id);
    if (userCampaigns.length === 0) {
      return {
        summary: { totalCampaigns: 0, totalVoters: 0, totalContacts: 0, overallSupportRate: 0, overallContactRate: 0 },
        stanceDistribution: {}, contactOutcomeDistribution: {}, contactTypeDistribution: {},
        campaignBreakdown: [],
      };
    }

    const totalVoters = userCampaigns.reduce((s, c) => s + c.voterCount, 0);
    const totalContacts = userCampaigns.reduce((s, c) => s + c.contactCount, 0);
    const totalSupport = userCampaigns.reduce((s, c) => s + c.supportCount, 0);

    // 整體支持度分佈
    const stanceDistribution: Record<string, number> = {
      STRONG_SUPPORT: Math.round(totalVoters * 0.08),
      SUPPORT: Math.round(totalVoters * 0.18),
      LEAN_SUPPORT: Math.round(totalVoters * 0.15),
      NEUTRAL: Math.round(totalVoters * 0.20),
      UNDECIDED: Math.round(totalVoters * 0.18),
      LEAN_OPPOSE: Math.round(totalVoters * 0.08),
      OPPOSE: Math.round(totalVoters * 0.08),
      STRONG_OPPOSE: Math.round(totalVoters * 0.05),
    };

    const contactOutcomeDistribution: Record<string, number> = {
      POSITIVE: Math.round(totalContacts * 0.35),
      NEUTRAL: Math.round(totalContacts * 0.30),
      NEGATIVE: Math.round(totalContacts * 0.10),
      NO_RESPONSE: Math.round(totalContacts * 0.15),
      NOT_HOME: Math.round(totalContacts * 0.10),
    };

    const contactTypeDistribution: Record<string, number> = {
      HOME_VISIT: Math.round(totalContacts * 0.30),
      STREET_VISIT: Math.round(totalContacts * 0.20),
      PHONE_CALL: Math.round(totalContacts * 0.15),
      LINE_CALL: Math.round(totalContacts * 0.10),
      MARKETPLACE: Math.round(totalContacts * 0.10),
      TEMPLE: Math.round(totalContacts * 0.08),
      EVENT: Math.round(totalContacts * 0.07),
    };

    const campaignBreakdown = userCampaigns.map((c) => ({
      campaignId: c.id,
      campaignName: c.name,
      city: c.city,
      district: c.district || null,
      village: c.village || null,
      electionType: c.electionType,
      isActive: true,
      voterCount: c.voterCount,
      contactCount: c.contactCount,
      contactRate: c.voterCount > 0 ? Math.round((c.contactCount / c.voterCount) * 1000) / 10 : 0,
      supportRate: c.voterCount > 0 ? Math.round((c.supportCount / c.voterCount) * 1000) / 10 : 0,
      stanceDistribution: {
        STRONG_SUPPORT: Math.round(c.voterCount * 0.08),
        SUPPORT: Math.round(c.voterCount * 0.18),
        LEAN_SUPPORT: Math.round(c.voterCount * 0.15),
        NEUTRAL: Math.round(c.voterCount * 0.20),
        UNDECIDED: Math.round(c.voterCount * 0.18),
        LEAN_OPPOSE: Math.round(c.voterCount * 0.08),
        OPPOSE: Math.round(c.voterCount * 0.08),
        STRONG_OPPOSE: Math.round(c.voterCount * 0.05),
      },
    }));

    return {
      summary: {
        totalCampaigns: userCampaigns.length,
        totalVoters,
        totalContacts,
        overallSupportRate: totalVoters > 0 ? Math.round((totalSupport / totalVoters) * 1000) / 10 : 0,
        overallContactRate: totalVoters > 0 ? Math.round((totalContacts / totalVoters) * 1000) / 10 : 0,
      },
      stanceDistribution,
      contactOutcomeDistribution,
      contactTypeDistribution,
      campaignBreakdown,
    };
  },
  suspendUser: async (id: string, _reason: string) => {
    await delay(200);
    const user = demoUsers.find((u) => u.id === id);
    if (user) user.isSuspended = true;
    return { message: '已停用帳號' };
  },
  activateUser: async (id: string) => {
    await delay(200);
    const user = demoUsers.find((u) => u.id === id);
    if (user) user.isSuspended = false;
    return { message: '已啟用帳號' };
  },
};

// ---- Demo 訂閱資料 ----
const demoSubscriptions = [
  {
    id: 'demo-sub-1',
    user: { id: 'demo-user-1', name: '王小明', email: 'xiaoming@example.com' },
    plan: { id: 'plan-pro', name: '專業版' },
    status: 'ACTIVE',
    currentPeriodEnd: new Date(Date.now() + 25 * 86400000).toISOString(),
    createdAt: '2025-12-01T08:00:00Z',
  },
  {
    id: 'demo-sub-2',
    user: { id: 'demo-user-2', name: '李美華', email: 'meihua@example.com' },
    plan: { id: 'plan-free', name: '免費試用' },
    status: 'TRIAL',
    currentPeriodEnd: new Date(Date.now() + 5 * 86400000).toISOString(),
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'demo-sub-3',
    user: { id: 'demo-user-3', name: '張志豪', email: 'zhihao@example.com' },
    plan: { id: 'plan-pro', name: '專業版' },
    status: 'CANCELLED',
    currentPeriodEnd: '2026-01-15T00:00:00Z',
    createdAt: '2025-09-10T14:00:00Z',
  },
  {
    id: 'demo-sub-4',
    user: { id: 'demo-user-4', name: '陳雅芳', email: 'yafang@example.com' },
    plan: { id: 'plan-pro', name: '專業版' },
    status: 'PAST_DUE',
    currentPeriodEnd: new Date(Date.now() - 3 * 86400000).toISOString(),
    createdAt: '2025-11-05T09:00:00Z',
  },
  {
    id: 'demo-sub',
    user: { id: 'demo-user-id', name: '示範使用者', email: 'demo@example.com' },
    plan: { id: 'plan-free', name: '免費試用' },
    status: 'TRIAL',
    currentPeriodEnd: new Date(Date.now() + 14 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export const demoAdminSubscriptionsApi = {
  getSubscriptions: async (params?: any) => {
    await delay(100);
    let filtered = [...demoSubscriptions];

    if (params?.status) {
      filtered = filtered.filter((s) => s.status === params.status);
    }
    if (params?.planCode) {
      filtered = filtered.filter((s) => s.plan.id === params.planCode);
    }



    return {
      data: filtered,
      pagination: { page: params?.page || 1, limit: params?.limit || 20, total: filtered.length, totalPages: 1 },
    };
  },
  getStats: async () => ({
    totalSubscriptions: demoSubscriptions.length,
    byStatus: {
      trial: demoSubscriptions.filter((s) => s.status === 'TRIAL').length,
      active: demoSubscriptions.filter((s) => s.status === 'ACTIVE').length,
      cancelled: demoSubscriptions.filter((s) => s.status === 'CANCELLED').length,
      expired: demoSubscriptions.filter((s) => s.status === 'EXPIRED').length,
      past_due: demoSubscriptions.filter((s) => s.status === 'PAST_DUE').length,
    },
    expiringIn7Days: demoSubscriptions.filter((s) => {
      if (!['TRIAL', 'ACTIVE'].includes(s.status)) return false;
      const daysLeft = (new Date(s.currentPeriodEnd).getTime() - Date.now()) / 86400000;
      return daysLeft >= 0 && daysLeft <= 7;
    }).length,
  }),
  getPlans: async () => demoPlans,
  getSubscription: async (id: string) => demoSubscriptions.find((s) => s.id === id) || null,
  updatePlan: async () => { throw new Error('示範模式不支援管理功能'); },
  extendTrial: async () => { throw new Error('示範模式不支援管理功能'); },
  cancelSubscription: async () => { throw new Error('示範模式不支援管理功能'); },
};

// ---- Demo 付款資料 ----
const demoPayments = [
  {
    id: 'demo-pay-1',
    subscription: {
      user: { id: 'demo-user-1', name: '王小明', email: 'xiaoming@example.com' },
      plan: { name: '專業版' },
    },
    amount: 1990,
    provider: 'ECPAY',
    status: 'COMPLETED',
    paidAt: '2026-01-15T10:30:00Z',
    refundedAt: null,
  },
  {
    id: 'demo-pay-2',
    subscription: {
      user: { id: 'demo-user-2', name: '李美華', email: 'meihua@example.com' },
      plan: { name: '專業版' },
    },
    amount: 1990,
    provider: 'NEWEBPAY',
    status: 'COMPLETED',
    paidAt: '2026-01-10T14:00:00Z',
    refundedAt: null,
  },
  {
    id: 'demo-pay-3',
    subscription: {
      user: { id: 'demo-user-4', name: '陳雅芳', email: 'yafang@example.com' },
      plan: { name: '專業版' },
    },
    amount: 1990,
    provider: 'ECPAY',
    status: 'FAILED',
    paidAt: null,
    refundedAt: null,
  },
  {
    id: 'demo-pay-4',
    subscription: {
      user: { id: 'demo-user-1', name: '王小明', email: 'xiaoming@example.com' },
      plan: { name: '專業版' },
    },
    amount: 1990,
    provider: 'STRIPE',
    status: 'REFUNDED',
    paidAt: '2025-12-01T09:00:00Z',
    refundedAt: '2025-12-05T16:00:00Z',
  },
];

export const demoAdminPaymentsApi = {
  getPayments: async (params?: any) => {
    await delay(100);
    let filtered = [...demoPayments];

    if (params?.status) {
      filtered = filtered.filter((p) => p.status === params.status);
    }
    if (params?.provider) {
      filtered = filtered.filter((p) => p.provider === params.provider);
    }



    return {
      data: filtered,
      pagination: { page: params?.page || 1, limit: params?.limit || 20, total: filtered.length, totalPages: 1 },
    };
  },
  getStats: async () => {
    const statusGroups = ['COMPLETED', 'PENDING', 'PROCESSING', 'FAILED', 'REFUNDED'];
    const byStatus = statusGroups
      .map((status) => {
        const items = demoPayments.filter((p) => p.status === status);
        return { status, count: items.length, amount: items.reduce((sum, p) => sum + p.amount, 0) };
      })
      .filter((s) => s.count > 0);

    return {
      totalRevenue: demoPayments.filter((p) => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0),
      byStatus,
    };
  },
  getPayment: async (id: string) => demoPayments.find((p) => p.id === id) || null,
  refundPayment: async () => { throw new Error('示範模式不支援管理功能'); },
};

export const demoAdminAnalyticsApi = {
  getOverview: async () => {
    const completedPayments = demoPayments.filter((p) => p.status === 'COMPLETED');
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const activeSubs = demoSubscriptions.filter((s) => ['ACTIVE', 'TRIAL'].includes(s.status)).length;
    return {
      totalUsers: demoUsers.length,
      userGrowth: 15.3,
      activeSubscriptions: activeSubs,
      conversionRate: demoUsers.length > 0 ? Math.round((activeSubs / demoUsers.length) * 100) : 0,
      monthlyRevenue: totalRevenue,
      revenueGrowth: 12.5,
      arpu: demoUsers.length > 0 ? Math.round(totalRevenue / demoUsers.length) : 0,
      churnRate: 8.3,
    };
  },
  getUserGrowth: async () => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return { month: d.toISOString().slice(0, 7), newUsers: Math.floor(Math.random() * 10) + 2, totalUsers: 30 + i * 5 };
    });
  },
  getRevenueReport: async () => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { month: d.toISOString().slice(0, 7), revenue: Math.floor(Math.random() * 5000) + 3000, transactions: Math.floor(Math.random() * 5) + 1 };
    });
  },
  getSubscriptionDistribution: async () => ({
    trial: demoSubscriptions.filter((s) => s.status === 'TRIAL').length,
    active: demoSubscriptions.filter((s) => s.status === 'ACTIVE').length,
    cancelled: demoSubscriptions.filter((s) => s.status === 'CANCELLED').length,
    pastDue: demoSubscriptions.filter((s) => s.status === 'PAST_DUE').length,
  }),
  getRecentActivity: async (_limit?: number) => {
    const limit = _limit || 5;
    return {
      newUsers: demoUsers
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
        .map((u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt })),
      newSubscriptions: demoSubscriptions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
        .map((s) => ({ id: s.id, user: { name: s.user.name }, plan: { name: s.plan.name }, status: s.status })),
      recentPayments: demoPayments
        .filter((p) => p.paidAt)
        .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime())
        .slice(0, limit)
        .map((p) => ({ id: p.id, subscription: { user: { name: p.subscription.user.name } }, paidAt: p.paidAt, amount: p.amount })),
    };
  },
  getRetentionAnalysis: async () => {
    return Array.from({ length: 6 }, (_, i) => ({
      cohort: `2025-${String(7 + i).padStart(2, '0')}`,
      month0: 100, month1: 85 - i * 3, month2: 70 - i * 5, month3: 60 - i * 4,
    }));
  },
  getActiveUserStats: async () => ({
    dau: Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10), count: Math.floor(Math.random() * 3) + 1 })),
    wau: Array.from({ length: 12 }, (_, i) => ({ week: `W${i + 1}`, count: Math.floor(Math.random() * 4) + 2 })),
    mau: Array.from({ length: 6 }, (_, i) => ({ month: new Date(Date.now() - (5 - i) * 30 * 86400000).toISOString().slice(0, 7), count: Math.floor(Math.random() * 5) + 3 })),
    dauMauRatio: 0.35,
  }),
  getSubscriptionLifecycle: async () => ({
    trialConversionRate: 40,
    avgTrialDays: 10.5,
    avgDurationMonths: 6.2,
    cancelReasons: [
      { reason: '價格因素', count: 3 },
      { reason: '功能不足', count: 2 },
      { reason: '競品替代', count: 1 },
    ],
    funnel: [
      { stage: '註冊', count: demoUsers.length },
      { stage: '試用', count: demoSubscriptions.filter((s) => s.status === 'TRIAL').length + 1 },
      { stage: '付費', count: demoSubscriptions.filter((s) => s.status === 'ACTIVE').length },
    ],
    totalTrialSubs: demoSubscriptions.filter((s) => s.status === 'TRIAL').length,
    convertedTrialSubs: 1,
  }),
  getGeographicDistribution: async () => [
    { city: '台北市', count: 2 },
    { city: '新北市', count: 1 },
    { city: '桃園市', count: 1 },
    { city: '台中市', count: 1 },
  ],
  getUserBehaviorAnalysis: async () => ({
    featureUsage: [
      { feature: '選民管理', usage: 85 },
      { feature: '接觸紀錄', usage: 72 },
      { feature: '行程規劃', usage: 60 },
      { feature: '地圖檢視', usage: 55 },
      { feature: '數據分析', usage: 40 },
    ],
    hourlyData: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: i >= 8 && i <= 22 ? Math.floor(Math.random() * 5) + 1 : 0 })),
    avgDaysToFirstCampaign: 2.3,
  }),
  getUserValueAnalysis: async () => ({
    ltvDistribution: [
      { range: '0-1000', count: 2 },
      { range: '1001-5000', count: 1 },
      { range: '5001+', count: 2 },
    ],
    valueTiers: [
      { tier: '高價值', count: 1, avgLtv: 12000 },
      { tier: '中價值', count: 2, avgLtv: 4000 },
      { tier: '低價值', count: 2, avgLtv: 500 },
    ],
    arpuTrend: Array.from({ length: 6 }, (_, i) => ({
      month: new Date(Date.now() - (5 - i) * 30 * 86400000).toISOString().slice(0, 7),
      arpu: 700 + i * 50,
    })),
    avgLtv: 5600,
    totalPaidUsers: 2,
  }),
  // 地區總覽
  getRegionalOverview: async (city?: string, _electionType?: string) => {
    await delay(200);
    const cityMap: Record<string, typeof demoCampaignsForAdmin> = {};
    demoCampaignsForAdmin.forEach((c) => {
      if (city && c.city !== city) return;
      if (!cityMap[c.city]) cityMap[c.city] = [];
      cityMap[c.city].push(c);
    });

    const regions = Object.entries(cityMap).map(([cityName, campaigns]) => {
      const userSet = new Set(campaigns.map((c) => c.ownerId));
      const totalVoters = campaigns.reduce((s, c) => s + c.voterCount, 0);
      const totalContacts = campaigns.reduce((s, c) => s + c.contactCount, 0);
      const totalSupport = campaigns.reduce((s, c) => s + c.supportCount, 0);

      const userMap: Record<string, any> = {};
      campaigns.forEach((c) => {
        if (!userMap[c.ownerId]) {
          const user = demoUsers.find((u) => u.id === c.ownerId);
          userMap[c.ownerId] = {
            userId: c.ownerId,
            userName: user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
            campaigns: [],
            totalVoters: 0,
            totalContacts: 0,
            supportRate: 0,
            contactRate: 0,
            subscriptionStatus: user?.subscriptions?.[0]?.status || '無訂閱',
          };
        }
        const u = userMap[c.ownerId];
        u.totalVoters += c.voterCount;
        u.totalContacts += c.contactCount;
        u.campaigns.push({
          campaignId: c.id,
          campaignName: c.name,
          electionType: c.electionType,
          district: c.district,
          village: c.village,
          isActive: true,
          voterCount: c.voterCount,
          contactCount: c.contactCount,
          contactRate: c.voterCount > 0 ? Math.round((c.contactCount / c.voterCount) * 1000) / 10 : 0,
          supportRate: c.voterCount > 0 ? Math.round((c.supportCount / c.voterCount) * 1000) / 10 : 0,
          stanceDistribution: {
            STRONG_SUPPORT: Math.round(c.voterCount * 0.08),
            SUPPORT: Math.round(c.voterCount * 0.18),
            LEAN_SUPPORT: Math.round(c.voterCount * 0.15),
            NEUTRAL: Math.round(c.voterCount * 0.20),
            UNDECIDED: Math.round(c.voterCount * 0.18),
            LEAN_OPPOSE: Math.round(c.voterCount * 0.08),
            OPPOSE: Math.round(c.voterCount * 0.08),
            STRONG_OPPOSE: Math.round(c.voterCount * 0.05),
          },
          contactOutcomeDistribution: {
            POSITIVE: Math.round(c.contactCount * 0.35),
            NEUTRAL: Math.round(c.contactCount * 0.30),
            NEGATIVE: Math.round(c.contactCount * 0.10),
            NO_RESPONSE: Math.round(c.contactCount * 0.15),
            NOT_HOME: Math.round(c.contactCount * 0.10),
          },
        });
      });

      Object.values(userMap).forEach((u: any) => {
        const userSupport = u.campaigns.reduce((s: number, c: any) => {
          const sd = c.stanceDistribution;
          return s + (sd.STRONG_SUPPORT || 0) + (sd.SUPPORT || 0) + (sd.LEAN_SUPPORT || 0);
        }, 0);
        u.supportRate = u.totalVoters > 0 ? Math.round((userSupport / u.totalVoters) * 1000) / 10 : 0;
        u.contactRate = u.totalVoters > 0 ? Math.round((u.totalContacts / u.totalVoters) * 1000) / 10 : 0;
      });

      return {
        city: cityName,
        summary: {
          totalCampaigns: campaigns.length,
          totalUsers: userSet.size,
          totalVoters,
          totalContacts,
          overallSupportRate: totalVoters > 0 ? Math.round((totalSupport / totalVoters) * 1000) / 10 : 0,
          overallContactRate: totalVoters > 0 ? Math.round((totalContacts / totalVoters) * 1000) / 10 : 0,
        },
        users: Object.values(userMap),
      };
    });

    regions.sort((a, b) => b.summary.totalUsers - a.summary.totalUsers);
    return { regions };
  },
};

export const demoAdminPlansApi = {
  getPlans: async () => demoPlans,
  createPlan: async () => { throw new Error('示範模式不支援管理功能'); },
  updatePlan: async () => { throw new Error('示範模式不支援管理功能'); },
  deactivatePlan: async () => { throw new Error('示範模式不支援管理功能'); },
};

// ---- Demo 推薦資料 ----
const demoReferrals = [
  {
    id: 'demo-ref-1',
    referrer: { id: 'demo-user-1', name: '王小明', email: 'xiaoming@example.com', phone: '0912-345-678', avatarUrl: null },
    referred: { id: 'demo-user-2', name: '李美華', email: 'meihua@example.com', phone: '0923-456-789', avatarUrl: null },
    referralCode: 'WANG2026',
    status: 'COMPLETED',
    rewardMonths: 1,
    createdAt: '2025-12-20T08:00:00Z',
  },
  {
    id: 'demo-ref-2',
    referrer: { id: 'demo-user-2', name: '李美華', email: 'meihua@example.com', phone: '0923-456-789', avatarUrl: null },
    referred: { id: 'demo-user-3', name: '張志豪', email: 'zhihao@example.com', phone: '0934-567-890', avatarUrl: null },
    referralCode: 'LEE2026',
    status: 'PENDING',
    rewardMonths: 0,
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'demo-ref-3',
    referrer: { id: 'demo-user-1', name: '王小明', email: 'xiaoming@example.com', phone: '0912-345-678', avatarUrl: null },
    referred: { id: 'demo-user-4', name: '陳雅芳', email: 'yafang@example.com', phone: '0945-678-901', avatarUrl: null },
    referralCode: 'WANG2026',
    status: 'EXPIRED',
    rewardMonths: 0,
    createdAt: '2025-10-01T14:00:00Z',
  },
  {
    id: 'demo-ref-4',
    referrer: { id: 'demo-user-id', name: '示範使用者', email: 'demo@example.com', phone: '0912345678', avatarUrl: null },
    referred: { id: 'demo-user-1', name: '王小明', email: 'xiaoming@example.com', phone: '0912-345-678', avatarUrl: null },
    referralCode: 'DEMO1234',
    status: 'COMPLETED',
    rewardMonths: 1,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-ref-5',
    referrer: { id: 'demo-user-id', name: '示範使用者', email: 'demo@example.com', phone: '0912345678', avatarUrl: null },
    referred: { id: 'demo-user-5', name: '李小華', email: 'xiaohua@example.com', phone: '0956-789-012', avatarUrl: null },
    referralCode: 'DEMO1234',
    status: 'PENDING',
    rewardMonths: 0,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const demoAdminReferralsApi = {
  getReferrals: async (params?: any) => {
    await delay(100);
    let filtered = [...demoReferrals];

    if (params?.status) {
      filtered = filtered.filter((r) => r.status === params.status);
    }
    if (params?.startDate) {
      const start = new Date(params.startDate).getTime();
      filtered = filtered.filter((r) => new Date(r.createdAt).getTime() >= start);
    }
    if (params?.endDate) {
      const end = new Date(params.endDate).getTime();
      filtered = filtered.filter((r) => new Date(r.createdAt).getTime() <= end);
    }



    return {
      data: filtered,
      pagination: { page: params?.page || 1, limit: params?.limit || 20, total: filtered.length, totalPages: 1 },
    };
  },
  getStats: async () => {
    const completed = demoReferrals.filter((r) => r.status === 'COMPLETED').length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisMonth = demoReferrals.filter((r) => new Date(r.createdAt).getTime() >= monthStart);
    return {
      totalReferrals: demoReferrals.length,
      completedReferrals: completed,
      pendingReferrals: demoReferrals.filter((r) => r.status === 'PENDING').length,
      expiredReferrals: demoReferrals.filter((r) => r.status === 'EXPIRED').length,
      conversionRate: demoReferrals.length > 0 ? Math.round((completed / demoReferrals.length) * 100) : 0,
      totalRewardMonths: demoReferrals.filter((r) => r.status === 'COMPLETED').reduce((sum, r) => sum + r.rewardMonths, 0),
      thisMonthReferrals: thisMonth.length,
      thisMonthCompleted: thisMonth.filter((r) => r.status === 'COMPLETED').length,
    };
  },
  getLeaderboard: async (limit?: number) => {
    const referrerMap = new Map<string, any>();
    for (const ref of demoReferrals) {
      const key = ref.referrer.id;
      if (!referrerMap.has(key)) {
        referrerMap.set(key, { user: ref.referrer, completed: 0, total: 0, rewardMonths: 0 });
      }
      const entry = referrerMap.get(key)!;
      entry.total++;
      if (ref.status === 'COMPLETED') {
        entry.completed++;
        entry.rewardMonths += ref.rewardMonths;
      }
    }
    const board = Array.from(referrerMap.values())
      .sort((a, b) => b.completed - a.completed)
      .map((entry, i) => ({
        rank: i + 1,
        user: { id: entry.user.id, name: entry.user.name, avatarUrl: entry.user.avatarUrl },
        completedReferrals: entry.completed,
        totalRewardMonths: entry.rewardMonths,
        totalReferrals: entry.total,
      }));
    return limit ? board.slice(0, limit) : board;
  },
  expireOld: async () => ({ expired: 0 }),
};

export const demoPromoters = [
  {
    id: 'demo-promoter-id',
    name: '示範推廣者',
    type: 'INTERNAL',
    status: 'ACTIVE',
    referralCode: 'DEMO1234',
    isActive: true,
    successCount: 15,
    trialConvertedCount: 5,
    totalReward: 15000,
    _count: { trialInvites: 18 },
    rewardConfig: { rewardType: 'COMMISSION', percentage: 10 },
    trialConfig: { canIssueTrial: true, defaultTrialDays: 14 },
    createdAt: '2024-06-01T08:00:00Z',
  },
  {
    id: 'demo-promoter-1',
    name: '王大同',
    type: 'INTERNAL',
    status: 'ACTIVE',
    referralCode: 'WANG01',
    isActive: true,
    successCount: 8,
    trialConvertedCount: 3,
    totalReward: 8000,
    _count: { trialInvites: 12 },
    rewardConfig: { rewardType: 'COMMISSION', percentage: 10 },
    trialConfig: { canIssueTrial: true, defaultTrialDays: 14 },
    createdAt: '2025-09-15T08:00:00Z',
  },
  {
    id: 'demo-promoter-2',
    name: '林美玲',
    type: 'EXTERNAL',
    status: 'ACTIVE',
    referralCode: 'LIN001',
    isActive: true,
    successCount: 15,
    trialConvertedCount: 5,
    totalReward: 15000,
    _count: { trialInvites: 20 },
    rewardConfig: { rewardType: 'FIXED', amount: 500 },
    trialConfig: { canIssueTrial: true, defaultTrialDays: 7 },
    createdAt: '2025-10-01T10:00:00Z',
  },
  {
    id: 'demo-promoter-3',
    name: '陳建志',
    type: 'INTERNAL',
    status: 'PENDING',
    referralCode: 'CHEN01',
    isActive: false,
    successCount: 0,
    trialConvertedCount: 0,
    totalReward: 0,
    _count: { trialInvites: 0 },
    rewardConfig: null,
    trialConfig: null,
    createdAt: '2026-01-20T14:00:00Z',
  },
  {
    id: 'demo-promoter-4',
    name: '黃志偉',
    type: 'EXTERNAL',
    status: 'SUSPENDED',
    referralCode: 'HUANG1',
    isActive: false,
    successCount: 2,
    trialConvertedCount: 1,
    totalReward: 1000,
    _count: { trialInvites: 5 },
    rewardConfig: { rewardType: 'COMMISSION', percentage: 8 },
    trialConfig: { canIssueTrial: false, defaultTrialDays: 14 },
    createdAt: '2025-08-10T09:00:00Z',
  },
  {
    id: 'demo-promoter-ext',
    name: '張志豪',
    type: 'EXTERNAL',
    status: 'SUSPENDED',
    referralCode: 'ZH2026',
    isActive: false,
    successCount: 1,
    trialConvertedCount: 0,
    totalReward: 500,
    _count: { trialInvites: 2 },
    rewardConfig: { rewardType: 'COMMISSION', percentage: 8 },
    trialConfig: { canIssueTrial: false, defaultTrialDays: 14 },
    createdAt: '2026-01-05T14:00:00Z',
  },
];

export const demoAdminPromotersApi = {
  getPromoters: async (params?: any) => {
    await delay(100);
    let filtered = [...demoPromoters];

    if (params?.type) {
      filtered = filtered.filter((p) => p.type === params.type);
    }
    if (params?.status) {
      filtered = filtered.filter((p) => p.status === params.status);
    }
    if (params?.search) {
      const keyword = params.search.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(keyword) || p.referralCode.toLowerCase().includes(keyword)
      );
    }



    return {
      data: filtered,
      pagination: { page: params?.page || 1, limit: params?.limit || 15, total: filtered.length, totalPages: 1 },
    };
  },
  getPromoter: async (id: string) => demoPromoters.find((p) => p.id === id) || null,
  createPromoter: async () => { throw new Error('示範模式不支援管理功能'); },
  updatePromoter: async () => { throw new Error('示範模式不支援管理功能'); },
  approvePromoter: async () => { throw new Error('示範模式不支援管理功能'); },
  rejectPromoter: async () => { throw new Error('示範模式不支援管理功能'); },
  suspendPromoter: async () => { throw new Error('示範模式不支援管理功能'); },
  activatePromoter: async () => { throw new Error('示範模式不支援管理功能'); },
  updateRewardConfig: async () => { throw new Error('示範模式不支援管理功能'); },
  updateTrialConfig: async () => { throw new Error('示範模式不支援管理功能'); },
  getPromoterReferrals: async () => ({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
  getPromoterTrialInvites: async () => ({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
  getPromoterShareLinks: async () => [],
  getOverviewStats: async () => ({
    totalPromoters: demoPromoters.length,
    activePromoters: demoPromoters.filter((p) => p.status === 'ACTIVE').length,
    pendingPromoters: demoPromoters.filter((p) => p.status === 'PENDING').length,
    monthSuccess: 5,
    conversionRate: 31.3,
    totalReward: demoPromoters.reduce((sum, p) => sum + p.totalReward, 0),
  }),
  getFunnelStats: async () => ({
    clicked: 320,
    registered: 80,
    trial: 35,
    subscribed: 25,
    renewed: 10,
  }),
  getChannelStats: async () => [],
  getLeaderboard: async (limit?: number) => {
    const board = demoPromoters
      .filter((p) => p.status === 'ACTIVE')
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        referralCode: p.referralCode,
        successCount: p.successCount,
        trialConverted: p.trialConvertedCount,
        totalReward: p.totalReward,
      }))
      .sort((a, b) => (b.successCount + b.trialConverted) - (a.successCount + a.trialConverted));
    return limit ? board.slice(0, limit) : board;
  },
  getPendingPromoters: async () => demoPromoters.filter((p) => p.status === 'PENDING'),
  getAllTrialInvites: async () => ({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
  getTrialStats: async () => ({
    total: demoPromoters.reduce((sum, p) => sum + (p._count?.trialInvites || 0), 0),
    activated: 10,
    converted: demoPromoters.reduce((sum, p) => sum + p.trialConvertedCount, 0),
    conversionRate: 44.4,
  }),
  cancelTrialInvite: async () => { throw new Error('示範模式不支援管理功能'); },
  extendTrialInvite: async () => { throw new Error('示範模式不支援管理功能'); },
};

export const demoAdminDataRetentionApi = {
  getStats: async () => ({ pendingDeletion: 0, deleted: 0, totalData: 0 }),
  getPendingCampaigns: async () => [],
  getDeletedCampaigns: async () => [],
  restoreCampaign: async () => { throw new Error('示範模式不支援管理功能'); },
  deleteCampaign: async () => { throw new Error('示範模式不支援管理功能'); },
  hardDelete: async () => { throw new Error('示範模式不支援管理功能'); },
  batchDelete: async () => { throw new Error('示範模式不支援管理功能'); },
};

// 推廣者自助 API（Demo）
export const demoPromoterSelfApi = {
  getProfile: async () => ({
    id: 'demo-promoter-id',
    name: '示範推廣者',
    referralCode: 'DEMO1234',
    type: 'INTERNAL',
    status: 'APPROVED',
    isActive: true,
    createdAt: new Date().toISOString(),
    rewardConfig: {
      rewardType: 'COMMISSION',
      percentage: 10,
      maxRewardsPerMonth: 50,
    },
    trialConfig: {
      canIssueTrial: true,
      minTrialDays: 7,
      maxTrialDays: 30,
      defaultTrialDays: 14,
      monthlyIssueLimit: 20,
      totalIssueLimit: null,
    },
  }),
  getStats: async () => ({
    totalReferrals: 45,
    clickedCount: 120,
    registeredCount: 30,
    subscribedCount: 12,
    renewedCount: 3,
    successCount: 15,
    conversionRate: 33.3,
    totalReward: 15000,
    totalShareLinks: 8,
    totalClicks: 320,
    totalTrials: 18,
    trialActivated: 10,
    trialConverted: 5,
    trend: Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return {
        date: d.toISOString().split('T')[0],
        total: Math.floor(Math.random() * 5) + 1,
        success: Math.floor(Math.random() * 2),
      };
    }),
  }),
  getReferrals: async (params?: any) => ({
    data: Array.from({ length: 5 }, (_, i) => ({
      id: `ref-${i}`,
      referredUser: { id: `user-${i}`, name: `推薦使用者 ${i + 1}`, avatarUrl: null },
      status: ['CLICKED', 'REGISTERED', 'SUBSCRIBED', 'RENEWED', 'REGISTERED'][i],
      channel: ['LINE', 'FACEBOOK', 'SMS', 'QR_CODE', 'EMAIL'][i],
      shareLink: { channel: ['LINE', 'FACEBOOK', 'SMS', 'QR_CODE', 'EMAIL'][i], code: `SL${i}` },
      rewardAmount: i < 3 ? (i + 1) * 500 : null,
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      registeredAt: i > 0 ? new Date(Date.now() - (i - 1) * 86400000).toISOString() : null,
      subscribedAt: i === 2 ? new Date(Date.now() - 86400000).toISOString() : null,
    })),
    pagination: { page: 1, limit: 20, total: 5, totalPages: 1 },
  }),
  getShareLinks: async () => Array.from({ length: 4 }, (_, i) => ({
    id: `sl-${i}`,
    code: `SHARE${i}ABC`,
    channel: ['LINE', 'FACEBOOK', 'QR_CODE', 'DIRECT_LINK'][i],
    targetUrl: null,
    clickCount: Math.floor(Math.random() * 100) + 10,
    isActive: true,
    createdAt: new Date(Date.now() - i * 7 * 86400000).toISOString(),
    _count: {
      clicks: Math.floor(Math.random() * 100) + 10,
      referrals: Math.floor(Math.random() * 10),
    },
  })),
  createShareLink: async (data: any) => ({
    id: 'new-sl',
    code: 'NEW' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    channel: data.channel,
    targetUrl: data.targetUrl,
    clickCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    _count: { clicks: 0, referrals: 0 },
  }),
  getTrialInvites: async (params?: any) => ({
    data: Array.from({ length: 4 }, (_, i) => ({
      id: `trial-${i}`,
      code: `TRIAL${i}XY`,
      trialDays: [7, 14, 14, 30][i],
      inviteMethod: ['LINK', 'CODE', 'DIRECT', 'LINK'][i],
      inviteeName: i < 3 ? `受邀者 ${i + 1}` : null,
      status: ['PENDING', 'ACTIVATED', 'CONVERTED', 'EXPIRED'][i],
      activatedUser: i > 0 ? { id: `u-${i}`, name: `試用者 ${i}`, avatarUrl: null } : null,
      plan: { id: 'plan-1', name: '專業方案' },
      createdAt: new Date(Date.now() - i * 5 * 86400000).toISOString(),
      activatedAt: i > 0 ? new Date(Date.now() - (i - 1) * 5 * 86400000).toISOString() : null,
      expiresAt: i > 0 ? new Date(Date.now() + (30 - i * 10) * 86400000).toISOString() : null,
    })),
    pagination: { page: 1, limit: 20, total: 4, totalPages: 1 },
  }),
  createTrialInvite: async (data: any) => ({
    id: 'new-trial',
    code: 'T' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    trialDays: data.trialDays,
    inviteMethod: data.inviteMethod,
    inviteeName: data.inviteeName,
    status: 'PENDING',
    plan: { id: 'plan-1', name: '專業方案' },
    createdAt: new Date().toISOString(),
  }),
};

// Role Invites Demo API（QR 邀請碼）
export const demoRoleInvitesApi = {
  generate: async (data: { role: 'ADMIN' | 'PROMOTER'; expiresInHours?: number; notes?: string }) => {
    await delay(300);
    const hours = data.expiresInHours || 24;
    // 產生一個假的 JWT 格式 token（base64 編碼的 JSON）
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      type: 'role-invite',
      role: data.role,
      createdBy: 'demo-super-admin',
      notes: data.notes,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + hours * 3600,
    }));
    const signature = btoa('demo-signature');
    const token = `${header}.${payload}.${signature}`;
    return {
      token,
      expiresAt: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
      role: data.role,
    };
  },
  claimInvite: async (_token: string) => {
    await delay(300);
    return {
      message: '已成功取得角色（示範模式）',
      role: 'ADMIN',
      user: {
        id: 'demo-user',
        name: '示範使用者',
        isAdmin: true,
        isSuperAdmin: false,
        promoter: null,
      },
    };
  },
};
