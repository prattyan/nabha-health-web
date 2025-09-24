export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
  remainingQuantity?: number;
  startDate?: string;
  endDate?: string;
  timesToTake: string[]; // e.g., ['08:00', '14:00', '20:00']
  sideEffects?: string[];
  category?: string;
  pharmacy?: string; // Pharmacy where medicine is available
}

export interface MedicationTracking {
  id: string;
  medicineId: string;
  patientId: string;
  prescriptionId: string;
  scheduledTime: string;
  actualTime?: string;
  status: 'scheduled' | 'taken' | 'missed' | 'skipped';
  notes?: string;
  createdAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  appointmentId: string;
  date: string;
  diagnosis: string;
  symptoms: string;
  medicines: Medicine[];
  notes: string;
  followUpDate?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  vitalSigns?: VitalSigns;
  attachments?: string[];
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  healthWorkerId?: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  duration: number; // in minutes
  type: 'video' | 'followup' | 'consultation' | 'emergency' | 'routine_checkup';
  status: 'available' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'no_show';
  village?: string;
  specialization?: string;
  prescriptionId?: string;
  review?: number; // Patient review out of 5 stars
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  symptoms?: string[];
  notes?: string;
  meetingLink?: string;
  reminderSent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HealthRecord {
  id: string;
  patientId: string;
  doctorId?: string;
  healthWorkerId?: string;
  recordType: 'visit' | 'test' | 'vaccination' | 'surgery' | 'diagnosis' | 'allergy';
  title: string;
  description: string;
  date: string;
  attachments?: string[];
  vitalSigns?: VitalSigns;
  testResults?: TestResult[];
  followUpRequired?: boolean;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VitalSigns {
  bloodPressure?: {
    systolic: number;
    diastolic: number;
    unit: 'mmHg';
  };
  heartRate?: {
    value: number;
    unit: 'bpm';
  };
  temperature?: {
    value: number;
    unit: 'C' | 'F';
  };
  weight?: {
    value: number;
    unit: 'kg' | 'lbs';
  };
  height?: {
    value: number;
    unit: 'cm' | 'ft';
  };
  bloodSugar?: {
    value: number;
    unit: 'mg/dL';
    type: 'fasting' | 'random' | 'post_meal';
  };
  oxygenSaturation?: {
    value: number;
    unit: '%';
  };
  recordedAt: string;
}

export interface TestResult {
  id: string;
  testName: string;
  result: string;
  normalRange: string;
  unit: string;
  status: 'normal' | 'abnormal' | 'critical';
  notes?: string;
}

export interface DoctorAvailability {
  id: string;
  doctorId: string;
  dayOfWeek: number; // 0-6, Sunday-Saturday
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  maxAppointments: number;
  appointmentDuration: number; // in minutes
}

export interface PatientProfile {
  id: string;
  userId: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  bloodType?: string;
  chronicConditions: string[];
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
  };
  preferredLanguage: 'en' | 'hi' | 'pa';
  createdAt: string;
  updatedAt: string;
}