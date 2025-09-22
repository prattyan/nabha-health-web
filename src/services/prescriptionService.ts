import { 
  Prescription, 
  Medicine, 
  Appointment, 
  HealthRecord, 
  MedicationTracking, 
  VitalSigns,
  DoctorAvailability,
  PatientProfile 
} from '../types/prescription';
import { StorageService } from './storageService';

const PRESCRIPTIONS_STORAGE_KEY = 'nabhacare_prescriptions';
const APPOINTMENTS_STORAGE_KEY = 'nabhacare_appointments';
const HEALTH_RECORDS_STORAGE_KEY = 'nabhacare_health_records';
const MEDICATION_TRACKING_STORAGE_KEY = 'nabhacare_medication_tracking';
const DOCTOR_AVAILABILITY_STORAGE_KEY = 'nabhacare_doctor_availability';
const PATIENT_PROFILES_STORAGE_KEY = 'nabhacare_patient_profiles';



export class PrescriptionService {
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
      // Create medication tracking for default prescriptions
      defaultPrescriptions.forEach(prescription => {
        this.createMedicationTrackingForPrescription(prescription);
      });
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

    // Create medication tracking entries
    this.createMedicationTrackingForPrescription(newPrescription);

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

  // Medication Tracking Methods
  private getMedicationTracking(): MedicationTracking[] {
    const tracking = this.storageService.getItem(MEDICATION_TRACKING_STORAGE_KEY);
    return tracking ? JSON.parse(tracking) : [];
  }

  private saveMedicationTracking(tracking: MedicationTracking[]): void {
    const dataString = JSON.stringify(tracking);
    this.storageService.setItem(MEDICATION_TRACKING_STORAGE_KEY, dataString);
  }

  private createMedicationTrackingForPrescription(prescription: Prescription): void {
    const tracking = this.getMedicationTracking();
    const currentDate = new Date();
    
    prescription.medicines.forEach(medicine => {
      const endDate = new Date(medicine.endDate || currentDate);
      const startDate = new Date(medicine.startDate || currentDate);
      
      // Create tracking entries for each day and time
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        medicine.timesToTake?.forEach(time => {
          const scheduledDateTime = new Date(d);
          const [hours, minutes] = time.split(':');
          scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));
          
          const trackingEntry: MedicationTracking = {
            id: this.generateId(),
            medicineId: medicine.id,
            patientId: prescription.patientId,
            prescriptionId: prescription.id,
            scheduledTime: scheduledDateTime.toISOString(),
            status: 'scheduled',
            createdAt: new Date().toISOString()
          };
          
          tracking.push(trackingEntry);
        });
      }
    });
    
    this.saveMedicationTracking(tracking);
  }

  getMedicationTrackingByPatient(patientId: string): MedicationTracking[] {
    return this.getMedicationTracking().filter(track => track.patientId === patientId);
  }

  updateMedicationStatus(trackingId: string, status: MedicationTracking['status'], actualTime?: string): boolean {
    const tracking = this.getMedicationTracking();
    const index = tracking.findIndex(track => track.id === trackingId);
    
    if (index !== -1) {
      tracking[index].status = status;
      if (actualTime) {
        tracking[index].actualTime = actualTime;
      }
      this.saveMedicationTracking(tracking);
      return true;
    }
    return false;
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
        patientId: 'patient1',
        doctorId: 'doctor1',
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
    const medicationTracking = this.getMedicationTrackingByPatient(patientId);

    return {
      totalAppointments: appointments.length,
      upcomingAppointments: appointments.filter(apt => apt.status === 'scheduled').length,
      totalPrescriptions: prescriptions.length,
      activePrescriptions: prescriptions.filter(p => p.status === 'active').length,
      totalHealthRecords: healthRecords.length,
      medicationCompliance: this.calculateMedicationCompliance(medicationTracking)
    };
  }

  private calculateMedicationCompliance(tracking: MedicationTracking[]): number {
    if (tracking.length === 0) return 100;
    const taken = tracking.filter(t => t.status === 'taken').length;
    return Math.round((taken / tracking.length) * 100);
  }
}

// Method to initialize sample prescription for new patients

// Method to initialize sample appointment for new patients
