import { StorageService } from './storageService';
import { SyncService } from './syncService';
import type { FollowUpVisit } from '../types/followup';

const FOLLOWUPS_STORAGE_KEY = 'nabhacare_followups';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export class FollowUpService {
  private static instance: FollowUpService;
  private storage = StorageService.getInstance();
  private sync = SyncService.getInstance();

  static getInstance(): FollowUpService {
    if (!FollowUpService.instance) FollowUpService.instance = new FollowUpService();
    return FollowUpService.instance;
  }

  getVisits(): FollowUpVisit[] {
    const raw = this.storage.getItem(FOLLOWUPS_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as FollowUpVisit[]) : [];
    } catch {
      return [];
    }
  }

  private saveVisits(visits: FollowUpVisit[]) {
    this.storage.setItem(FOLLOWUPS_STORAGE_KEY, JSON.stringify(visits));
  }

  createVisit(params: Omit<FollowUpVisit, 'id' | 'createdAt' | 'updatedAt' | 'version'>): FollowUpVisit {
    const nowIso = new Date().toISOString();
    const visits = this.getVisits();
    const visit: FollowUpVisit = {
      ...params,
      id: generateId(),
      createdAt: nowIso,
      updatedAt: nowIso,
      version: 1
    };
    visits.push(visit);
    this.saveVisits(visits);

    this.sync.enqueue({
      entity: 'FollowUpVisit',
      action: 'upsert',
      entityId: visit.id,
      baseVersion: visit.version,
      data: visit
    });
    this.sync.process().catch(() => undefined);

    return visit;
  }

  updateVisit(id: string, updates: Partial<FollowUpVisit>): FollowUpVisit | null {
    const visits = this.getVisits();
    const idx = visits.findIndex((v) => v.id === id);
    if (idx === -1) return null;

    const baseVersion = visits[idx].version;
    visits[idx] = {
      ...visits[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveVisits(visits);

    this.sync.enqueue({
      entity: 'FollowUpVisit',
      action: 'upsert',
      entityId: id,
      baseVersion,
      data: visits[idx]
    });
    this.sync.process().catch(() => undefined);

    return visits[idx];
  }
}
