import React, { useState, useEffect } from 'react';
import { X, Clock, Pill, Check, AlertCircle, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PrescriptionService } from '../../services/prescriptionService';
import { MedicationTracking, Prescription } from '../../types/prescription';

interface MedicationManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MedicationManagementModal({ 
  isOpen, 
  onClose 
}: MedicationManagementModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const prescriptionService = PrescriptionService.getInstance();
  
  const [activeTab, setActiveTab] = useState('today');
  const [medicationTracking, setMedicationTracking] = useState<MedicationTracking[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadMedicationData();
    }
  }, [isOpen, user]);

  const loadMedicationData = () => {
    if (!user) return;
    
    const tracking = prescriptionService.getMedicationTrackingByPatient(user.id);
    const userPrescriptions = prescriptionService.getPrescriptionsByPatient(user.id);
    
    setMedicationTracking(tracking);
    setPrescriptions(userPrescriptions);
  };

  const handleMarkTaken = async (trackingId: string) => {
    setIsLoading(true);
    const success = prescriptionService.updateMedicationStatus(
      trackingId, 
      'taken', 
      new Date().toISOString()
    );
    
    if (success) {
      loadMedicationData(); // Refresh data
    }
    setIsLoading(false);
  };

  const handleMarkSkipped = async (trackingId: string) => {
    setIsLoading(true);
    const success = prescriptionService.updateMedicationStatus(trackingId, 'skipped');
    
    if (success) {
      loadMedicationData(); // Refresh data
    }
    setIsLoading(false);
  };

  const getTodayMedications = () => {
    const today = new Date().toDateString();
    return medicationTracking.filter(track => {
      const trackDate = new Date(track.scheduledTime).toDateString();
      return trackDate === today;
    }).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  };

  const getUpcomingMedications = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return medicationTracking.filter(track => {
      const trackDate = new Date(track.scheduledTime);
      return trackDate >= tomorrow && trackDate <= nextWeek && track.status === 'scheduled';
    }).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  };

  const getMissedMedications = () => {
    const now = new Date();
    return medicationTracking.filter(track => {
      const trackDate = new Date(track.scheduledTime);
      return trackDate < now && track.status === 'scheduled';
    }).sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
  };

  const getMedicineDetails = (medicineId: string) => {
    for (const prescription of prescriptions) {
      const medicine = prescription.medicines.find(med => med.id === medicineId);
      if (medicine) {
        return medicine;
      }
    }
    return null;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: MedicationTracking['status']) => {
    switch (status) {
      case 'taken': return 'bg-green-100 text-green-800';
      case 'missed': return 'bg-red-100 text-red-800';
      case 'skipped': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: MedicationTracking['status']) => {
    switch (status) {
      case 'taken': return <Check className="h-4 w-4 text-green-600" />;
      case 'missed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'skipped': return <X className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  if (!isOpen) return null;

  const todayMeds = getTodayMedications();
  const upcomingMeds = getUpcomingMedications();
  const missedMeds = getMissedMedications();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('patient.medicineReminders')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'today', label: 'Today', count: todayMeds.length },
              { id: 'upcoming', label: 'Upcoming', count: upcomingMeds.length },
              { id: 'missed', label: 'Missed', count: missedMeds.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    tab.id === 'missed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'today' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Today's Medications
              </h3>
              {todayMeds.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Pill className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No medications scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayMeds.map((tracking) => {
                    const medicine = getMedicineDetails(tracking.medicineId);
                    if (!medicine) return null;

                    return (
                      <div
                        key={tracking.id}
                        className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                            <Pill className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{medicine.name}</h4>
                            <p className="text-sm text-gray-600">{medicine.dosage} - {medicine.instructions}</p>
                            <p className="text-sm text-gray-500">
                              {formatTime(tracking.scheduledTime)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(tracking.status)}`}>
                            {getStatusIcon(tracking.status)}
                            <span className="capitalize">{tracking.status}</span>
                          </span>

                          {tracking.status === 'scheduled' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleMarkTaken(tracking.id)}
                                disabled={isLoading}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                              >
                                Mark Taken
                              </button>
                              <button
                                onClick={() => handleMarkSkipped(tracking.id)}
                                disabled={isLoading}
                                className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                              >
                                Skip
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upcoming' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Upcoming Medications</h3>
              {upcomingMeds.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No upcoming medications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMeds.map((tracking) => {
                    const medicine = getMedicineDetails(tracking.medicineId);
                    if (!medicine) return null;

                    return (
                      <div
                        key={tracking.id}
                        className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                            <Pill className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{medicine.name}</h4>
                            <p className="text-sm text-gray-600">{medicine.dosage} - {medicine.instructions}</p>
                            <p className="text-sm text-gray-500">
                              {formatDate(tracking.scheduledTime)} at {formatTime(tracking.scheduledTime)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'missed' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-red-600">Missed Medications</h3>
              {missedMeds.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Check className="h-12 w-12 mx-auto mb-3 text-green-300" />
                  <p>Great! No missed medications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {missedMeds.map((tracking) => {
                    const medicine = getMedicineDetails(tracking.medicineId);
                    if (!medicine) return null;

                    return (
                      <div
                        key={tracking.id}
                        className="border border-red-200 bg-red-50 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{medicine.name}</h4>
                            <p className="text-sm text-gray-600">{medicine.dosage} - {medicine.instructions}</p>
                            <p className="text-sm text-red-600">
                              Missed: {formatDate(tracking.scheduledTime)} at {formatTime(tracking.scheduledTime)}
                            </p>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleMarkTaken(tracking.id)}
                            disabled={isLoading}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            Mark as Taken
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}