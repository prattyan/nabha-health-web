import { 
  Prescription, 
  Appointment, 
  HealthRecord,
  MedicationTracking
} from '../types/prescription';
import { StorageService } from './storageService';

const PRESCRIPTIONS_STORAGE_KEY = 'nabhacare_prescriptions';
const APPOINTMENTS_STORAGE_KEY = 'nabhacare_appointments';
const HEALTH_RECORDS_STORAGE_KEY = 'nabhacare_health_records';



export class PrescriptionService {
  // Migration: Fill missing patientName in appointments using patientId and user data
  migrateFillPatientNamesInAppointments(getUserById: (id: string) => { firstName: string, lastName: string } | null) {
    const appointments = this.getAppointments();
    let updated = false;
    appointments.forEach(a => {
      if ((!a.patientName || a.patientName.trim() === '') && a.patientId) {
        const user = getUserById(a.patientId);
        if (user) {
          a.patientName = `${user.firstName} ${user.lastName}`;
          updated = true;
        }
      }
    });
    if (updated) {
      this.saveAppointments(appointments);
    }
  }
  // Medication tracking storage key
  private static MEDICATION_TRACKING_KEY = 'nabhacare_medication_tracking';

  getMedicationTrackingByPatient(patientId: string) {
    const trackingRaw = this.storageService.getItem(PrescriptionService.MEDICATION_TRACKING_KEY);
    if (!trackingRaw) return [];
    const tracking = JSON.parse(trackingRaw) as MedicationTracking[];
    return tracking.filter((t) => t.patientId === patientId);
  }

  updateMedicationStatus(trackingId: string, status: 'taken' | 'missed' | 'skipped', actualTime?: string) {
    const trackingRaw = this.storageService.getItem(PrescriptionService.MEDICATION_TRACKING_KEY);
    if (!trackingRaw) return false;
    const tracking = JSON.parse(trackingRaw) as MedicationTracking[];
    const idx = tracking.findIndex((t) => t.id === trackingId);
    if (idx === -1) return false;
    tracking[idx].status = status;
    if (actualTime) tracking[idx].actualTime = actualTime;
    this.storageService.setItem(PrescriptionService.MEDICATION_TRACKING_KEY, JSON.stringify(tracking));
    return true;
  }
  // Migration: Update doctorId in prescriptions and appointments
  migrateDoctorIdInData(oldId: string, newId: string) {
    let updated = false;
    // Prescriptions
    const prescriptions = this.getPrescriptions();
    prescriptions.forEach(p => {
      if (p.doctorId === oldId) {
        p.doctorId = newId;
        updated = true;
      }
    });
    if (updated) {
      this.savePrescriptions(prescriptions);
    }
    // Appointments
    const appointments = this.getAppointments();
    let appointmentsUpdated = false;
    appointments.forEach(a => {
      if (a.doctorId === oldId) {
        a.doctorId = newId;
        appointmentsUpdated = true;
      }
    });
    if (appointmentsUpdated) {
      this.saveAppointments(appointments);
    }
  }
  // Migration: Fill missing patientName in prescriptions using appointment data
  migrateFillPatientNames() {
    const prescriptions = this.getPrescriptions();
    let updated = false;
    prescriptions.forEach(p => {
      if (!p.patientName || p.patientName.trim() === '') {
        // Find appointment for this prescription
        const appointment = this.getAppointments().find(a => a.id === p.appointmentId);
        if (appointment && appointment.patientName) {
          p.patientName = appointment.patientName;
          updated = true;
        }
      }
    });
    if (updated) {
      this.savePrescriptions(prescriptions);
    }
  }
  /**
   * Update review for an appointment
   * @param appointmentId Appointment ID
   * @param review Review value (1-5)
   */
  updateAppointmentReview(appointmentId: string, review: number): Appointment | null {
    return this.updateAppointment(appointmentId, { review });
  }
  private initializeDefaultData(): void {
    // Initialize with some default data if none exists
    if (!this.storageService.getItem(APPOINTMENTS_STORAGE_KEY)) {
      this.saveAppointments(this.getDefaultAppointments());
    }
    if (!this.storageService.getItem(PRESCRIPTIONS_STORAGE_KEY)) {
      const defaultPrescriptions = this.getDefaultPrescriptions();
      this.savePrescriptions(defaultPrescriptions);
    } else {
      // Run migration to fill missing patient names
      this.migrateFillPatientNames();
    }
    if (!this.storageService.getItem(HEALTH_RECORDS_STORAGE_KEY)) {
      this.saveHealthRecords(this.getDefaultHealthRecords());
    }
  }
  private getPrescriptions(): Prescription[] {
    const prescriptions = this.storageService.getItem(PRESCRIPTIONS_STORAGE_KEY);
    return prescriptions ? JSON.parse(prescriptions) : [];
  }

