import { Users, TrendingUp } from 'lucide-react';
import type { PatientLoadMetrics } from '../../types/admin';

interface PatientLoadCardProps {
  metrics: PatientLoadMetrics | null;
  isLoading: boolean;
}

export default function PatientLoadCard({ metrics, isLoading }: PatientLoadCardProps) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Patient Load</h3>
        <div className="bg-blue-100 p-3 rounded-lg">
          <Users className="h-6 w-6 text-blue-600" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Total Patients */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600">Total Patients</p>
          <p className="text-3xl font-bold text-gray-900">{metrics.totalPatients}</p>
        </div>

        {/* Active Patients */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600">Active Patients (This Week)</p>
          <p className="text-2xl font-bold text-green-600">{metrics.activePatients}</p>
          <p className="text-xs text-gray-500 mt-1">
            {Math.round((metrics.activePatients / metrics.totalPatients) * 100)}% of total
          </p>
        </div>

        {/* New Registrations */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600">New Registrations</p>
          <div className="flex space-x-4 mt-2">
            <div>
              <p className="text-lg font-semibold text-blue-600">{metrics.newRegistrationsThisWeek}</p>
              <p className="text-xs text-gray-500">This Week</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-blue-600">{metrics.newRegistrationsThisMonth}</p>
              <p className="text-xs text-gray-500">This Month</p>
            </div>
          </div>
        </div>

        {/* Appointment Load */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Appointment Load
          </p>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-lg font-semibold text-gray-900">{metrics.appointmentLoad.today}</p>
              <p className="text-xs text-gray-500">Today</p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-lg font-semibold text-gray-900">{metrics.appointmentLoad.thisWeek}</p>
              <p className="text-xs text-gray-500">This Week</p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-lg font-semibold text-gray-900">{metrics.appointmentLoad.thisMonth}</p>
              <p className="text-xs text-gray-500">This Month</p>
            </div>
          </div>
        </div>

        {/* No-Show Rate */}
        <div>
          <p className="text-sm text-gray-600">Appointment No-Show Rate</p>
          <div className="mt-2 flex items-center">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  metrics.appointmentNoShowRate > 20 ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(metrics.appointmentNoShowRate, 100)}%` }}
              ></div>
            </div>
            <p className="ml-3 font-semibold text-gray-900">{metrics.appointmentNoShowRate}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
