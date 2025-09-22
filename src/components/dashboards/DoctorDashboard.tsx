import React, { useState } from 'react';
import { Calendar, Users, Video, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PrescriptionService } from '../../services/prescriptionService';
import { Appointment, Prescription } from '../../types/prescription';
import VideoCallModal from '../modals/VideoCallModal';
import RescheduleAppointmentModal from '../modals/RescheduleAppointmentModal';
import AddSlotModal from '../modals/AddSlotModal';
import PrescriptionModal from '../modals/PrescriptionModal';
import PrescriptionViewModal from '../modals/PrescriptionViewModal';

export default function DoctorDashboard() {
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [videoCallRoomId, setVideoCallRoomId] = useState<string | null>(null);

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showPrescriptionView, setShowPrescriptionView] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);

  const prescriptionService = PrescriptionService.getInstance();

  React.useEffect(() => {
    if (user) {
      loadDoctorData();
    }
  }, [user]);

  const handleCompleteAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowPrescriptionModal(true);
  };

  const handleStartCall = (appointmentId: string) => {
    // Update appointment status to ongoing
    prescriptionService.updateAppointment(appointmentId, { status: 'ongoing' });
    loadDoctorData();
  };

  const handleRescheduleAppointment = (appointmentId: string) => {
    const apt = appointments.find(a => a.id === appointmentId);
    if (apt) {
      setRescheduleAppointment(apt);
      setShowRescheduleModal(true);
    }
  };

  const loadDoctorData = () => {
    if (user) {
      const doctorAppointments = prescriptionService.getAppointmentsByDoctor(user.id);
      const doctorPrescriptions = prescriptionService.getPrescriptionsByDoctor(user.id);
      setAppointments(doctorAppointments);
      setPrescriptions(doctorPrescriptions);
    }
  };

  const handleSlotAdded = (slot: { date: string; time: string; duration: number }) => {
    if (!user) return;
    // Add slot as available appointment (status: 'available')
    const newSlot: Appointment = {
      id: 'slot_' + Date.now(),
      patientId: '',
      doctorId: user.id,
      patientName: '',
      doctorName: user.firstName + ' ' + user.lastName,
      date: slot.date,
      time: slot.time,
      duration: slot.duration,
      type: 'video',
      status: 'available',
      village: '',
      specialization: user.specialization || '',
      reason: '',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    prescriptionService.createAppointment(newSlot);
    loadDoctorData();
  };

  const handlePrescriptionCreated = () => {
    loadDoctorData();
  };

  const handleViewPrescription = (prescriptionId: string) => {
    const prescription = prescriptionService.getPrescriptionById(prescriptionId);
    setSelectedPrescription(prescription);
    setShowPrescriptionView(true);
  };

  const getPatientQueue = () => {
    // Get today's scheduled appointments as patient queue
    const today = new Date().toISOString().split('T')[0];
    return appointments
      .filter(apt => apt.status === 'scheduled' && apt.date === today)
      .map(apt => ({
        name: apt.patientName,
        waitTime: apt.time,
        priority: apt.priority || 'medium',
        id: apt.id
      }));
  };

  const patientQueue = getPatientQueue();

  // Removed unused recentConsultations variable

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dr. {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-gray-600 mt-1">{user?.specialization || 'General Medicine'}</p>
              {user?.experience && (
                <p className="text-sm text-gray-500">{user.experience} years experience</p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">License</p>
                <p className="font-semibold text-gray-900">{user?.licenseNumber || 'N/A'}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
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
                <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
                <p className="text-gray-600">Today's Appointments</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{prescriptions.length}</p>
                <p className="text-gray-600">Total Patients</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Video className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{appointments.filter(apt => apt.status === 'scheduled').length}</p>
                <p className="text-gray-600">In Queue</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">4.8</p>
                <p className="text-gray-600">Rating</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: TrendingUp },
                { id: 'appointments', label: 'Appointments', icon: Calendar },
                { id: 'patients', label: 'Patients', icon: Users },
                { id: 'consultations', label: 'Consultations', icon: Video }
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>
                  <div className="space-y-3">
                    {appointments.slice(0, 3).map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{appointment.patientName}</p>
                          <p className="text-sm text-gray-600">{appointment.village} • {appointment.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{appointment.time}</p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            appointment.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {appointment.status}
                          </span>
                          {appointment.status === 'scheduled' && (
                            <button
                              onClick={() => handleCompleteAppointment(appointment)}
                              className="ml-2 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Queue</h3>
                  <div className="space-y-3">
                    {patientQueue.map((patient, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            patient.priority === 'high' ? 'bg-red-500' :
                            patient.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></div>
                          <span className="font-medium text-gray-900">{patient.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{patient.waitTime}</span>
                          {/* Remove video call button from patientQueue, only show for appointments */}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appointments' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Today's Appointments</h3>
                  <div className="flex space-x-2">
                    <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                      View Calendar
                    </button>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors" onClick={() => setShowAddSlotModal(true)}>
                      Add Slot
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{appointment.patientName}</h4>
                          <p className="text-gray-600">{appointment.village}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{appointment.time}</span>
                            </span>
                            <span>{appointment.type}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {appointment.status === 'scheduled' ? (
                            <>
                              <button 
                                className={`bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors${appointment.status !== 'scheduled' ? ' cursor-not-allowed bg-gray-300 text-gray-500' : ''}`}
                                disabled={appointment.status !== 'scheduled'}
                                onClick={() => appointment.status === 'scheduled' ? (() => { setVideoCallRoomId(appointment.id); setShowVideoCall(true); })() : undefined}
                              >
                                Start Call
                              </button>
                              <button
                                onClick={() => handleCompleteAppointment(appointment)}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                              >
                                Complete
                              </button>
                              <button 
                                onClick={() => handleRescheduleAppointment(appointment.id)}
                                className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-50 transition-colors"
                              >
                                Reschedule
                              </button>
                            </>
                          ) : (
                            <div className="flex space-x-2">
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                Completed
                              </span>
                              {appointment.prescriptionId && (
                                <button
                                  onClick={() => handleViewPrescription(appointment.prescriptionId!)}
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                  View Prescription
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'patients' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Patient Management</h3>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Search patients..."
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Add Patient
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-center">Patient list will be displayed here with search and filter options.</p>
                </div>
              </div>
            )}

            {activeTab === 'consultations' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Consultations</h3>
                <div className="space-y-4">
                  {prescriptions.slice(0, 10).map((prescription) => (
                    <div key={prescription.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">Patient ID: {prescription.patientId}</h4>
                          <p className="text-gray-600">{prescription.diagnosis}</p>
                          <p className="text-sm text-gray-500 mt-1">Date: {prescription.date}</p>
                          {prescription.followUpDate && (
                            <p className="text-sm text-gray-500">Follow-up: {prescription.followUpDate}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewPrescription(prescription.id)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Prescription
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <VideoCallModal
        isOpen={showVideoCall && !!videoCallRoomId}
        onClose={() => {
          setShowVideoCall(false);
          setVideoCallRoomId(null);
        }}
        roomId={videoCallRoomId || ''}
      />
      <RescheduleAppointmentModal
        isOpen={showRescheduleModal && !!rescheduleAppointment}
        onClose={() => {
          setShowRescheduleModal(false);
          setRescheduleAppointment(null);
        }}
        onReschedule={(newDate, newTime) => {
          if (rescheduleAppointment) {
            prescriptionService.rescheduleAppointment(rescheduleAppointment.id, newDate, newTime);
            loadDoctorData();
          }
        }}
        currentDate={rescheduleAppointment?.date || ''}
        currentTime={rescheduleAppointment?.time || ''}
      />
      <AddSlotModal
        isOpen={showAddSlotModal}
        onClose={() => setShowAddSlotModal(false)}
        onSlotAdded={handleSlotAdded}
      />
      {selectedAppointment && (
        <PrescriptionModal
          isOpen={showPrescriptionModal}
          onClose={() => {
            setShowPrescriptionModal(false);
            setSelectedAppointment(null);
          }}
          appointmentId={selectedAppointment.id}
          patientId={selectedAppointment.patientId}
          patientName={selectedAppointment.patientName}
          doctorId={selectedAppointment.doctorId}
          onPrescriptionCreated={handlePrescriptionCreated}
        />
      )}

      <PrescriptionViewModal
        isOpen={showPrescriptionView}
        onClose={() => {
          setShowPrescriptionView(false);
          setSelectedPrescription(null);
        }}
        prescription={selectedPrescription}
        doctorName={user?.firstName + ' ' + user?.lastName}
      />
    </div>
  );
}