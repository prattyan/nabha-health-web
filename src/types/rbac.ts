// RBAC (Role-Based Access Control) Type Definitions

export type Permission = 
  // Patient permissions
  | 'patient:view_profile'
  | 'patient:edit_profile'
  | 'patient:view_appointments'
  | 'patient:book_appointment'
  | 'patient:cancel_appointment'
  | 'patient:view_prescriptions'
  | 'patient:view_health_records'
  | 'patient:upload_documents'
  
  // Doctor permissions
  | 'doctor:view_profile'
  | 'doctor:edit_profile'
  | 'doctor:view_appointments'
  | 'doctor:manage_appointments'
  | 'doctor:create_prescription'
  | 'doctor:view_prescriptions'
  | 'doctor:view_patient_records'
  | 'doctor:edit_patient_records'
  | 'doctor:manage_availability'
  | 'doctor:conduct_consultation'
  
  // Health Worker permissions
  | 'healthworker:view_profile'
  | 'healthworker:edit_profile'
  | 'healthworker:view_patients'
  | 'healthworker:assist_patients'
  | 'healthworker:view_appointments'
  | 'healthworker:schedule_appointments'
  | 'healthworker:view_prescriptions'
  | 'healthworker:collect_vitals'
  | 'healthworker:manage_village_health'
  
  // Pharmacy permissions
  | 'pharmacy:view_profile'
  | 'pharmacy:edit_profile'
  | 'pharmacy:view_prescriptions'
  | 'pharmacy:dispense_medication'
  | 'pharmacy:manage_inventory'
  | 'pharmacy:update_stock'
  | 'pharmacy:view_orders'
  | 'pharmacy:process_orders'
  
  // Admin permissions
  | 'admin:view_all_users'
  | 'admin:manage_users'
  | 'admin:view_system_stats'
  | 'admin:manage_roles'
  | 'admin:manage_permissions'
  | 'admin:view_audit_logs'
  | 'admin:system_configuration'
  | 'admin:backup_restore'
  | 'admin:manage_hospitals'
  | 'admin:manage_pharmacies'
  
  // System permissions
  | 'system:api_access'
  | 'system:read_data'
  | 'system:write_data'
  | 'system:delete_data';

export type Role = 'patient' | 'doctor' | 'healthworker' | 'pharmacy' | 'admin';

export interface RoleDefinition {
  name: Role;
  displayName: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean; // Cannot be deleted or modified
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  userId: string;
  role: Role;
  assignedBy: string; // Admin user ID who assigned this role
  assignedAt: string;
  isActive: boolean;
  expiresAt?: string; // Optional expiration date
}

export interface PermissionCheck {
  userId: string;
  permission: Permission;
  resource?: string; // Optional resource identifier
  context?: Record<string, any>; // Additional context for permission checking
}

export interface RBACContext {
  currentUser: {
    id: string;
    roles: Role[];
    permissions: Permission[];
  };
  checkPermission: (permission: Permission, resource?: string) => boolean;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  hasAllRoles: (roles: Role[]) => boolean;
}

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requiredPermissions: Permission[];
  allowedRoles?: Role[]; // Optional: specific roles allowed
  isPublic?: boolean; // Public endpoints don't require authentication
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  permission: Permission;
  success: boolean;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

// Default role definitions
export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    name: 'patient',
    displayName: 'Patient',
    description: 'Patients seeking healthcare services',
    permissions: [
      'patient:view_profile',
      'patient:edit_profile',
      'patient:view_appointments',
      'patient:book_appointment',
      'patient:cancel_appointment',
      'patient:view_prescriptions',
      'patient:view_health_records',
      'patient:upload_documents',
      'system:api_access',
      'system:read_data'
    ],
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'doctor',
    displayName: 'Doctor',
    description: 'Medical doctors providing healthcare services',
    permissions: [
      'doctor:view_profile',
      'doctor:edit_profile',
      'doctor:view_appointments',
      'doctor:manage_appointments',
      'doctor:create_prescription',
      'doctor:view_prescriptions',
      'doctor:view_patient_records',
      'doctor:edit_patient_records',
      'doctor:manage_availability',
      'doctor:conduct_consultation',
      'system:api_access',
      'system:read_data',
      'system:write_data'
    ],
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'healthworker',
    displayName: 'Health Worker',
    description: 'Community health workers assisting patients',
    permissions: [
      'healthworker:view_profile',
      'healthworker:edit_profile',
      'healthworker:view_patients',
      'healthworker:assist_patients',
      'healthworker:view_appointments',
      'healthworker:schedule_appointments',
      'healthworker:view_prescriptions',
      'healthworker:collect_vitals',
      'healthworker:manage_village_health',
      'system:api_access',
      'system:read_data',
      'system:write_data'
    ],
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'pharmacy',
    displayName: 'Pharmacy',
    description: 'Pharmacy staff managing medications and prescriptions',
    permissions: [
      'pharmacy:view_profile',
      'pharmacy:edit_profile',
      'pharmacy:view_prescriptions',
      'pharmacy:dispense_medication',
      'pharmacy:manage_inventory',
      'pharmacy:update_stock',
      'pharmacy:view_orders',
      'pharmacy:process_orders',
      'system:api_access',
      'system:read_data',
      'system:write_data'
    ],
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'System administrators with full access',
    permissions: [
      // All patient permissions
      'patient:view_profile',
      'patient:edit_profile',
      'patient:view_appointments',
      'patient:book_appointment',
      'patient:cancel_appointment',
      'patient:view_prescriptions',
      'patient:view_health_records',
      'patient:upload_documents',
      
      // All doctor permissions
      'doctor:view_profile',
      'doctor:edit_profile',
      'doctor:view_appointments',
      'doctor:manage_appointments',
      'doctor:create_prescription',
      'doctor:view_prescriptions',
      'doctor:view_patient_records',
      'doctor:edit_patient_records',
      'doctor:manage_availability',
      'doctor:conduct_consultation',
      
      // All health worker permissions
      'healthworker:view_profile',
      'healthworker:edit_profile',
      'healthworker:view_patients',
      'healthworker:assist_patients',
      'healthworker:view_appointments',
      'healthworker:schedule_appointments',
      'healthworker:view_prescriptions',
      'healthworker:collect_vitals',
      'healthworker:manage_village_health',
      
      // All pharmacy permissions
      'pharmacy:view_profile',
      'pharmacy:edit_profile',
      'pharmacy:view_prescriptions',
      'pharmacy:dispense_medication',
      'pharmacy:manage_inventory',
      'pharmacy:update_stock',
      'pharmacy:view_orders',
      'pharmacy:process_orders',
      
      // Admin-specific permissions
      'admin:view_all_users',
      'admin:manage_users',
      'admin:view_system_stats',
      'admin:manage_roles',
      'admin:manage_permissions',
      'admin:view_audit_logs',
      'admin:system_configuration',
      'admin:backup_restore',
      'admin:manage_hospitals',
      'admin:manage_pharmacies',
      
      // All system permissions
      'system:api_access',
      'system:read_data',
      'system:write_data',
      'system:delete_data'
    ],
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];