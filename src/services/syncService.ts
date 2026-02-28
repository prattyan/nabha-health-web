import { StorageService } from './storageService';
import { ApiClient } from './apiClient';

type SyncEntity = 'Appointment' | 'PharmacyInventoryItem';
type SyncAction = 'upsert' | 'delete';

type ExtendedSyncEntity = SyncEntity | 'EhrRecord' | 'Prescription' | 'AiTriageLog' | 'FollowUpVisit';

export type SyncOp = {
  opId: string;
  entity: ExtendedSyncEntity;
  action: SyncAction;
  entityId?: string;
  baseVersion?: number;
  data?: unknown;
  clientTimestamp?: number;
};

const DEVICE_ID_KEY = 'nabhacare_device_id';
const QUEUE_KEY = 'nabhacare_sync_ops_v1';
const LAST_PULL_KEY = 'nabhacare_sync_last_pull';
const CONFLICTS_KEY = 'nabhacare_sync_conflicts_v1';

export class SyncService {
  private static instance: SyncService;
  private storage = StorageService.getInstance();
  private api = ApiClient.getInstance();
  private timer: number | null = null;
  private onlineHandler: (() => void) | null = null;
  private isProcessing = false;

  static getInstance(): SyncService {
    if (!SyncService.instance) SyncService.instance = new SyncService();
    return SyncService.instance;
  }

  private getDeviceId(): string {
    let id = this.storage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      this.storage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  private readQueue(): SyncOp[] {
    const raw = this.storage.getItem(QUEUE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as SyncOp[]) : [];
    } catch {
      return [];
    }
  }

  private writeQueue(queue: SyncOp[]) {
    this.storage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  enqueue(op: Omit<SyncOp, 'opId' | 'clientTimestamp'> & { opId?: string }): string {
    const queue = this.readQueue();
    const opId = op.opId ?? crypto.randomUUID();
    queue.push({
      opId,
      entity: op.entity,
      action: op.action,
      entityId: op.entityId,
      baseVersion: op.baseVersion,
      data: op.data,
      clientTimestamp: Date.now()
    });
    this.writeQueue(queue);
    return opId;
  }

  start() {
    if (this.timer !== null) return;
    const tick = () => {
      // Opt-out of sync if page is hidden to save bandwidth/battery
      if (document.hidden) return;
      this.process().catch(() => undefined);
    };
    this.onlineHandler = tick;
    window.addEventListener('online', tick);
    // Increase sync interval to 30s to reduce network usage
    this.timer = window.setInterval(tick, 30000);
    tick();
  }

  stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
  }

  async process(): Promise<void> {
    if (!navigator.onLine || this.isProcessing) return;
    // ApiClient uses StorageService which is now sync (backed by memory), so this works
    if (!this.api.getAccessToken()) return;

    this.isProcessing = true;
    try {
      await this.pushQueue();
      await this.pullDeltas();
    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async pushQueue(): Promise<void> {
    // Take a snapshot of items to send
    const queueSnapshot = this.readQueue();
    if (!queueSnapshot.length) return;

    const deviceId = this.getDeviceId();
    try {
      const res = await this.api.post<{
        applied: { opId: string; entityId: string; newVersion: number }[];
        conflicts: { opId: string; entityId: string; serverVersion: number; reason: string; serverData?: unknown }[];
      }>(
        '/sync/push',
        { deviceId, ops: queueSnapshot }
      );

      const appliedIds = new Set(res.applied.map((a) => a.opId));
      const conflictIds = new Set(res.conflicts.map((c) => c.opId));
      
      // CRITICAL: Re-read queue to ensure we don't drop items added during the request
      const currentQueue = this.readQueue();
      
      // Keep items that were NOT processed in this batch
      // (This handles items added during sync AND items that failed/weren't processed)
      const remaining = currentQueue.filter((q) => !(appliedIds.has(q.opId) || conflictIds.has(q.opId)));
      
      this.writeQueue(remaining);

      if (res.conflicts.length) {
        const existingRaw = this.storage.getItem(CONFLICTS_KEY);
        const existing = existingRaw ? (JSON.parse(existingRaw) as unknown[]) : [];
        this.storage.setItem(CONFLICTS_KEY, JSON.stringify([...existing, ...res.conflicts]));
      }
    } catch (e) {
      console.error("Push queue failed", e);
    }
  }

  private async pullDeltas(): Promise<void> {
    const deviceId = this.getDeviceId();
    const since = this.storage.getItem(LAST_PULL_KEY) ?? undefined;
    const qs = since ? `?deviceId=${encodeURIComponent(deviceId)}&since=${encodeURIComponent(since)}` : `?deviceId=${encodeURIComponent(deviceId)}`;
    
    try {
        const res = await this.api.get<{
        serverTime: string;
        appointments: unknown[];
        inventory: unknown[];
        records?: unknown[];
        prescriptions?: unknown[];
        triageLogs?: unknown[];
        followups?: unknown[];
        }>(`/sync/pull${qs}`);

        this.storage.setItem(LAST_PULL_KEY, res.serverTime);

        if (Array.isArray(res.appointments)) {
             this.mergeByKey('nabhacare_appointments', res.appointments, 'id', 'updatedAt');
        }
        if (Array.isArray(res.records)) {
             this.mergeByKey('nabhacare_health_records', res.records, 'id', 'updatedAt');
        }
        if (Array.isArray(res.prescriptions)) {
             this.mergeByKey('nabhacare_prescriptions', res.prescriptions, 'id', 'updatedAt');
        }
        if (Array.isArray(res.triageLogs)) {
             this.mergeByKey('nabhacare_triage_logs', res.triageLogs, 'id', 'createdAt');
        }
        if (Array.isArray(res.followups)) {
             this.mergeByKey('nabhacare_followups', res.followups, 'id', 'updatedAt');
        }
        if (Array.isArray(res.inventory)) {
             this.mergeByKey('nabha_inventory', res.inventory, 'sku', 'lastUpdated');
        }
    } catch (e) {
        console.error("Pull deltas failed", e);
    }
  }

  private mergeByKey(storageKey: string, incoming: unknown[], keyField: string, updatedField: string) {
    const raw = this.storage.getItem(storageKey);
    const existing: unknown[] = raw ? JSON.parse(raw) : [];
    const map = new Map<string, unknown>();
    for (const item of existing) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      const key = rec[keyField];
      if (typeof key === 'string') map.set(key, item);
    }
    for (const item of incoming) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      const key = rec[keyField];
      if (typeof key !== 'string') continue;
      const prev = map.get(key) as Record<string, unknown> | undefined;
      if (!prev) {
        map.set(key, item);
        continue;
      }
      const prevUpdated = (prev[updatedField] as string) || '';
      const nextUpdated = (rec[updatedField] as string) || '';
      map.set(key, nextUpdated >= prevUpdated ? item : prev);
    }
    this.storage.setItem(storageKey, JSON.stringify(Array.from(map.values())));
  }
}
