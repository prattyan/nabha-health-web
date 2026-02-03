import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRBAC, PermissionGate } from '../../contexts/RBACContext';
import { RBACService } from '../../services/rbacService';
import { AuthService } from '../../services/authService';
import { 
  Users, 
  Shield, 
  Activity, 
  Settings, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Database,
  Lock,
  Eye,
  UserPlus,
  UserMinus,
  Download,
  Upload
} from 'lucide-react';
import { User } from '../../types/auth';
import { RoleDefinition, AuditLog } from '../../types/rbac';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { checkPermission } = useRBAC();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemStats, setSystemStats] = useState<any>({});

  const rbacService = RBACService.getInstance();
  const authService = AuthService.getInstance();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    if (checkPermission('admin:view_all_users')) {
      setUsers(authService.getAllUsers());
    }
    
    if (checkPermission('admin:manage_roles')) {
      setRoles(rbacService.getRoles());
    }
    
    if (checkPermission('admin:view_audit_logs')) {
      setAuditLogs(rbacService.getAuditLogs(50));
    }
    
    if (checkPermission('admin:view_system_stats')) {
      const stats = rbacService.getSystemStats();
      const authStats = authService.getRegistrationStats();
      setSystemStats({ ...stats, ...authStats });
    }
  };

  const handleUserStatusToggle = async (userId: string, currentStatus: boolean) => {
    if (!checkPermission('admin:manage_users')) {
      alert('You do not have permission to manage users');
      return;
    }

    const newStatus = !currentStatus;
    const action = newStatus ? 'activated' : 'deactivated';

    try {
      // Persist status change in AuthService
      const success = authService.updateUserStatus(userId, newStatus);
      if (!success) {
        alert('Failed to update user status');
        return;
      }

      // Update RBAC access for inactive users
      if (!newStatus) {
        // Revoke RBAC access for deactivated users
        rbacService.setUserActive(userId, false);
      } else {
        // Restore RBAC access for activated users
        rbacService.setUserActive(userId, true);
      }

      // Update local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, isActive: newStatus } : u
      ));

      alert(`User ${action} successfully`);
    } catch (error) {
      console.error('Failed to update user status:', error);
      alert(`Failed to ${action.slice(0, -1)} user`);
    }
  };

  const handleRoleAssignment = (userId: string, newRole: string) => {
    if (!checkPermission('admin:manage_users')) {
      alert('You do not have permission to manage user roles');
      return;
    }

    // Security check: Don't allow role changes for inactive users
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser?.isActive) {
      alert('Cannot change role for inactive user. Please activate the user first.');
      return;
    }

    // Update the user's role in AuthService first
    const success = authService.updateUserRole(userId, newRole as any);
    if (!success) {
      alert('Failed to update user role in user data');
      return;
    }

    // Then assign the RBAC role
    const result = rbacService.assignRole(userId, newRole as any, user?.id || 'admin');
    if (result.success) {
      // Update local state to reflect the change immediately
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole as any } : u
      ));
      alert(`Role changed to ${newRole} successfully`);
    } else {
      // Revert the user role change if RBAC assignment failed
      authService.updateUserRole(userId, users.find(u => u.id === userId)?.role || 'patient');
      alert(result.message);
    }
  };

  const handleExportData = () => {
    if (!checkPermission('admin:backup_restore')) {
      alert('You do not have permission to export data');
      return;
    }

    const rbacData = rbacService.exportRBACData();
    const userData = authService.exportUserData();
    
    const exportData = {
      rbac: JSON.parse(rbacData),
      users: JSON.parse(userData),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nabhacare-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-600 bg-red-100';
      case 'doctor': return 'text-blue-600 bg-blue-100';
      case 'healthworker': return 'text-green-600 bg-green-100';
      case 'pharmacy': return 'text-purple-600 bg-purple-100';
      case 'patient': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'text-green-600 bg-green-100' 
      : 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            System Administration - {user?.firstName} {user?.lastName}
          </p>
        </div>

        {/* Stats Cards */}
        <PermissionGate permission="admin:view_system_stats">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.total || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Roles</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.totalRoles || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.recentAuditLogs || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">New Registrations</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.recentRegistrations || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </PermissionGate>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Activity },
              { id: 'users', name: 'User Management', icon: Users },
              { id: 'roles', name: 'Role Management', icon: Shield },
              { id: 'audit', name: 'Audit Logs', icon: FileText },
              { id: 'system', name: 'System Settings', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PermissionGate permission="admin:manage_users">
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                    <UserPlus className="h-6 w-6 text-blue-600 mb-2" />
                    <h4 className="font-medium">Manage Users</h4>
                    <p className="text-sm text-gray-600">Add, edit, or deactivate users</p>
                  </button>
                </PermissionGate>

                <PermissionGate permission="admin:manage_roles">
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                    <Shield className="h-6 w-6 text-green-600 mb-2" />
                    <h4 className="font-medium">Role Management</h4>
                    <p className="text-sm text-gray-600">Configure roles and permissions</p>
                  </button>
                </PermissionGate>

                <PermissionGate permission="admin:backup_restore">
                  <button 
                    onClick={handleExportData}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <Download className="h-6 w-6 text-purple-600 mb-2" />
                    <h4 className="font-medium">Export Data</h4>
                    <p className="text-sm text-gray-600">Backup system data</p>
                  </button>
                </PermissionGate>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">User Authentication</span>
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">RBAC System</span>
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Data Storage</span>
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Operational
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <PermissionGate permission="admin:view_all_users">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">User Management</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(rbacService.getUserRole(user.id)?.role || user.role)}`}>
                            {rbacService.getUserRole(user.id)?.role || user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.isActive)}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <PermissionGate permission="admin:manage_users">
                            <button
                              onClick={() => handleUserStatusToggle(user.id, user.isActive)}
                              className={`mr-3 ${user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <select
                              value={rbacService.getUserRole(user.id)?.role || user.role}
                              onChange={(e) => handleRoleAssignment(user.id, e.target.value)}
                              disabled={!user.isActive}
                              className={`border border-gray-300 rounded px-2 py-1 ${
                                user.isActive 
                                  ? 'text-blue-600 bg-white hover:bg-gray-50' 
                                  : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                              }`}
                              title={!user.isActive ? 'Activate user first to change role' : 'Change user role'}
                            >
                              <option value="patient">Patient</option>
                              <option value="doctor">Doctor</option>
                              <option value="healthworker">Health Worker</option>
                              <option value="pharmacy">Pharmacy</option>
                              <option value="admin">Admin</option>
                            </select>
                          </PermissionGate>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </PermissionGate>
        )}

        {activeTab === 'roles' && (
          <PermissionGate permission="admin:manage_roles">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Role Management</h3>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {roles.map((role) => (
                    <div key={role.name} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{role.displayName}</h4>
                          <p className="text-sm text-gray-600">{role.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {role.isSystemRole && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              System Role
                            </span>
                          )}
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(role.name)}`}>
                            {role.name}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Permissions ({role.permissions.length})</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {role.permissions.slice(0, 8).map((permission) => (
                            <span key={permission} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {permission.split(':')[1]?.replace('_', ' ') || permission}
                            </span>
                          ))}
                          {role.permissions.length > 8 && (
                            <span className="text-xs text-gray-500">
                              +{role.permissions.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PermissionGate>
        )}

        {activeTab === 'audit' && (
          <PermissionGate permission="admin:view_audit_logs">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Audit Logs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resource
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.userId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.resource}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            log.success ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                          }`}>
                            {log.success ? 'Success' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </PermissionGate>
        )}

        {activeTab === 'system' && (
          <PermissionGate permission="admin:system_configuration">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Configuration</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Security Settings</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Enable audit logging</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Require strong passwords</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span className="ml-2 text-sm text-gray-700">Enable two-factor authentication</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Data Management</h4>
                  <div className="flex space-x-4">
                    <button 
                      onClick={handleExportData}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Backup
                    </button>
                    <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Data
                    </button>
                  </div>
                </div>

                <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                  Save Configuration
                </button>
              </div>
            </div>
          </PermissionGate>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;