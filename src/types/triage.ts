export type TriageSeverity = 'low' | 'medium' | 'high' | 'urgent';

export interface TriageLog {
  id: string;
  patientId?: string;
  symptoms: string[];

  // These fields are not persisted as columns server-side today,
  // but can be embedded in the `result` payload for UI convenience.
  severity?: TriageSeverity;
  village?: string;
  patientName?: string;

  result: unknown;
  latencyMs?: number;
  source?: string;
  createdAt: string;
}
