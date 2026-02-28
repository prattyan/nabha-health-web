import { StorageService } from './storageService';
import { SyncService } from './syncService';
import type { PredictionResult } from './aiSymptomService';
import type { TriageLog, TriageSeverity } from '../types/triage';

const TRIAGE_LOGS_STORAGE_KEY = 'nabhacare_triage_logs';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function computeSeverity(results: PredictionResult[]): TriageSeverity {
  const maxProb = results.reduce((m, r) => Math.max(m, r.probability), 0);
  if (maxProb >= 0.85) return 'urgent';
  if (maxProb >= 0.7) return 'high';
  if (maxProb >= 0.5) return 'medium';
  return 'low';
}

export class TriageLogService {
  private static instance: TriageLogService;
  private storage = StorageService.getInstance();
  private sync = SyncService.getInstance();

  static getInstance(): TriageLogService {
    if (!TriageLogService.instance) TriageLogService.instance = new TriageLogService();
    return TriageLogService.instance;
  }

  getLogs(): TriageLog[] {
    const raw = this.storage.getItem(TRIAGE_LOGS_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as TriageLog[]) : [];
    } catch {
      return [];
    }
  }

  private saveLogs(logs: TriageLog[]) {
    this.storage.setItem(TRIAGE_LOGS_STORAGE_KEY, JSON.stringify(logs));
  }

  recordTriage(params: {
    patientId?: string;
    patientName?: string;
    village?: string;
    symptoms: string[];
    results: PredictionResult[];
    latencyMs?: number;
    source?: string;
  }): TriageLog {
    const nowIso = new Date().toISOString();
    const logs = this.getLogs();

    const id = generateId();
    const severity = computeSeverity(params.results);

    const log: TriageLog = {
      id,
      patientId: params.patientId,
      symptoms: params.symptoms,
      severity,
      village: params.village,
      patientName: params.patientName,
      result: {
        results: params.results,
        severity,
        village: params.village,
        patientName: params.patientName
      },
      latencyMs: params.latencyMs,
      source: params.source,
      createdAt: nowIso
    };

    logs.push(log);
    this.saveLogs(logs);

    this.sync.enqueue({
      entity: 'AiTriageLog',
      action: 'upsert',
      entityId: id,
      data: {
        id,
        patientId: params.patientId,
        symptoms: params.symptoms,
        result: log.result,
        latencyMs: params.latencyMs,
        source: params.source,
        createdAt: nowIso
      }
    });

    this.sync.process().catch(() => undefined);

    return log;
  }
}
