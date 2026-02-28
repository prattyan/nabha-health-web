import { User, LoginCredentials, RegisterData } from '../types/auth';
import { ServerUser } from '../types/serverTypes';
import { StorageService } from './storageService';
import type { DoctorMetrics, SystemMetrics } from '../types/admin';
import { ApiClient } from './apiClient';

const USERS_STORAGE_KEY = 'nabhacare_users';
const CURRENT_USER_KEY = 'nabhacare_current_user';
const CACHED_DOCTORS_KEY = 'nabhacare_cached_doctors';


interface SessionData {
  user: User;
  expiry: number;
}

export class AuthService {
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private api = ApiClient.getInstance();
  private lastDoctorRefreshTime = 0;
  private readonly DOCTOR_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private mapServerRole(role: string): User['role'] {
    switch (role) {
      case 'PATIENT':
        return 'patient';
      case 'DOCTOR':
        return 'doctor';
      case 'HEALTH_WORKER':
        return 'healthworker';
      case 'ADMIN':
        return 'admin';
      case 'PHARMACY':
        // Frontend has no pharmacy role; treat as healthworker for now
        return 'healthworker';
      default:
        return 'patient';
    }
  }

  private toFrontendUser(serverUser: ServerUser, password: string = ''): User {
    return {
      id: serverUser.id,
      email: serverUser.email ?? '',
      password,
      firstName: serverUser.firstName ?? '',
      lastName: serverUser.lastName ?? '',
      phone: serverUser.phone ?? '',
      role: this.mapServerRole(serverUser.role),
      createdAt: serverUser.createdAt ?? new Date().toISOString(),
      updatedAt: serverUser.updatedAt ?? new Date().toISOString(),
      isActive: serverUser.isActive ?? true,
      registrationComplete: true,
      specialization: serverUser.specialization ?? undefined,
      licenseNumber: serverUser.licenseNumber ?? undefined,
      village: serverUser.village ?? undefined,
      workLocation: serverUser.workLocation ?? undefined,
      experience: serverUser.experience ?? undefined,
      availableDates: serverUser.availableDates ?? undefined
    };
  }

  private async refreshDoctorsFromServer(): Promise<void> {
    if (!navigator.onLine) return;
    if (!this.api.getAccessToken()) return;
    
    // Throttle refresh requests to avoid spamming the server
    if (Date.now() - this.lastDoctorRefreshTime < this.DOCTOR_REFRESH_INTERVAL) {
      return;
    }
    
    this.lastDoctorRefreshTime = Date.now();
    const res = await this.api.get<{ doctors: Array<{ id: string; firstName: string; lastName: string; specialization?: string; village?: string }> }>('/users/doctors');
    const doctors: User[] = res.doctors.map((d) => ({
      id: d.id,
      email: '',
      password: '',
      firstName: d.firstName,
      lastName: d.lastName,
      phone: '',
      role: 'doctor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      registrationComplete: true,
      specialization: d.specialization,
      village: d.village
    }));
    this.storageService.setItem(CACHED_DOCTORS_KEY, JSON.stringify(doctors));
  }

  getUserById(id: string): User | null {
    const users = this.getUsers();
    return users.find(u => u.id === id) || null;
  }
  
  getUsersByRole(role: string): User[] {
    const users = this.getUsers();
    if (role === 'doctor') {
      // Fire-and-forget refresh
      this.refreshDoctorsFromServer().catch(() => undefined);
      const cachedRaw = this.storageService.getItem(CACHED_DOCTORS_KEY);
      let cached: User[] = [];
      try {
        const parsed = cachedRaw ? JSON.parse(cachedRaw) : [];
        cached = Array.isArray(parsed) ? (parsed as User[]) : [];
      } catch { cached = []; }
      const merged = [...users.filter(u => u.role === role), ...cached];
      // De-dup by id
      const map = new Map<string, User>();
      merged.forEach(u => map.set(u.id, u));
      return Array.from(map.values());
    }
    return users.filter(u => u.role === role);
  }

