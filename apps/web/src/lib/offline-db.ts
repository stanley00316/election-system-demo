import Dexie, { Table } from 'dexie';

// 離線資料庫 Schema
export interface OfflineVoter {
  id: string;
  campaignId: string;
  name: string;
  phone?: string;
  address?: string;
  stance: string;
  influenceScore: number;
  syncedAt?: Date;
}

export interface OfflineContact {
  id: string;
  localId?: string;
  voterId: string;
  campaignId: string;
  type: string;
  outcome: string;
  contactDate: Date;
  notes?: string;
  synced: boolean;
  createdAt: Date;
}

export interface PendingSync {
  id: string;
  type: 'contact' | 'voter';
  action: 'create' | 'update' | 'delete';
  data: any;
  createdAt: Date;
  retryCount: number;
}

class ElectionOfflineDB extends Dexie {
  voters!: Table<OfflineVoter>;
  contacts!: Table<OfflineContact>;
  pendingSync!: Table<PendingSync>;

  constructor() {
    super('ElectionOfflineDB');
    
    this.version(1).stores({
      voters: 'id, campaignId, name, stance, influenceScore',
      contacts: 'id, localId, voterId, campaignId, synced, createdAt',
      pendingSync: 'id, type, action, createdAt',
    });
  }
}

export const offlineDb = new ElectionOfflineDB();

// 離線同步管理
export class OfflineSyncManager {
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  private handleOnline() {
    this.isOnline = true;
    this.syncPendingData();
  }

  private handleOffline() {
    this.isOnline = false;
  }

  // 快取選民資料（供離線使用）
  async cacheVoters(campaignId: string, voters: OfflineVoter[]) {
    await offlineDb.voters.bulkPut(
      voters.map(v => ({
        ...v,
        syncedAt: new Date(),
      }))
    );
  }

  // 取得快取的選民（離線時）
  async getCachedVoters(campaignId: string) {
    return offlineDb.voters
      .where('campaignId')
      .equals(campaignId)
      .toArray();
  }

  // 建立離線接觸紀錄
  async createOfflineContact(contact: Omit<OfflineContact, 'synced' | 'createdAt'>) {
    const offlineContact: OfflineContact = {
      ...contact,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      synced: false,
      createdAt: new Date(),
    };

    await offlineDb.contacts.add(offlineContact);

    // 如果在線上，嘗試同步
    if (this.isOnline) {
      await this.syncContact(offlineContact);
    } else {
      // 加入待同步佇列
      await offlineDb.pendingSync.add({
        id: offlineContact.localId!,
        type: 'contact',
        action: 'create',
        data: offlineContact,
        createdAt: new Date(),
        retryCount: 0,
      });
    }

    return offlineContact;
  }

  // 同步單一接觸紀錄
  private async syncContact(contact: OfflineContact) {
    try {
      // 呼叫 API 建立紀錄
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          voterId: contact.voterId,
          campaignId: contact.campaignId,
          type: contact.type,
          outcome: contact.outcome,
          contactDate: contact.contactDate,
          notes: contact.notes,
        }),
      });

      if (response.ok) {
        const serverContact = await response.json();
        
        // 更新本地紀錄
        await offlineDb.contacts.update(contact.localId!, {
          id: serverContact.id,
          synced: true,
        });

        // 從待同步佇列移除
        await offlineDb.pendingSync.delete(contact.localId!);

        return serverContact;
      }
    } catch (error) {
      console.error('Failed to sync contact:', error);
    }
  }

  // 同步所有待同步資料
  async syncPendingData() {
    if (!this.isOnline) return;

    const pendingItems = await offlineDb.pendingSync.toArray();

    for (const item of pendingItems) {
      try {
        if (item.type === 'contact' && item.action === 'create') {
          await this.syncContact(item.data);
        }

        // 增加重試次數
        if (item.retryCount < 3) {
          await offlineDb.pendingSync.update(item.id, {
            retryCount: item.retryCount + 1,
          });
        } else {
          // 超過重試次數，移除
          await offlineDb.pendingSync.delete(item.id);
        }
      } catch (error) {
        console.error('Failed to sync item:', item, error);
      }
    }
  }

  // 取得待同步項目數量
  async getPendingSyncCount() {
    return offlineDb.pendingSync.count();
  }

  // 清除所有快取
  async clearCache() {
    await offlineDb.voters.clear();
    await offlineDb.contacts.clear();
    await offlineDb.pendingSync.clear();
  }
}

export const syncManager = new OfflineSyncManager();
