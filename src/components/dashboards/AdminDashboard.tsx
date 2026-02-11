import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/authService';
import { PrescriptionService } from '../../services/prescriptionService';
import { Settings, LogOut, RefreshCw } from 'lucide-react';
import PatientLoadCard from '../admin/PatientLoadCard';
import DoctorAvailabilityCard from '../admin/DoctorAvailabilityCard';
import SystemHealthCard from '../admin/SystemHealthCard';
import PharmacyStockCard from '../admin/PharmacyStockCard';
import TriageLogsCard from '../admin/TriageLogsCard';
import DataManagementSection from '../admin/DataManagementSection';
import ActivityLogsCard from '../admin/ActivityLogsCard';
import AdminTasksCard from '../admin/AdminTasksCard';
import type { PatientLoadMetrics, DoctorMetrics, SystemMetrics } from '../../types/admin';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const authService = AuthService.getInstance();
  const prescriptionService = PrescriptionService.getInstance();

  const [activeTab, setActiveTab] = useState<'tasks' | 'overview' | 'users' | 'system' | 'pharmacy' | 'triage' | 'data' | 'activity'>('tasks');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  // Metrics state
  const [patientLoadMetrics, setPatientLoadMetrics] = useState<PatientLoadMetrics | null>(null);
  const [doctorMetrics, setDoctorMetrics] = useState<DoctorMetrics | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);

  // Load metrics
  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);

      // Get patient load metrics
      const patientLoad = prescriptionService.getPatientLoadMetrics(authService);
      setPatientLoadMetrics(patientLoad);

      // Get doctor metrics
      const doctors = authService.getDoctorStats();
      setDoctorMetrics(doctors);

      // Get system metrics
      const system = authService.getSystemMetrics();
      setSystemMetrics(system);

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleRefresh = () => {
    loadMetrics();
  };

  // Redirect if not admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">System Monitoring & Analytics</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="text-sm font-semibold text-gray-900">{lastUpdated}</p>
              </div>
              <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Settings className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8 overflow-x-auto">
          <div className="flex border-b min-w-max">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
                activeTab === 'tasks'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
                activeTab === 'system'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              System
            </button>
            <button
              onClick={() => setActiveTab('pharmacy')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
                activeTab === 'pharmacy'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pharmacy
            </button>
            <button
              onClick={() => setActiveTab('triage')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
                activeTab === 'triage'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Triage
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
                activeTab === 'data'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Data Management
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
                activeTab === 'activity'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Activity Logs
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>

        {/* My Tasks Tab */}
        {activeTab === 'tasks' && (
          <AdminTasksCard adminId={user?.id || ''} isLoading={isLoading} />
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-3 gap-6">
            <PatientLoadCard metrics={patientLoadMetrics} isLoading={isLoading} />
            <DoctorAvailabilityCard metrics={doctorMetrics} isLoading={isLoading} />
            <SystemHealthCard metrics={systemMetrics} isLoading={isLoading} />
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Registered Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">ID</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Role</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {authService.getAllUsers().map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-900 font-mono text-xs">{u.id}</td>
                      <td className="px-6 py-3 text-gray-900">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-6 py-3 text-gray-600">{u.email}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'doctor'
                              ? 'bg-green-100 text-green-800'
                              : u.role === 'healthworker'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">System Information</h2>
            {systemMetrics && (
              <div className="space-y-6">
                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Storage Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Storage Used</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(systemMetrics.storageUsage.used / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Storage Limit</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(systemMetrics.storageUsage.available / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Integrity</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`ml-2 font-semibold ${
                          systemMetrics.dataIntegrity.isValid ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {systemMetrics.dataIntegrity.isValid ? 'Valid' : 'Issues Detected'}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-600">Total Records:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {systemMetrics.dataIntegrity.totalRecords}
                      </span>
                    </p>
                    {systemMetrics.dataIntegrity.issues.length > 0 && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg">
                        <p className="text-sm font-semibold text-red-800 mb-2">Issues Found:</p>
                        <ul className="space-y-1">
                          {systemMetrics.dataIntegrity.issues.map((issue, idx) => (
                            <li key={idx} className="text-sm text-red-700">
                              • {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">User Statistics</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {systemMetrics.userStats.totalUsers}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-green-600">
                        {systemMetrics.userStats.activeUsers}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Admins</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {systemMetrics.userStats.admins}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pharmacy Tab */}
        {activeTab === 'pharmacy' && (
          <PharmacyStockCard isLoading={isLoading} />
        )}

        {/* Triage Tab */}
        {activeTab === 'triage' && (
          <TriageLogsCard isLoading={isLoading} />
        )}

        {/* Data Management Tab */}
        {activeTab === 'data' && (
          <DataManagementSection isLoading={isLoading} />
        )}

        {/* Activity Logs Tab */}
        {activeTab === 'activity' && (
          <ActivityLogsCard isLoading={isLoading} />
        )}
      </div>
    </div>
  );
}

