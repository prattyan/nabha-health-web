// Admin Dashboard Types

export interface PatientLoadMetrics {
  totalPatients: number;
  activePatients: number;
  newRegistrationsThisWeek: number;
  newRegistrationsThisMonth: number;
  patientsByVillage: Array<{
    village: string;
    count: number;
  }>;
  appointmentLoad: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  avgAppointmentsPerDoctor: number;
  appointmentNoShowRate: number;
}

export interface DoctorMetrics {
  totalDoctors: number;
  doctorsBySpecialization: Array<{
    specialization: string;
    count: number;
  }>;
  doctorsAvailableToday: number;
  doctorWorkload: Array<{
    doctorId: string;
    doctorName: string;
    specialization: string;
    appointmentsToday: number;
    appointmentsThisWeek: number;
    totalPatients: number;
    totalConsultations: number;
    rating: number;
  }>;
}

export interface SystemMetrics {
  storageUsage: {
    used: number;
    available: number;
    percentUsed: number;
  };
  dataIntegrity: {
    isValid: boolean;
    issues: string[];
    duplicateUsers: number;
    totalRecords: number;
  };
  userStats: {
    totalUsers: number;
    activeUsers: number;
    patients: number;
    doctors: number;
    healthworkers: number;
    admins: number;
  };
}

export interface AdminAnalytics {
  patientLoad: PatientLoadMetrics;
  doctorMetrics: DoctorMetrics;
  systemMetrics: SystemMetrics;
  lastUpdated: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details?: string;
}
