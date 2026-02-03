import { 
  Permission, 
  Role, 
  RoleDefinition, 
  UserRole, 
  PermissionCheck, 
  APIEndpoint, 
  AuditLog,
  DEFAULT_ROLES 
} from '../types/rbac';
import { User } from '../types/auth';
import { StorageService } from './storageService';

const ROLES_STORAGE_KEY = 'nabhacare_roles';
const USER_ROLES_STORAGE_KEY = 'nabhacare_user_roles';
const AUDIT_LOGS_STORAGE_KEY = 'nabhacare_audit_logs';
const API_ENDPOINTS_STORAGE_KEY = 'nabhacare_api_endpoints';

export class RBACService {
  private static instance: RBACService;
  private storageService: StorageService;

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  constructor() {
    this.storageService = StorageService.getInstance();
    this.initializeDefaultRoles();
    this.initializeAPIEndpoints();
  }

  // Initialize default roles if they don't exist
  private initializeDefaultRoles(): void {
    const existingRoles = this.getRoles();
    if (existingRoles.length === 0) {
      this.saveRoles(DEFAULT_ROLES);
      console.log('Initialized default RBAC roles');
    }
  }

  // Initialize API endpoints configuration
  private initializeAPIEndpoints(): void {
    const existingEndpoints = this.getAPIEndpoints();
    if (existingEndpoints.length === 0) {
      const defaultEndpoints: APIEndpoint[] = [
        // Public endpoints
        { path: '/api/auth/login', method: 'POST', requiredPermissions: [], isPublic: true },
        { path: '/api/auth/register', method: 'POST', requiredPermissions: [], isPublic: true },
        { path: '/api/health', method: 'GET', requiredPermissions: [], isPublic: true },
        
        // Patient endpoints
        { path: '/api/patients/profile', method: 'GET', requiredPermissions: ['patient:view_profile'] },
        { path: '/api/patients/profile', method: 'PUT', requiredPermissions: ['patient:edit_profile'] },
        { path: '/api/patients/appointments', method: 'GET', requiredPermissions: ['patient:view_appointments'] },
        { path: '/api/patients/appointments', method: 'POST', requiredPermissions: ['patient:book_appointment'] },
        { path: '/api/patients/prescriptions', method: 'GET', requiredPermissions: ['patient:view_prescriptions'] },
        
        // Doctor endpoints
        { path: '/api/doctors/profile', method: 'GET', requiredPermissions: ['doctor:view_profile'] },
        { path: '/api/doctors/appointments', method: 'GET', requiredPermissions: ['doctor:view_appointments'] },
        { path: '/api/doctors/appointments/:id', method: 'PUT', requiredPermissions: ['doctor:manage_appointments'] },
        { path: '/api/doctors/prescriptions', method: 'POST', requiredPermissions: ['doctor:create_prescription'] },
        { path: '/api/doctors/patients/:id', method: 'GET', requiredPermissions: ['doctor:view_patient_records'] },
        
        // Health Worker endpoints
        { path: '/api/healthworkers/patients', method: 'GET', requiredPermissions: ['healthworker:view_patients'] },
        { path: '/api/healthworkers/appointments', method: 'POST', requiredPermissions: ['healthworker:schedule_appointments'] },
        
        // Pharmacy endpoints
        { path: '/api/pharmacy/prescriptions', method: 'GET', requiredPermissions: ['pharmacy:view_prescriptions'] },
        { path: '/api/pharmacy/inventory', method: 'GET', requiredPermissions: ['pharmacy:manage_inventory'] },
        { path: '/api/pharmacy/dispense', method: 'POST', requiredPermissions: ['pharmacy:dispense_medication'] },
        
        // Admin endpoints
        { path: '/api/admin/users', method: 'GET', requiredPermissions: ['admin:view_all_users'] },
        { path: '/api/admin/users/:id', method: 'PUT', requiredPermissions: ['admin:manage_users'] },
        { path: '/api/admin/roles', method: 'GET', requiredPermissions: ['admin:manage_roles'] },
        { path: '/api/admin/audit-logs', method: 'GET', requiredPermissions: ['admin:view_audit_logs'] },
      ];
      
      this.saveAPIEndpoints(defaultEndpoints);
      console.log('Initialized default API endpoints');
    }
  }

  // Role Management
  getRoles(): RoleDefinition[] {
    const roles = this.storageService.getItem(ROLES_STORAGE_KEY);
    return roles ? JSON.parse(roles) : [];
  }

  private saveRoles(roles: RoleDefinition[]): void {
    this.storageService.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
  }

  getRoleByName(roleName: Role): RoleDefinition | null {
    const roles = this.getRoles();
    return roles.find(role => role.name === roleName) || null;
  }