  // Migration: Update old doctor ID to new format
  migrateDoctorId(oldId: string, newId: string) {
    const users = this.getUsers();
    let updated = false;
    users.forEach(u => {
      if (u.id === oldId && u.role === 'doctor') {
        u.id = newId;
        updated = true;
      }
    });
    if (updated) {
      this.saveUsers(users);
      // Also update doctorId in prescriptions and appointments
      // Use ES6 import for prescriptionService

      import('./prescriptionService').then(module => {
        if (module && module.PrescriptionService) {
          const ps = module.PrescriptionService.getInstance();
          ps.migrateDoctorIdInData(oldId, newId);
        }
      }).catch(err => {
        console.error('Failed to load prescriptionService for migration', err);
      });
    }
  }
  setDoctorAvailableDates(doctorId: string, dates: string[]): void {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === doctorId && u.role === 'doctor');
    if (idx !== -1) {
      users[idx].availableDates = dates;
      this.saveUsers(users);
    }
  }

  getDoctorAvailableDates(doctorId: string): string[] {
    const users = this.getUsers();
    const doctor = users.find(u => u.id === doctorId && u.role === 'doctor');
    return doctor && Array.isArray(doctor.availableDates) ? doctor.availableDates : [];
  }
  private static instance: AuthService;
  private storageService: StorageService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  constructor() {
  this.storageService = StorageService.getInstance();
  this.removeSampleDoctors();
  // Automatically migrate old doctor ID to new format
  this.migrateDoctorId('mfsokfzqv5wcsm36gy', 'DOC001');
  }

  private removeSampleDoctors(): void {
    const users = this.getUsers();
    const filtered = users.filter(user => {
      if (user.role !== 'doctor') return true;
      // Remove sample doctors by name/email/license
      const sampleNames = ['Dr. Rajesh', 'Dr. Priya', 'Dr. Manpreet'];
      const sampleEmails = [
        'dr.rajesh@nabhacare.com',
        'dr.priya@nabhacare.com',
        'dr.manpreet@nabhacare.com'
      ];
      const sampleLicenses = ['MED001', 'MED002', 'MED003'];
      return (
        !sampleNames.includes(user.firstName) &&
        !sampleEmails.includes(user.email) &&
        !(typeof user.licenseNumber === 'string' && sampleLicenses.includes(user.licenseNumber))
      );
    });
    if (filtered.length !== users.length) {
      this.saveUsers(filtered);
    }
  }


  private getUsers(): User[] {
    const users = this.storageService.getItem(USERS_STORAGE_KEY);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedUsers: any = users ? JSON.parse(users) : [];
    
    if (!Array.isArray(parsedUsers)) {
      // Handle potential object wrapper or invalid data
      if (parsedUsers && typeof parsedUsers === 'object' && Array.isArray(parsedUsers.users)) {
        parsedUsers = parsedUsers.users;
      } else if (parsedUsers && typeof parsedUsers === 'object' && Array.isArray(parsedUsers.data)) {
        parsedUsers = parsedUsers.data;
      } else {
        parsedUsers = [];
      }
    }

    if (!Array.isArray(parsedUsers)) {
      parsedUsers = [];
    }
    
    // Safety check just in case
    if (!Array.isArray(parsedUsers)) {
       console.warn('AuthService: parsedUsers is not an array, resetting to empty array', parsedUsers);
       parsedUsers = [];
    }

    // Migrate existing users to new format if needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Array.isArray(parsedUsers) ? parsedUsers : []).map((user: any) => ({
      ...user,
      updatedAt: user.updatedAt || user.createdAt || new Date().toISOString(),
      isActive: user.isActive !== undefined ? user.isActive : true,
      registrationComplete: user.registrationComplete !== undefined ? user.registrationComplete : true,
    }));
  }

  private saveUsers(users: User[]): void {
    try {
      // Add timestamp to users being saved
      const usersWithTimestamp = users.map(user => ({
        ...user,
        updatedAt: new Date().toISOString()
      }));
      
      this.storageService.setItem(USERS_STORAGE_KEY, JSON.stringify(usersWithTimestamp));
      
      // Log save operation for debugging
      console.log(`Saved ${users.length} users to storage`);
    } catch (error) {
      console.error('Failed to save users:', error);
      throw new Error('Failed to save user data permanently');
    }
  }


  async register(data: RegisterData): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      // Validate input data
      const validation = this.validateRegistrationData(data);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
      }

      // Prefer server-side registration when online
      if (navigator.onLine) {
        try {
          const res = await this.api.post<{ user: ServerUser; accessToken: string; refreshToken: string }>('/auth/register', {
            email: data.email,
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            role: data.role,
            specialization: data.specialization,
            licenseNumber: data.licenseNumber,
            village: data.village,
            workLocation: data.workLocation,
            experience: data.experience
          });
          this.api.setTokens(res.accessToken, res.refreshToken);
          const user = this.toFrontendUser(res.user, '');

          const sessionData: SessionData = { user, expiry: Date.now() + this.SESSION_DURATION };
          this.storageService.setItem(CURRENT_USER_KEY, JSON.stringify(sessionData));
          this.refreshDoctorsFromServer().catch(() => undefined);
          return { success: true, message: 'Registration successful! Welcome to NabhaCare.', user };
        } catch (e) {
          // API failed - fall back to offline registration
          console.warn('Backend registration failed, falling back to offline mode:', e);
        }
      }

      const users = this.getUsers();
      
      // Check if user already exists
      const existingUser = users.find(user => 
        user.email.toLowerCase() === data.email.toLowerCase() || 
        user.phone === data.phone
      );
      
      if (existingUser) {
        const field = existingUser.email.toLowerCase() === data.email.toLowerCase() ? 'email' : 'phone number';
        return { success: false, message: `User with this ${field} already exists` };
      }

      // Validate password confirmation
      if (data.password !== data.confirmPassword) {
        return { success: false, message: 'Passwords do not match' };
      }

      // Generate custom ID
      let idPrefix = '';
      let nextNumber = 1;
      if (data.role === 'doctor') {
        idPrefix = 'DOC';
        nextNumber = users.filter(u => u.role === 'doctor').length + 1;
      } else if (data.role === 'patient') {
        idPrefix = 'PAT';
        nextNumber = users.filter(u => u.role === 'patient').length + 1;
      } else {
        idPrefix = 'USR';
        nextNumber = users.length + 1;
      }
      const newUser: User = {
        id: `${idPrefix}${nextNumber.toString().padStart(3, '0')}`,
        email: data.email.toLowerCase().trim(),
        password: data.password, // In production, this should be hashed
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone.trim(),
        role: data.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        registrationComplete: true,
        ...(data.specialization && { specialization: data.specialization.trim() }),
        ...(data.licenseNumber && { licenseNumber: data.licenseNumber.trim() }),
        ...(data.village && { village: data.village.trim() }),
        ...(data.workLocation && { workLocation: data.workLocation.trim() }),
        ...(data.experience && { experience: data.experience }),
      };

      users.push(newUser);
      this.saveUsers(users);

      // Verify the user was saved successfully
      const savedUsers = this.getUsers();
      const savedUser = savedUsers.find(u => u.id === newUser.id);
      
      if (!savedUser) {
        return { success: false, message: 'Failed to save user data. Please try again.' };
      }

      // Log successful registration (for debugging)
      console.log('User registered successfully:', {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        timestamp: newUser.createdAt
      });

      return { success: true, message: 'Registration successful! Welcome to NabhaCare.', user: newUser };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed due to a technical error. Please try again.' };
    }
  }

  // Enhanced data validation
  private validateRegistrationData(data: RegisterData): { isValid: boolean; message: string } {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }

    // Phone validation (Indian format)
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    const cleanPhone = data.phone.replace(/[\s-()]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return { isValid: false, message: 'Please enter a valid Indian phone number' };
    }

    // Password strength validation
    if (data.password.length < 6) {
      return { isValid: false, message: 'Password must be at least 6 characters long' };
    }

    // Name validation
    if (data.firstName.trim().length < 2 || data.lastName.trim().length < 2) {
      return { isValid: false, message: 'First name and last name must be at least 2 characters long' };
    }

    // Role-specific validation
    if (data.role === 'doctor') {
      if (!data.specialization || data.specialization.trim().length < 2) {
        return { isValid: false, message: 'Specialization is required for doctors' };
      }
      if (!data.licenseNumber || data.licenseNumber.trim().length < 3) {
        return { isValid: false, message: 'Valid license number is required for doctors' };
      }
    }

    if (data.role === 'healthworker' && (!data.workLocation || data.workLocation.trim().length < 2)) {
      return { isValid: false, message: 'Work location is required for health workers' };
    }

    return { isValid: true, message: '' };
  }

  async login(credentials: LoginCredentials): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      // Prefer server-side login when online
      if (navigator.onLine) {
        try {
          const res = await this.api.post<{ user: ServerUser; accessToken: string; refreshToken: string }>('/auth/login', credentials);
          this.api.setTokens(res.accessToken, res.refreshToken);
          const user = this.toFrontendUser(res.user, '');

          const sessionData: SessionData = {
            user,
            expiry: Date.now() + this.SESSION_DURATION
          };
          this.storageService.setItem(CURRENT_USER_KEY, JSON.stringify(sessionData));
          this.refreshDoctorsFromServer().catch(() => undefined);
          return { success: true, message: 'Login successful', user };
        } catch (e) {
          // API failed - fall back to offline login
          console.warn('Backend login failed, falling back to offline mode:', e);
        }
      }

      const users = this.getUsers();
      const user = users.find(u => u.email === credentials.email && u.password === credentials.password);

      if (!user) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Store current user with session expiry
      const sessionData: SessionData = {
        user,
        expiry: Date.now() + this.SESSION_DURATION
      };
      this.storageService.setItem(CURRENT_USER_KEY, JSON.stringify(sessionData));

      return { success: true, message: 'Login successful', user };
    } catch {
      return { success: false, message: 'Login failed. Please try again.' };
    }
  }

  logout(): void {
    // Best-effort server logout
    const refreshToken = this.api.getRefreshToken();
    if (refreshToken && navigator.onLine) {
      this.api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }
    this.api.clearTokens();
    this.storageService.removeItem(CURRENT_USER_KEY);
  }

  getCurrentUser(): User | null {
    try {
      const stored = this.storageService.getItem(CURRENT_USER_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      
      if (!parsed || typeof parsed !== 'object') return null;

      // Handle legacy session (just user object)
      if (!parsed.expiry && parsed.id) {
        // Upgrade legacy session
        const sessionData: SessionData = {
          user: parsed,
          expiry: Date.now() + this.SESSION_DURATION
        };
        this.storageService.setItem(CURRENT_USER_KEY, JSON.stringify(sessionData));
        return parsed;
      }

      // Handle new session format
      if (parsed.expiry) {
        if (Date.now() > parsed.expiry) {
          this.logout();
          return null;
        }
        
        // Auto-refresh session if active
        const timeRemaining = parsed.expiry - Date.now();
        if (timeRemaining < this.SESSION_DURATION / 2) {
            // Fire and forget, but handled safely
            this.refreshSession(parsed.user).catch(() => {
              // If refresh fails completely (e.g. invalid token), logout might be needed
              // But we let the async function handle the logout if needed
            });
        }

        return parsed.user;
      }

      return null;
    } catch (e) {
      console.error('Error parsing session data', e);
      this.logout();
      return null;
    }
  }

  private async refreshSession(user: User): Promise<void> {
    try {
      if (!navigator.onLine) return;
      
      // Verify with server before extending local session
      await this.api.refreshTokens();
      
      const sessionData: SessionData = {
          user,
          expiry: Date.now() + this.SESSION_DURATION
      };
      this.storageService.setItem(CURRENT_USER_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.warn('Session auto-refresh failed', error);
      // Optional: if error is 401/403, could force logout here
      // this.logout();
    }
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  getAllUsers(): User[] {
    return this.getUsers();
  }

  getAvailableDoctors(): User[] {
    return this.getUsers().filter(user => 
      user.role === 'doctor' && 
      user.isActive && 
      user.registrationComplete
    );
  }

  // Get registration statistics
  getRegistrationStats(): {
    total: number;
    patients: number;
    doctors: number;
    healthworkers: number;
    recentRegistrations: number;
  } {
    const users = this.getUsers();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return {
      total: users.length,
      patients: users.filter(u => u.role === 'patient').length,
      doctors: users.filter(u => u.role === 'doctor').length,
      healthworkers: users.filter(u => u.role === 'healthworker').length,
      recentRegistrations: users.filter(u => new Date(u.createdAt) > oneWeekAgo).length,
    };
  }

  // Export user data for backup (admin feature)
  exportUserData(): string {
    const users = this.getUsers();
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      userCount: users.length,
      users: users.map(user => ({
        ...user,
        password: '***' // Don't export passwords
      }))
    };
    return JSON.stringify(exportData, null, 2);
  }

  // Validate storage integrity
  validateStorageIntegrity(): { 
    isValid: boolean; 
    issues: string[]; 
    storageInfo: { type: string; size: number; available: boolean } | null;
  } {
    const issues: string[] = [];
    let isValid = true;

    try {
      const users = this.getUsers();
      const currentUser = this.getCurrentUser();
      const storageInfo = this.storageService.getStorageInfo();

      // Check if users array is valid
      if (!Array.isArray(users)) {
        issues.push('Users data is not an array');
        isValid = false;
      }

      // Check for duplicate users
      const emails = users.map(u => u.email);
      const uniqueEmails = new Set(emails);
      if (emails.length !== uniqueEmails.size) {
        issues.push('Duplicate users detected');
        isValid = false;
      }

      // Check current user validity
      if (currentUser && !users.find(u => u.id === currentUser.id)) {
        issues.push('Current user not found in users list');
        isValid = false;
      }

      // Check for required fields
      users.forEach((user, index) => {
        if (!user.id || !user.email || !user.firstName || !user.lastName) {
          issues.push(`User ${index} missing required fields`);
          isValid = false;
        }
      });

      return { isValid, issues, storageInfo };
    } catch (error) {
      return { 
        isValid: false, 
        issues: [`Storage validation error: ${error}`], 
        storageInfo: null 
      };
    }
  }

  // ========== ADMIN METHODS ==========

  /**
   * Get doctor statistics for admin dashboard
   */
  getDoctorStats(): DoctorMetrics {
    const users = this.getUsers();
    const doctors = users.filter(u => u.role === 'doctor');

    // Group doctors by specialization
    const doctorsBySpec: { [key: string]: number } = {};
    doctors.forEach(doc => {
      const spec = doc.specialization || 'General';
      doctorsBySpec[spec] = (doctorsBySpec[spec] || 0) + 1;
    });

    const doctorsBySpecialization = Object.entries(doctorsBySpec).map(([spec, count]) => ({
      specialization: spec,
      count
    }));

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Calculate doctors available today
    const doctorsAvailableToday = doctors.filter(doc => {
      const availableDates = doc.availableDates || [];
      return availableDates.includes(today);
    }).length;

    // Build detailed workload
    const doctorWorkload = doctors.map(doc => ({
      doctorId: doc.id,
      doctorName: `${doc.firstName} ${doc.lastName}`,
      specialization: doc.specialization || 'General',
      appointmentsToday: 0, // Will be calculated from PrescriptionService
      appointmentsThisWeek: 0,
      totalPatients: doc.totalPatients || 0,
      totalConsultations: doc.totalConsultations || 0,
      rating: doc.rating || 0
    }));

    return {
      totalDoctors: doctors.length,
      doctorsBySpecialization,
      doctorsAvailableToday,
      doctorWorkload
    };
  }

  /**
   * Get system metrics for admin dashboard
   */
  getSystemMetrics(): SystemMetrics {
    const users = this.getUsers();
    const integrity = this.validateStorageIntegrity();

    return {
      storageUsage: {
        used: this.storageService.getStorageInfo().size || 0,
        available: 5242880, // 5MB typical localStorage limit
        percentUsed: Math.round((this.storageService.getStorageInfo().size || 0) / 5242880 * 100)
      },
      dataIntegrity: {
        isValid: integrity.isValid,
        issues: integrity.issues,
        duplicateUsers: 0,
        totalRecords: users.length
      },
      userStats: {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        patients: users.filter(u => u.role === 'patient').length,
        doctors: users.filter(u => u.role === 'doctor').length,
        healthworkers: users.filter(u => u.role === 'healthworker').length,
        admins: users.filter(u => u.role === 'admin').length
      }
    };
  }

  /**
   * Get comprehensive admin stats
   */
  getAdminStats() {
    return {
      doctorMetrics: this.getDoctorStats(),
      systemMetrics: this.getSystemMetrics(),
      registrationStats: this.getRegistrationStats(),
      timestamp: new Date().toISOString()
    };
  }
}