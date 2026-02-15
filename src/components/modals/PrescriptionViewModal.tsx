import React from 'react';
import { X, FileText, Calendar, User, Stethoscope, Pill } from 'lucide-react';
import { Prescription } from '../../types/prescription';

interface PrescriptionViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: Prescription | null;
  doctorName?: string;
  patientName?: string;
}

export default function PrescriptionViewModal({
  isOpen,
  onClose,
  prescription,
  doctorName,
  patientName
}: PrescriptionViewModalProps) {
  if (!isOpen || !prescription) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Prescription Details</h2>
                <p className="text-gray-600">Date: {prescription.date}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Information */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <User className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Patient Information</h3>
              </div>
              <p className="text-gray-700">{prescription.patientName || patientName || 'Patient'}</p>
              <p className="text-sm text-gray-500">ID: {prescription.patientId}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Stethoscope className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Doctor Information</h3>
              </div>
              <p className="text-gray-700">{doctorName || 'Doctor'}</p>
              <p className="text-sm text-gray-500">ID: {prescription.doctorId}</p>
            </div>
          </div>

          {/* Clinical Information */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Symptoms</h3>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-gray-700">{prescription.symptoms}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Diagnosis</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-gray-700">{prescription.diagnosis}</p>
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Pill className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Prescribed Medicines</h3>
            </div>
            <div className="space-y-4">
              {prescription.medicines.map((medicine) => (
                <div key={medicine.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{medicine.name}</h4>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      Qty: {medicine.quantity}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Dosage:</span>
                      <p className="font-medium text-gray-900">{medicine.dosage}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Frequency:</span>
                      <p className="font-medium text-gray-900">{medicine.frequency}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <p className="font-medium text-gray-900">{medicine.duration}</p>
                    </div>
                  </div>
                  {medicine.instructions && (
                    <div className="mt-2">
                      <span className="text-gray-500 text-sm">Instructions:</span>
                      <p className="text-gray-700 text-sm">{medicine.instructions}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid md:grid-cols-2 gap-6">
            {prescription.notes && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Additional Notes</h3>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-gray-700">{prescription.notes}</p>
                </div>
              </div>
            )}
            {prescription.followUpDate && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Follow-up Date</h3>
                <div className="bg-purple-50 p-4 rounded-lg flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <p className="text-gray-700">{prescription.followUpDate}</p>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                prescription.status === 'active' 
                  ? 'bg-green-100 text-green-800'
                  : prescription.status === 'completed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
              </span>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Print Prescription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}