  createRole(roleData: Omit<RoleDefinition, 'createdAt' | 'updatedAt'>): { success: boolean; message: string } {
    try {
      const roles = this.getRoles();
      
      // Check if role already exists
      if (roles.find(role => role.name === roleData.name)) {
        return { success: false, message: 'Role already exists' };
      }

      const newRole: RoleDefinition = {
        ...roleData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      roles.push(newRole);
      this.saveRoles(roles);

      return { success: true, message: 'Role created successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to create role' };
    }
  }

  updateRole(roleName: Role, updates: Partial<RoleDefinition>): { success: boolean; message: string } {
    try {
      const roles = this.getRoles();
      const roleIndex = roles.findIndex(role => role.name === roleName);

      if (roleIndex === -1) {
        return { success: false, message: 'Role not found' };
      }

      const role = roles[roleIndex];
      if (role.isSystemRole && (updates.name || updates.isSystemRole === false)) {
        return { success: false, message: 'Cannot modify system role name or system status' };
      }

      roles[roleIndex] = {
        ...role,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.saveRoles(roles);
      return { success: true, message: 'Role updated successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to update role' };
    }
  }

  deleteRole(roleName: Role): { success: boolean; message: string } {
    try {
      const roles = this.getRoles();
      const role = roles.find(r => r.name === roleName);

      if (!role) {
        return { success: false, message: 'Role not found' };
      }

      if (role.isSystemRole) {
        return { success: false, message: 'Cannot delete system role' };
      }

      // Check if any users have this role
      const userRoles = this.getUserRoles();
      const usersWithRole = userRoles.filter(ur => ur.role === roleName && ur.isActive);
      
      if (usersWithRole.length > 0) {
        return { success: false, message: `Cannot delete role: ${usersWithRole.length} users still have this role` };
      }

      const filteredRoles = roles.filter(r => r.name !== roleName);
      this.saveRoles(filteredRoles);

      return { success: true, message: 'Role deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to delete role' };
    }
  }

  // User Role Management
  getUserRoles(): UserRole[] {
    const userRoles = this.storageService.getItem(USER_ROLES_STORAGE_KEY);
    return userRoles ? JSON.parse(userRoles) : [];
  }

  private saveUserRoles(userRoles: UserRole[]): void {
    this.storageService.setItem(USER_ROLES_STORAGE_KEY, JSON.stringify(userRoles));
  }

  getUserRole(userId: string): UserRole | null {
    const userRoles = this.getUserRoles();
    return userRoles.find(ur => ur.userId === userId && ur.isActive) || null;
  }

  assignRole(userId: string, role: Role, assignedBy: string): { success: boolean; message: string } {
    try {
      const userRoles = this.getUserRoles();
      
      // Check if role exists
      const roleDefinition = this.getRoleByName(role);
      if (!roleDefinition) {
        return { success: false, message: 'Role does not exist' };
      }

      // Deactivate existing role for user
      userRoles.forEach(ur => {
        if (ur.userId === userId && ur.isActive) {
          ur.isActive = false;
        }
      });

      // Assign new role
      const newUserRole: UserRole = {
        userId,
        role,
        assignedBy,
        assignedAt: new Date().toISOString(),
        isActive: true
      };

      userRoles.push(newUserRole);
      this.saveUserRoles(userRoles);

      this.logAudit({
        userId: assignedBy,
        action: 'assign_role',
        resource: `user:${userId}`,
        permission: 'admin:manage_users',
        success: true,
        details: { assignedRole: role, targetUser: userId }
      });

      return { success: true, message: 'Role assigned successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to assign role' };
    }
  }

  revokeRole(userId: string, revokedBy: string): { success: boolean; message: string } {
    try {
      const userRoles = this.getUserRoles();
      let roleRevoked = false;

      userRoles.forEach(ur => {
        if (ur.userId === userId && ur.isActive) {
          ur.isActive = false;
          roleRevoked = true;
        }
      });

      if (!roleRevoked) {
        return { success: false, message: 'No active role found for user' };
      }

      this.saveUserRoles(userRoles);

      this.logAudit({
        userId: revokedBy,
        action: 'revoke_role',
        resource: `user:${userId}`,
        permission: 'admin:manage_users',
        success: true,
        details: { targetUser: userId }
      });

      return { success: true, message: 'Role revoked successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to revoke role' };
    }
  }

  // Permission Checking
  getUserPermissions(userId: string): Permission[] {
    const userRole = this.getUserRole(userId);
    if (!userRole) return [];

    const roleDefinition = this.getRoleByName(userRole.role);
    return roleDefinition ? roleDefinition.permissions : [];
  }

  checkPermission(userId: string, permission: Permission, resource?: string): boolean {
    const userPermissions = this.getUserPermissions(userId);
    const hasPermission = userPermissions.includes(permission);

    // Log permission check for audit
    this.logAudit({
      userId,
      action: 'check_permission',
      resource: resource || 'unknown',
      permission,
      success: hasPermission,
      details: { requestedPermission: permission, resource }
    });

    return hasPermission;
  }

  hasRole(userId: string, role: Role): boolean {
    const userRole = this.getUserRole(userId);
    return userRole?.role === role;
  }

  hasAnyRole(userId: string, roles: Role[]): boolean {
    const userRole = this.getUserRole(userId);
    return userRole ? roles.includes(userRole.role) : false;
  }

  // API Endpoint Management
  getAPIEndpoints(): APIEndpoint[] {
    const endpoints = this.storageService.getItem(API_ENDPOINTS_STORAGE_KEY);
    return endpoints ? JSON.parse(endpoints) : [];
  }

  private saveAPIEndpoints(endpoints: APIEndpoint[]): void {
    this.storageService.setItem(API_ENDPOINTS_STORAGE_KEY, JSON.stringify(endpoints));
  }

  checkAPIAccess(userId: string, path: string, method: string): { allowed: boolean; reason?: string } {
    const endpoints = this.getAPIEndpoints();
    const endpoint = endpoints.find(ep => 
      ep.path === path && ep.method === method.toUpperCase()
    );

    if (!endpoint) {
      return { allowed: false, reason: 'Endpoint not found' };
    }

    if (endpoint.isPublic) {
      return { allowed: true };
    }

    // Check if user has required permissions
    const userPermissions = this.getUserPermissions(userId);
    const hasRequiredPermissions = endpoint.requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermissions) {
      return { 
        allowed: false, 
        reason: `Missing required permissions: ${endpoint.requiredPermissions.join(', ')}` 
      };
    }

    // Check role-based access if specified
    if (endpoint.allowedRoles) {
      const userRole = this.getUserRole(userId);
      if (!userRole || !endpoint.allowedRoles.includes(userRole.role)) {
        return { 
          allowed: false, 
          reason: `Role not allowed. Required roles: ${endpoint.allowedRoles.join(', ')}` 
        };
      }
    }

    return { allowed: true };
  }

  // Audit Logging
  private logAudit(auditData: Omit<AuditLog, 'id' | 'timestamp'>): void {
    try {
      const logs = this.getAuditLogs();
      const newLog: AuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...auditData
      };

      logs.push(newLog);

      // Keep only last 1000 logs to prevent storage bloat
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }

      this.saveAuditLogs(logs);
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  getAuditLogs(limit?: number): AuditLog[] {
    const logs = this.storageService.getItem(AUDIT_LOGS_STORAGE_KEY);
    const parsedLogs = logs ? JSON.parse(logs) : [];
    
    // Sort by timestamp (newest first)
    parsedLogs.sort((a: AuditLog, b: AuditLog) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return limit ? parsedLogs.slice(0, limit) : parsedLogs;
  }

  private saveAuditLogs(logs: AuditLog[]): void {
    this.storageService.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs));
  }

