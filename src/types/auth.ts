export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'patient' | 'doctor' | 'healthworker';
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  registrationComplete: boolean;
  // Role-specific fields
  specialization?: string; // for doctors
  licenseNumber?: string; // for doctors
  village?: string; // for patients and health workers
  workLocation?: string; // for health workers
  experience?: number; // for doctors and health workers
  // Additional profile fields
  profilePicture?: string;
  bio?: string;
  qualifications?: string[];
  languages?: string[];
  consultationFee?: number; // for doctors
  availability?: boolean;
  rating?: number;
  totalPatients?: number;
  totalConsultations?: number;
  availableDates?: string[]; // for doctors: available appointment dates in 'YYYY-MM-DD' format
}

export interface DoctorProfile extends User {
  role: 'doctor';
  specialization: string;
  licenseNumber: string;
  consultationFee: number;
  qualifications: string[];
  experience: number;
  rating: number;
  totalPatients: number;
  totalConsultations: number;
  availability: boolean;
  availableDates?: string[];
  clinicAddress?: string;
  clinicPhone?: string;
}

export interface HealthWorkerProfile extends User {
  role: 'healthworker';
  workLocation: string;
  village: string;
  experience: number;
  assignedVillages: string[];
  supervisorId?: string;
  totalPatientsAssisted: number;
  specializations: string[];
}

export interface PatientProfile extends User {
  role: 'patient';
  village: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalHistory: string[];
  allergies: string[];
  bloodType?: string;
  chronicConditions: string[];
  preferredLanguage: 'en' | 'hi' | 'pa';
  assignedHealthWorker?: string;
  assignedDoctor?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'patient' | 'doctor' | 'healthworker';
  specialization?: string;
  licenseNumber?: string;
  village?: string;
  workLocation?: string;
  experience?: number;
  bio?: string;
  qualifications?: string[];
  consultationFee?: number;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalHistory?: string[];
  allergies?: string[];
  bloodType?: string;
  preferredLanguage?: 'en' | 'hi' | 'pa';
}