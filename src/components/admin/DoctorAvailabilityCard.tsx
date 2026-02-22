import { Stethoscope, CheckCircle } from 'lucide-react';
import type { DoctorMetrics } from '../../types/admin';

interface DoctorAvailabilityCardProps {
  metrics: DoctorMetrics | null;
  isLoading: boolean;
}

export default function DoctorAvailabilityCard({ metrics, isLoading }: DoctorAvailabilityCardProps) {
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
        <h3 className="text-lg font-semibold text-gray-900">Doctor Availability</h3>
        <div className="bg-green-100 p-3 rounded-lg">
          <Stethoscope className="h-6 w-6 text-green-600" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Total Doctors */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600">Total Doctors</p>
          <p className="text-3xl font-bold text-gray-900">{metrics.totalDoctors}</p>
        </div>

        {/* Available Today */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
            Available Today
          </p>
          <p className="text-2xl font-bold text-green-600 mt-1">{metrics.doctorsAvailableToday}</p>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.totalDoctors > 0
              ? Math.round((metrics.doctorsAvailableToday / metrics.totalDoctors) * 100)
              : 0}
            % of total
          </p>
        </div>

        {/* By Specialization */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600 mb-2">Doctors by Specialization</p>
          <div className="space-y-2">
            {metrics.doctorsBySpecialization.length > 0 ? (
              metrics.doctorsBySpecialization.map((spec) => (
                <div key={spec.specialization} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-700">{spec.specialization}</span>
                  <span className="font-semibold text-gray-900">{spec.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No doctors available</p>
            )}
          </div>
        </div>

        {/* Top Doctors by Rating */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Top Doctors (by Rating)</p>
          <div className="space-y-2">
            {metrics.doctorWorkload
              .filter((d) => d.rating > 0)
              .sort((a, b) => b.rating - a.rating)
              .slice(0, 3)
              .map((doc) => (
                <div key={doc.doctorId} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.doctorName}</p>
                    <p className="text-xs text-gray-500">{doc.specialization}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-yellow-600">★ {doc.rating.toFixed(1)}</p>
                  </div>
                </div>
              ))}
            {metrics.doctorWorkload.filter((d) => d.rating > 0).length === 0 && (
              <p className="text-sm text-gray-500">No ratings available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
