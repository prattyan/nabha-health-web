import { User, LoginCredentials, RegisterData } from '../types/auth';
import { StorageService } from './storageService';

const USERS_STORAGE_KEY = 'nabhacare_users';
const CURRENT_USER_KEY = 'nabhacare_current_user';

export class AuthService {
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
        !sampleLicenses.includes(user.licenseNumber)
      );
    });
    if (filtered.length !== users.length) {
      this.saveUsers(filtered);
    }
  }


  private getUsers(): User[] {
    const users = this.storageService.getItem(USERS_STORAGE_KEY);
    const parsedUsers = users ? JSON.parse(users) : [];
    
    // Migrate existing users to new format if needed
    return parsedUsers.map((user: any) => ({
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

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async register(data: RegisterData): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      // Validate input data
      const validation = this.validateRegistrationData(data);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
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

      // Create new user with enhanced data
      const newUser: User = {
        id: this.generateId(),
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
      const users = this.getUsers();
      const user = users.find(u => u.email === credentials.email && u.password === credentials.password);

      if (!user) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Store current user
      this.storageService.setItem(CURRENT_USER_KEY, JSON.stringify(user));

      return { success: true, message: 'Login successful', user };
    } catch (error) {
      return { success: false, message: 'Login failed. Please try again.' };
    }
  }

  logout(): void {
    this.storageService.removeItem(CURRENT_USER_KEY);
  }

  getCurrentUser(): User | null {
    const user = this.storageService.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  getAllUsers(): User[] {
    return this.getUsers();
  }

  getUsersByRole(role: string): User[] {
    return this.getUsers().filter(user => user.role === role);
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
    storageInfo: any;
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
}