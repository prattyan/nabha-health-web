import React, { createContext, useContext, useEffect, useState } from 'react';
import { Permission, Role, RBACContext as IRBACContext } from '../types/rbac';
import { RBACService } from '../services/rbacService';
import { useAuth } from './AuthContext';

const RBACContext = createContext<IRBACContext | undefined>(undefined);

export const RBACProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [rbacService] = useState(() => RBACService.getInstance());
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [userRoles, setUserRoles] = useState<Role[]>([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Ensure RBAC role is assigned immediately and synchronously
      rbacService.migrateUserToRBAC(user);
      
      // Force immediate role assignment if not exists
      const existingRole = rbacService.getUserRole(user.id);
      if (!existingRole && user.role) {
        rbacService.assignRole(user.id, user.role as Role, 'system_migration');
      }
      
      // Get user permissions and roles after ensuring role is assigned
      const permissions = rbacService.getUserPermissions(user.id);
      const userRole = rbacService.getUserRole(user.id);
      
      setUserPermissions(permissions);
      setUserRoles(userRole ? [userRole.role] : []);
      
      // Debug logging
      console.log('RBAC initialized for user:', {
        userId: user.id,
        userRole: user.role,
        assignedRole: userRole?.role,
        permissions: permissions.length,
        hasPharmacyPermissions: permissions.includes('pharmacy:manage_inventory' as Permission)
      });
    } else {
      setUserPermissions([]);
      setUserRoles([]);
    }
  }, [user, isAuthenticated, rbacService]);

  const checkPermission = (permission: Permission, resource?: string): boolean => {
    if (!user) return false;
    return rbacService.checkPermission(user.id, permission, resource);
  };

  const hasRole = (role: Role): boolean => {
    return userRoles.includes(role);
  };

  const hasAnyRole = (roles: Role[]): boolean => {
    return roles.some(role => userRoles.includes(role));
  };

  const hasAllRoles = (roles: Role[]): boolean => {
    return roles.every(role => userRoles.includes(role));
  };

  const contextValue: IRBACContext = {
    currentUser: {
      id: user?.id || '',
      roles: userRoles,
      permissions: userPermissions,
    },
    checkPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
  };

  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
};

export const useRBAC = (): IRBACContext => {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};

// Higher-order component for permission-based rendering
export const withPermission = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: Permission,
  fallback?: React.ComponentType<P>
) => {
  return (props: P) => {
    const { checkPermission } = useRBAC();
    
    if (checkPermission(requiredPermission)) {
      return <Component {...props} />;
    }
    
    if (fallback) {
      const FallbackComponent = fallback;
      return <FallbackComponent {...props} />;
    }
    
    return null;
  };
};

// Higher-order component for role-based rendering
export const withRole = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles: Role | Role[],
  fallback?: React.ComponentType<P>
) => {
  return (props: P) => {
    const { hasRole, hasAnyRole } = useRBAC();
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const hasRequiredRole = roles.length === 1 ? hasRole(roles[0]) : hasAnyRole(roles);
    
    if (hasRequiredRole) {
      return <Component {...props} />;
    }
    
    if (fallback) {
      const FallbackComponent = fallback;
      return <FallbackComponent {...props} />;
    }
    
    return null;
  };
};

// Component for conditional rendering based on permissions
export const PermissionGate: React.FC<{
  permission: Permission;
  resource?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permission, resource, children, fallback = null }) => {
  const { checkPermission } = useRBAC();
  
  const hasPermission = checkPermission(permission, resource);
  
  // Debug logging for pharmacy permissions
  if (permission.startsWith('pharmacy:')) {
    console.log('PermissionGate check:', {
      permission,
      hasPermission,
      resource
    });
  }
  
  if (hasPermission) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

// Component for conditional rendering based on roles
export const RoleGate: React.FC<{
  roles: Role | Role[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ roles, requireAll = false, children, fallback = null }) => {
  const { hasRole, hasAnyRole, hasAllRoles } = useRBAC();
  
  const roleArray = Array.isArray(roles) ? roles : [roles];
  let hasAccess = false;
  
  if (roleArray.length === 1) {
    hasAccess = hasRole(roleArray[0]);
  } else if (requireAll) {
    hasAccess = hasAllRoles(roleArray);
  } else {
    hasAccess = hasAnyRole(roleArray);
  }
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

// Hook for API access checking
export const useAPIAccess = () => {
  const { user } = useAuth();
  const [rbacService] = useState(() => RBACService.getInstance());

  const checkAPIAccess = (path: string, method: string) => {
    if (!user) return { allowed: false, reason: 'User not authenticated' };
    return rbacService.checkAPIAccess(user.id, path, method);
  };

  return { checkAPIAccess };
};