export interface FollowUpVisit {
  id: string;
  version?: number;
  patientId: string;
  workerId: string;
  scheduledAt: string;
  status: string;
  village?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