  private savePrescriptions(prescriptions: Prescription[]): void {
    const dataString = JSON.stringify(prescriptions);
    this.storageService.setItem(PRESCRIPTIONS_STORAGE_KEY, dataString);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  private static instance: PrescriptionService;
  private storageService: StorageService;

  static getInstance(): PrescriptionService {
    if (!PrescriptionService.instance) {
      PrescriptionService.instance = new PrescriptionService();
    }
    return PrescriptionService.instance;
  }

  constructor() {
    this.storageService = StorageService.getInstance();
    this.initializeDefaultData();
  }

  // ...existing code...

  /**
   * Reschedule an appointment: update date/time, release previous slot
   * @param id Appointment ID
   * @param newDate New date string
   * @param newTime New time string
   * @returns Updated appointment or null
   */

  createPrescription(prescriptionData: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>): Prescription {
    const prescriptions = this.getPrescriptions();
    const now = new Date().toISOString();
    const newPrescription: Prescription = {
      ...prescriptionData,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      status: 'active',
    };

    prescriptions.push(newPrescription);
    this.savePrescriptions(prescriptions);


    // Update appointment with prescription ID
    this.updateAppointmentWithPrescription(prescriptionData.appointmentId, newPrescription.id);

    return newPrescription;
  }

  updatePrescription(id: string, updates: Partial<Prescription>): Prescription | null {
    const prescriptions = this.getPrescriptions();
    const index = prescriptions.findIndex(p => p.id === id);
    if (index !== -1) {
      prescriptions[index] = {
        ...prescriptions[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.savePrescriptions(prescriptions);
      return prescriptions[index];
    }
    return null;
  }

  getPrescriptionsByPatient(patientId: string): Prescription[] {
    return this.getPrescriptions().filter(p => p.patientId === patientId);
  }

  getPrescriptionsByDoctor(doctorId: string): Prescription[] {
    return this.getPrescriptions().filter(p => p.doctorId === doctorId);
  }

  getPrescriptionById(id: string): Prescription | null {
    return this.getPrescriptions().find(p => p.id === id) || null;
  }

  // Appointment Methods

  public getAppointments(): Appointment[] {
    const appointments = this.storageService.getItem(APPOINTMENTS_STORAGE_KEY);
    return appointments ? JSON.parse(appointments) : [];
  }

  private saveAppointments(appointments: Appointment[]): void {
    const dataString = JSON.stringify(appointments);
    this.storageService.setItem(APPOINTMENTS_STORAGE_KEY, dataString);
  }

  createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'reminderSent'>): Appointment {
    const appointments = this.getAppointments();
    const now = new Date().toISOString();
    const newAppointment: Appointment = {
      ...appointmentData,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      status: 'scheduled',
      healthWorkerId: appointmentData.healthWorkerId || '',
      reminderSent: false,
    };

    appointments.push(newAppointment);
    this.saveAppointments(appointments);

    return newAppointment;
  }


  updateAppointment(id: string, updates: Partial<Appointment>): Appointment | null {
    const appointments = this.getAppointments();
    const index = appointments.findIndex(apt => apt.id === id);
    
    if (index !== -1) {
      appointments[index] = {
        ...appointments[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveAppointments(appointments);
      return appointments[index];
    }
    return null;
  }

  /**
   * Reschedule an appointment: update date/time, release previous slot
   * @param id Appointment ID
   * @param newDate New date string
   * @param newTime New time string
   * @returns Updated appointment or null
   */
  rescheduleAppointment(id: string, newDate: string, newTime: string): Appointment | null {
  const appointments = this.getAppointments();
  const index = appointments.findIndex((apt: Appointment) => apt.id === id);
  if (index === -1) return null;
  // Release previous slot by updating date/time
  appointments[index].date = newDate;
  appointments[index].time = newTime;
  appointments[index].updatedAt = new Date().toISOString();
  appointments[index].status = 'scheduled';
  this.saveAppointments(appointments);
  return appointments[index];
  }

  getAppointmentsByPatient(patientId: string): Appointment[] {
    return this.getAppointments().filter(apt => apt.patientId === patientId);
  }

  public getAppointmentsByDoctor(doctorId: string): Appointment[] {
    return this.getAppointments().filter((apt: Appointment) => apt.doctorId === doctorId);
  }

  getAppointmentById(id: string): Appointment | null {
    return this.getAppointments().find(apt => apt.id === id) || null;
  }

  private updateAppointmentWithPrescription(appointmentId: string, prescriptionId: string): void {
    const appointments = this.getAppointments();
    const index = appointments.findIndex(apt => apt.id === appointmentId);
    
    if (index !== -1) {
      appointments[index].prescriptionId = prescriptionId;
      appointments[index].status = 'completed';
      appointments[index].updatedAt = new Date().toISOString();
      this.saveAppointments(appointments);
    }
  }

  // Health Records Methods
  private getHealthRecords(): HealthRecord[] {
    const records = this.storageService.getItem(HEALTH_RECORDS_STORAGE_KEY);
    return records ? JSON.parse(records) : [];
  }

  private saveHealthRecords(records: HealthRecord[]): void {
    const dataString = JSON.stringify(records);
    this.storageService.setItem(HEALTH_RECORDS_STORAGE_KEY, dataString);
  }

  createHealthRecord(recordData: Omit<HealthRecord, 'id' | 'createdAt' | 'updatedAt'>): HealthRecord {
    const records = this.getHealthRecords();
    const now = new Date().toISOString();
    const newRecord: HealthRecord = {
      ...recordData,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };

    records.push(newRecord);
    this.saveHealthRecords(records);

    return newRecord;
  }

  getHealthRecordsByPatient(patientId: string): HealthRecord[] {
    return this.getHealthRecords().filter(record => record.patientId === patientId);
  }


  // Default Data
  private getDefaultAppointments(): Appointment[] {
  // Removed unused variable 'now'
    // No sample appointments or doctors. Only registered doctors will be shown.
    return [];
  }

  private getDefaultPrescriptions(): Prescription[] {
  // Removed unused variable 'now'
    // No sample prescriptions for new users.
    return [];
  }

  private getDefaultHealthRecords(): HealthRecord[] {
    const now = new Date().toISOString();
    return [
      {
          id: 'hr1',
          patientId: 'PAT001',
          doctorId: 'DOC001',
        recordType: 'visit',
        title: 'Annual Health Checkup',
        description: 'Routine annual physical examination',
        date: '2025-01-10',
        vitalSigns: {
          bloodPressure: { systolic: 120, diastolic: 80, unit: 'mmHg' },
          heartRate: { value: 72, unit: 'bpm' },
          temperature: { value: 98.6, unit: 'F' },
          weight: { value: 70, unit: 'kg' },
          recordedAt: now
        },
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  // Statistics and Analytics
  getPatientStats(patientId: string) {
    const appointments = this.getAppointmentsByPatient(patientId);
    const prescriptions = this.getPrescriptionsByPatient(patientId);
    const healthRecords = this.getHealthRecordsByPatient(patientId);
    return {
      totalAppointments: appointments.length,
      upcomingAppointments: appointments.filter(apt => apt.status === 'scheduled').length,
      totalPrescriptions: prescriptions.length,
      activePrescriptions: prescriptions.filter(p => p.status === 'active').length,
      totalHealthRecords: healthRecords.length
    };
  }

}

// Method to initialize sample prescription for new patients

// Method to initialize sample appointment for new patients