  // Set user active status for RBAC
  setUserActive(userId: string, isActive: boolean): { success: boolean; message: string } {
    try {
      const userRoles = this.getUserRoles();
      let updated = false;

      userRoles.forEach(ur => {
        if (ur.userId === userId && ur.isActive) {
          // Don't change the role assignment, just track if user should have access
          // The actual access control happens in checkPermission method
          updated = true;
        }
      });

      // Log the status change
      this.logAudit({
        userId: 'system',
        action: 'set_user_active',
        resource: `user:${userId}`,
        permission: 'admin:manage_users',
        success: true,
        details: { userId, isActive, updated }
      });

      return { success: true, message: `User access ${isActive ? 'enabled' : 'disabled'}` };
    } catch (error) {
      return { success: false, message: 'Failed to update user access status' };
    }
  }

  // Utility Methods
  migrateUserToRBAC(user: User): void {
    // Migrate existing users to RBAC system
    const existingUserRole = this.getUserRole(user.id);
    if (!existingUserRole && user.role) {
      this.assignRole(user.id, user.role as Role, 'system_migration');
    }
  }

  getSystemStats(): {
    totalRoles: number;
    totalUsers: number;
    activeUserRoles: number;
    recentAuditLogs: number;
  } {
    const roles = this.getRoles();
    const userRoles = this.getUserRoles();
    const auditLogs = this.getAuditLogs();
    
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    return {
      totalRoles: roles.length,
      totalUsers: new Set(userRoles.map(ur => ur.userId)).size,
      activeUserRoles: userRoles.filter(ur => ur.isActive).length,
      recentAuditLogs: auditLogs.filter(log => 
        new Date(log.timestamp) > oneDayAgo
      ).length
    };
  }

  // Export/Import for backup
  exportRBACData(): string {
    const data = {
      roles: this.getRoles(),
      userRoles: this.getUserRoles(),
      apiEndpoints: this.getAPIEndpoints(),
      auditLogs: this.getAuditLogs(100), // Export only last 100 audit logs
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    return JSON.stringify(data, null, 2);
  }

  importRBACData(jsonData: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.roles) this.saveRoles(data.roles);
      if (data.userRoles) this.saveUserRoles(data.userRoles);
      if (data.apiEndpoints) this.saveAPIEndpoints(data.apiEndpoints);
      
      return { success: true, message: 'RBAC data imported successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to import RBAC data' };
    }
  }
}