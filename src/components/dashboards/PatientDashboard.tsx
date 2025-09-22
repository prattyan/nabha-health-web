import React, { useState } from 'react';
import { Calendar, Video, Pill, Heart, Clock, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PrescriptionService } from '../../services/prescriptionService';
import VideoCallModal from '../modals/VideoCallModal';
import { Prescription, Appointment } from '../../types/prescription';
import PrescriptionViewModal from '../modals/PrescriptionViewModal';
import AppointmentBookingModal from '../modals/AppointmentBookingModal';
import MedicationManagementModal from '../modals/MedicationManagementModal';

export default function PatientDashboard() {
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [videoCallRoomId, setVideoCallRoomId] = useState<string | null>(null);

  function handleStartCall(appointment: Appointment) {
    setVideoCallRoomId(appointment.id);
    setShowVideoCall(true);
  }
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [showPrescriptionView, setShowPrescriptionView] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showAppointmentBooking, setShowAppointmentBooking] = useState(false);
  const [showMedicationManagement, setShowMedicationManagement] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  const prescriptionService = PrescriptionService.getInstance();

  React.useEffect(() => {
    if (user) {
      loadPatientData();
    }
  }, [user]);

  const loadPatientData = () => {
  if (!user) return;
  // Removed initialization of sample prescription and appointment for new patients
  const patientAppointments = prescriptionService.getAppointmentsByPatient(user.id);
    const patientPrescriptions = prescriptionService.getPrescriptionsByPatient(user.id);
    setAppointments(patientAppointments);
    setPrescriptions(patientPrescriptions);
  };

  const handleViewPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowPrescriptionView(true);
  };

  const handleRescheduleAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
  };

  const handleCancelAppointment = (appointmentId: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      prescriptionService.updateAppointment(appointmentId, { status: 'cancelled' });
      // Reload appointments
      loadPatientData();
    }
  };

  const handleRescheduleConfirm = (newDate: string, newTime: string) => {
    if (selectedAppointment) {
      prescriptionService.rescheduleAppointment(selectedAppointment.id, newDate, newTime);
      // Reload appointments
      loadPatientData();
      setShowRescheduleModal(false);
      setSelectedAppointment(null);
    }
  };

  const handleAppointmentBooked = (appointment: Appointment) => {
    // Reload appointments after booking
    loadPatientData();
    setShowAppointmentBooking(false);
  };

  const handleMarkMedicineTaken = (trackingId: string) => {
    const success = prescriptionService.updateMedicationStatus(
      trackingId, 
      'taken', 
      new Date().toISOString()
    );
    if (success) {
      // Reload data to update the UI
      loadPatientData();
    }
  };

  const getActiveMedicines = () => {
    if (!user) return [];
    
    // Get today's medication tracking entries
    const today = new Date().toDateString();
    const medicationTracking = prescriptionService.getMedicationTrackingByPatient(user.id);
    const todayMedications = medicationTracking.filter(track => {
      const trackDate = new Date(track.scheduledTime).toDateString();
      return trackDate === today;
    });

    // Get medicine details from prescriptions
    const getMedicineFromTracking = (tracking: any) => {
      for (const prescription of prescriptions) {
        const medicine = prescription.medicines.find(med => med.id === tracking.medicineId);
        if (medicine) {
          return {
            id: tracking.id,
            name: medicine.name,
            time: new Date(tracking.scheduledTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }),
            status: tracking.status,
            dosage: medicine.dosage,
            instructions: medicine.instructions,
            remainingQuantity: medicine.remainingQuantity
          };
        }
      }
      return null;
    };

    return todayMedications
      .map(getMedicineFromTracking)
      .filter(med => med !== null)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  };

  const medicineReminders = getActiveMedicines();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('dashboard.welcome')}, {user?.firstName}!
              </h1>
              <p className="text-gray-600 mt-1">{t('patient.manageHealth')}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">{t('patient.patientId')}</p>
                <p className="font-semibold text-gray-900">{user?.id.slice(-8).toUpperCase()}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{appointments.filter(apt => apt.status === 'scheduled').length}</p>
                <p className="text-gray-600">{t('patient.upcoming')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{prescriptions.length}</p>
                <p className="text-gray-600">{t('dashboard.records')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Pill className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{medicineReminders.length}</p>
                <p className="text-gray-600">{t('dashboard.medicines')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-lg">
                <Heart className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{t('patient.good')}</p>
                <p className="text-gray-600">{t('patient.healthScore')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: t('dashboard.overview'), icon: Heart },
                { id: 'appointments', label: t('dashboard.appointments'), icon: Calendar },
                { id: 'records', label: t('dashboard.records'), icon: Heart },
                { id: 'medicines', label: t('dashboard.medicines'), icon: Pill }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('patient.recentActivity')}</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                      <Video className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{t('patient.videoCompleted')}</p>
                        <p className="text-sm text-gray-600">
                          {prescriptions.length > 0 
                            ? `${t('patient.videoCompleted')} - ${prescriptions[0]?.date}`
                            : t('patient.videoCompleted')
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                      <Heart className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{t('patient.recordsUpdated')}</p>
                        <p className="text-sm text-gray-600">
                          {prescriptions.length} {t('dashboard.records')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('patient.healthSummary')}</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('patient.bloodPressure')}</span>
                        <span className="font-medium text-green-600">{t('patient.normal')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('patient.bloodSugar')}</span>
                        <span className="font-medium text-yellow-600">{t('patient.monitor')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('patient.weight')}</span>
                        <span className="font-medium text-green-600">{t('patient.stable')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appointments' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">{t('patient.upcoming')} {t('dashboard.appointments')}</h3>
                  <button 
                    onClick={() => setShowAppointmentBooking(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t('patient.bookAppointment')}
                  </button>
                </div>
                <div className="space-y-4">
                  {[...appointments]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{appointment.doctorName}</h4>
                          <p className="text-gray-600">{appointment.specialization}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{t('common.date')}: {appointment.date}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{t('common.time')}: {appointment.time}</span>
                            </span>
                          </div>
                        </div>
                        {appointment.status === 'scheduled' && (
                          <div className="flex space-x-2">
                            <button
                              className={`bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors${appointment.status !== 'scheduled' ? ' cursor-not-allowed bg-gray-300 text-gray-500' : ''}`}
                              disabled={appointment.status !== 'scheduled'}
                              onClick={() => appointment.status === 'scheduled' ? handleStartCall(appointment) : undefined}
                            >
                              {t('doctor.startCall')}
                            </button>
      <VideoCallModal
        isOpen={showVideoCall && !!videoCallRoomId}
        onClose={() => {
          setShowVideoCall(false);
          setVideoCallRoomId(null);
        }}
        roomId={videoCallRoomId || ''}
      />
                            <button 
                              onClick={() => handleRescheduleAppointment(appointment)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              {t('doctor.reschedule')}
                            </button>
                            <button 
                              onClick={() => handleCancelAppointment(appointment.id)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'records' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('dashboard.records')}</h3>
                <div className="space-y-4">
                  {prescriptions.map((prescription) => {
                    return (
                      <div key={prescription.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                {t('prescription.details')}
                              </span>
                              <span className="text-sm text-gray-500">{prescription.date}</span>
                            </div>
                            <h4 className="font-semibold text-gray-900">{prescription.diagnosis}</h4>
                            <p className="text-gray-600">Doctor ID: {prescription.doctorId}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {t('dashboard.medicines')}: {prescription.medicines.length}
                            </p>
                            <ul className="mt-2 ml-2 list-disc">
                              {prescription.medicines.map((med, idx) => (
                                <li key={med.id || idx} className="mb-1">
                                  <span className="font-medium text-gray-900">{med.name}</span>
                                  {med.pharmacy && (
                                    <span className="ml-2 text-xs text-green-700">(Available at: {med.pharmacy})</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <button
                              onClick={() => handleViewPrescription(prescription)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              {t('common.view')} {t('patient.details')}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'medicines' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">{t('patient.medicineReminders')}</h3>
                  <button 
                    onClick={() => setShowMedicationManagement(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Manage Medications
                  </button>
                </div>
                <div className="space-y-4">
                  {medicineReminders.map((medicine, index) => (
                    <div key={medicine.id || index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          medicine.status === 'taken' ? 'bg-green-500' : 
                          medicine.status === 'missed' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                        <div>
                          <h4 className="font-medium text-gray-900">{medicine.name}</h4>
                          <p className="text-sm text-gray-600">{medicine.time}</p>
                          {medicine.dosage && (
                            <p className="text-xs text-gray-500">{medicine.dosage}</p>
                          )}
                          {medicine.remainingQuantity && (
                            <p className="text-xs text-gray-500">Remaining: {medicine.remainingQuantity}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {(medicine.status === 'scheduled' || medicine.status === 'missed') && (
                          <button 
                            onClick={() => handleMarkMedicineTaken(medicine.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                          >
                            {t('patient.markTaken')}
                          </button>
                        )}
                        <button 
                          onClick={() => setShowMedicationManagement(true)}
                          className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-50 transition-colors"
                        >
                          {t('patient.details')}
                        </button>
                      </div>
                    </div>
                  ))}
                  {medicineReminders.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No medications scheduled for today</p>
                      <p className="text-sm">Check the medication management for upcoming doses</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PrescriptionViewModal
        isOpen={showPrescriptionView}
        onClose={() => {
          setShowPrescriptionView(false);
          setSelectedPrescription(null);
        }}
        prescription={selectedPrescription}
        patientName={user?.firstName + ' ' + user?.lastName}
      />

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reschedule Appointment
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Date
                </label>
                <input
                  placeholder="Enter value"
                  title="Input field"
                  type="date"
                  id="reschedule-date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Time
                </label>
                <select
                  title="Select option"
                  id="reschedule-time"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select time</option>
                  {(() => {
                    if (!selectedAppointment) return null;
                    const allSlots = [
                      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
                    ];
                    const bookedAppointments = prescriptionService
                      .getAppointmentsByDoctor(selectedAppointment.doctorId)
                      .filter(apt => apt.date === (document.getElementById('reschedule-date') as HTMLInputElement)?.value && apt.id !== selectedAppointment.id);
                    const bookedSlots = bookedAppointments.map(apt => apt.time);
                    const available = allSlots.filter(slot => !bookedSlots.includes(slot));
                    return available.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ));
                  })()}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setSelectedAppointment(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const dateInput = document.getElementById('reschedule-date') as HTMLInputElement;
                  const timeInput = document.getElementById('reschedule-time') as HTMLSelectElement;
                  if (dateInput.value && timeInput.value) {
                    handleRescheduleConfirm(dateInput.value, timeInput.value);
                  } else {
                    alert('Please select both date and time');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      <AppointmentBookingModal
        isOpen={showAppointmentBooking}
        onClose={() => setShowAppointmentBooking(false)}
        onAppointmentBooked={handleAppointmentBooked}
      />

      <MedicationManagementModal
        isOpen={showMedicationManagement}
        onClose={() => setShowMedicationManagement(false)}
      />
    </div>
  );
}