import React from 'react';
import { HardDrive, AlertCircle, CheckCircle } from 'lucide-react';
import type { SystemMetrics } from '../../types/admin';

interface SystemHealthCardProps {
  metrics: SystemMetrics | null;
  isLoading: boolean;
}

export default function SystemHealthCard({ metrics, isLoading }: SystemHealthCardProps) {
  if (isLoading || !metrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const { storageUsage, dataIntegrity, userStats } = metrics;
  const storagePercentage = Math.min(storageUsage.percentUsed, 100);
  const isStorageWarning = storagePercentage > 70;
  const isStorageCritical = storagePercentage > 90;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        <div className={`${dataIntegrity.isValid ? 'bg-green-100' : 'bg-red-100'} p-3 rounded-lg`}>
          {dataIntegrity.isValid ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <AlertCircle className="h-6 w-6 text-red-600" />
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Data Integrity Status */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Data Integrity</p>
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${
                dataIntegrity.isValid
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {dataIntegrity.isValid ? 'Valid' : 'Issues Found'}
            </span>
          </div>
          {dataIntegrity.issues.length > 0 && (
            <div className="mt-2 space-y-1">
              {dataIntegrity.issues.map((issue, idx) => (
                <p key={idx} className="text-xs text-red-600">
                  • {issue}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Storage Usage */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 flex items-center">
              <HardDrive className="w-4 h-4 mr-2" />
              Storage Usage
            </p>
            <span className="text-sm font-semibold text-gray-900">
              {(storageUsage.used / 1024).toFixed(1)} KB / {(storageUsage.available / 1024).toFixed(0)} KB
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isStorageCritical ? 'bg-red-500' : isStorageWarning ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${storagePercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">{storagePercentage}% used</p>
        </div>

        {/* Total Records */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600">Total Records in System</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{dataIntegrity.totalRecords}</p>
        </div>

        {/* User Statistics */}
        <div>
          <p className="text-sm text-gray-600 mb-2">User Distribution</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-2xl font-bold text-gray-900">{userStats.totalUsers}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-2xl font-bold text-blue-600">{userStats.patients}</p>
              <p className="text-xs text-gray-500">Patients</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-2xl font-bold text-green-600">{userStats.doctors}</p>
              <p className="text-xs text-gray-500">Doctors</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-2xl font-bold text-purple-600">{userStats.healthworkers}</p>
              <p className="text-xs text-gray-500">Health Workers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
