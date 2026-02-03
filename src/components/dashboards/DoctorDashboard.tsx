import React, { useState } from 'react';
import { Calendar as CalendarIcon, Users, Video, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/authService';
import { PrescriptionService } from '../../services/prescriptionService';
import { Appointment, Prescription } from '../../types/prescription';
import VideoCallModal from '../modals/VideoCallModal';
import RescheduleAppointmentModal from '../modals/RescheduleAppointmentModal';
// Removed AddSlotModal import
import PrescriptionModal from '../modals/PrescriptionModal';
import PrescriptionViewModal from '../modals/PrescriptionViewModal';
import ReviewModal from '../modals/ReviewModal';
// ...existing code...
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';


export default function DoctorDashboard() {
  // Migrate missing patient names in appointments on mount
  React.useEffect(() => {
    const prescriptionService = PrescriptionService.getInstance();
    const authService = AuthService.getInstance();
    prescriptionService.migrateFillPatientNamesInAppointments((id: string) => {
      const user = authService.getUserById(id);
      return user ? { firstName: user.firstName, lastName: user.lastName } : null;
    });
  }, []);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [videoCallRoomId, setVideoCallRoomId] = useState<string | null>(null);

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showPrescriptionView, setShowPrescriptionView] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAppointmentId, setReviewAppointmentId] = useState<string | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  // Doctor availability state
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showAvailabilityCalendar, setShowAvailabilityCalendar] = useState(false);
  const authService = AuthService.getInstance();

  const prescriptionService = PrescriptionService.getInstance();

  React.useEffect(() => {
    if (user) {
      loadDoctorData();
      if (user.role === 'doctor') {
        setAvailableDates(authService.getDoctorAvailableDates(user.id));
      }
    }
  }, [user]);

  const handleCompleteAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowPrescriptionModal(true);
  };

  // After prescription is created, show review modal
  const handlePrescriptionCreated = () => {
    setShowPrescriptionModal(false);
    if (selectedAppointment) {
      setReviewAppointmentId(selectedAppointment.id);
      setShowReviewModal(true);
    }
    setSelectedAppointment(null);
    loadDoctorData();
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

  // Removed handleSlotAdded function



  const handleViewPrescription = (prescriptionId: string) => {
    const prescription = prescriptionService.getPrescriptionById(prescriptionId);
    setSelectedPrescription(prescription);
    setShowPrescriptionView(true);
  };

  // Handle review submission
  const handleReviewSubmit = (rating: number) => {
    if (reviewAppointmentId) {
      prescriptionService.updateAppointmentReview(reviewAppointmentId, rating);
      setShowReviewModal(false);
      setReviewAppointmentId(null);
      loadDoctorData();
    }
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
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{
                  appointments.filter(a => a.date === new Date().toLocaleDateString('en-CA')).length
                }</p>
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
                <p className="text-2xl font-bold text-gray-900">{
                  [...new Set(appointments.map(a => a.patientId))].length
                }</p>
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
                <p className="text-2xl font-bold text-gray-900">{
                  (() => {
                    const reviews = appointments.filter(a => typeof a.review === 'number').map(a => a.review!);
                    if (reviews.length === 0) return 'N/A';
                    const avg = reviews.reduce((sum, r) => sum + r, 0) / reviews.length;
                    return avg.toFixed(1);
                  })()
                }</p>
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
                { id: 'appointments', label: 'Appointments', icon: CalendarIcon },
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
                            patient.priority === 'urgent' ? 'bg-purple-700' :
                            patient.priority === 'high' ? 'bg-red-500' :
                            patient.priority === 'medium' ? 'bg-yellow-500' :
                            patient.priority === 'low' ? 'bg-green-500' : 'bg-gray-300'
                          }`}></div>
                          <span className="font-medium text-gray-900">{patient.name}</span>
                          <span
                            className={`ml-2 text-xs px-2 py-1 rounded-full font-semibold
                              ${patient.priority === 'urgent' ? 'bg-purple-700 text-white' : ''}
                              ${patient.priority === 'high' ? 'bg-red-500 text-white' : ''}
                              ${patient.priority === 'medium' ? 'bg-yellow-400 text-yellow-900' : ''}
                              ${patient.priority === 'low' ? 'bg-green-500 text-white' : ''}
                              ${['urgent','high','medium','low'].indexOf(patient.priority) === -1 ? 'bg-gray-300 text-gray-700' : ''}
                            `}
                          >
                            {patient.priority.charAt(0).toUpperCase() + patient.priority.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{patient.waitTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appointments' && (
              <div>
                {/* Doctor Availability Selection UI - moved here */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">Set Your Available Dates for Appointments</h2>
                  <button
                    className="border border-blue-500 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    onClick={() => setShowAvailabilityCalendar(true)}
                  >
                    Select Available Dates
                  </button>
                  <div className="mt-2">
                    <span className="font-medium">Current Available Dates:</span>
                    {availableDates.length > 0 ? (
                      <ul className="inline-block ml-2">
                        {availableDates.map(date => (
                          <li key={date} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded mr-1 text-xs">{date}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="ml-2 text-gray-500">No dates selected.</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Appointments</h3>
                  <div className="flex space-x-2 items-center">
                    <input
                      type="date"
                      value={selectedDay}
                      onChange={e => setSelectedDay(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1"
                      placeholder="Select date"
                    />
                    <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => setShowCalendar(true)}>
                      View Calendar
                    </button>
                  </div>
                </div>
      {showCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setShowCalendar(false)}>
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">Scheduled Appointments Calendar</h2>
            <Calendar
              value={calendarDate}
              onChange={(date) => {
                if (!date) return;
                if (Array.isArray(date)) {
                  setCalendarDate(date[0] || new Date());
                } else {
                  setCalendarDate(date);
                }
              }}
              tileContent={({ date, view }: { date: Date; view: string }) => {
                if (view === 'month') {
                  // Use local date string for comparison
                  const dateStr = date.toLocaleDateString('en-CA');
                  const scheduled = appointments.filter(a => {
                    // a.date may be in 'YYYY-MM-DD' format
                    return a.status === 'scheduled' && a.date === dateStr;
                  });
                  if (scheduled.length > 0) {
                    return <span className="inline-block bg-blue-500 text-white rounded-full px-2 text-xs ml-1">{scheduled.length}</span>;
                  }
                }
                return null;
              }}
            />
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Appointments on {calendarDate.toLocaleDateString('en-CA')}</h3>
              <ul>
                {appointments.filter(a => a.status === 'scheduled' && a.date === calendarDate.toLocaleDateString('en-CA')).map(a => (
                  <li key={a.id} className="mb-2 p-2 border rounded">
                    <span className="font-medium">{a.patientName}</span> at <span>{a.time}</span> ({a.village})
                  </li>
                ))}
                {appointments.filter(a => a.status === 'scheduled' && a.date === calendarDate.toLocaleDateString('en-CA')).length === 0 && (
                  <li className="text-gray-500">No appointments scheduled.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
                <div className="space-y-4">
                  {appointments.filter(a => a.date === selectedDay).map((appointment) => (
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
                                className={`bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors${appointment.status !== 'scheduled' || appointment.date !== new Date().toLocaleDateString('en-CA') ? ' cursor-not-allowed bg-gray-300 text-gray-500' : ''}`}
                                disabled={appointment.status !== 'scheduled' || appointment.date !== new Date().toLocaleDateString('en-CA')}
                                onClick={() => {
                                  if (appointment.status === 'scheduled' && appointment.date === new Date().toLocaleDateString('en-CA')) {
                                    setVideoCallRoomId(appointment.id);
                                    setShowVideoCall(true);
                                  }
                                }}
                              >
                                Start Call
                              </button>
                              <button
                                onClick={() => {
                                  // Only allow complete if today
                                  const today = new Date().toLocaleDateString('en-CA');
                                  if (appointment.date === today) {
                                    handleCompleteAppointment(appointment);
                                  }
                                }}
                                className={`bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors${appointment.date !== new Date().toLocaleDateString('en-CA') ? ' cursor-not-allowed bg-gray-300 text-gray-500' : ''}`}
                                disabled={appointment.date !== new Date().toLocaleDateString('en-CA')}
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
                  {appointments.filter(a => a.date === selectedDay).length === 0 && (
                    <div className="text-gray-500">No appointments scheduled for this day.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'patients' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Patients Under Your Care</h3>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {appointments.length === 0 ? (
                    <p className="text-gray-600 text-center">No patients found.</p>
                  ) : (
                    <>
                      <ul className="divide-y divide-gray-200">
                        {[...new Set(appointments.map(a => a.patientId))].map((pid, idx) => {
                          const patient = appointments.find(a => a.patientId === pid);
                          if (!patient) return null;
                          return (
                            <li key={pid} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between">
                              <div>
                                <button
                                  className="font-semibold text-gray-900 hover:underline focus:outline-none"
                                  onClick={() => setSelectedPatientId(pid)}
                                >
                                  {idx + 1}. {patient.patientName}
                                </button>
                                {patient.village && <span className="ml-2 text-gray-500">({patient.village})</span>}
                              </div>
                              <div className="text-sm text-gray-600 mt-1 md:mt-0">
                                Last appointment: {patient.date} {patient.time}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      {selectedPatientId && (
                        <div className="mt-6 p-4 bg-white rounded shadow">
                          <h4 className="font-bold mb-2">Previous Appointments for {appointments.find(a => a.patientId === selectedPatientId)?.patientName}</h4>
                          <ul className="divide-y divide-gray-200">
                            {appointments.filter(a => a.patientId === selectedPatientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(a => (
                              <li key={a.id} className="py-2">
                                <span className="font-medium">{a.date} {a.time}</span> - {a.type} ({a.status})
                                {a.village && <span className="ml-2 text-gray-500">{a.village}</span>}
                              </li>
                            ))}
                          </ul>
                          <button className="mt-4 text-blue-600 hover:underline" onClick={() => setSelectedPatientId(null)}>Close</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'consultations' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Consultations</h3>
                <div className="space-y-4">
                  {[...prescriptions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map((prescription) => (
                    <div key={prescription.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">Doctor ID: {prescription.doctorId}</h4>
                          <h4 className="font-semibold text-gray-900">Patient Name: {prescription.patientName}</h4>
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
      {/* Availability Calendar Modal */}
      {showAvailabilityCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setShowAvailabilityCalendar(false)}>
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">Select Available Dates</h2>
            <Calendar
              selectRange={false}
              value={new Date()}
              tileClassName={({ date }) =>
                availableDates.includes(date.toLocaleDateString('en-CA')) ? 'bg-blue-200' : ''
              }
              allowPartialRange={false}
              minDate={new Date()}
              showNeighboringMonth={false}
              locale="en-CA"
              onClickDay={(date) => {
                const dateStr = date.toLocaleDateString('en-CA');
                setAvailableDates(prev =>
                  prev.includes(dateStr)
                    ? prev.filter(d => d !== dateStr)
                    : [...prev, dateStr]
                );
              }}
            />
            <div className="mt-4 flex justify-end">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mr-2"
                onClick={() => {
                  if (user && user.role === 'doctor') {
                    authService.setDoctorAvailableDates(user.id, availableDates);
                  }
                  setShowAvailabilityCalendar(false);
                }}
              >
                Save
              </button>
              <button
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                onClick={() => setShowAvailabilityCalendar(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
  {/* AddSlotModal removed for doctors */}
      {selectedAppointment && (
        <>
          <PrescriptionModal
            isOpen={showPrescriptionModal}
            onClose={() => {
              setShowPrescriptionModal(false);
              setSelectedAppointment(null);
            }}
            appointmentId={selectedAppointment?.id || ''}
            patientId={selectedAppointment?.patientId || ''}
            patientName={selectedAppointment?.patientName || ''}
            doctorId={selectedAppointment?.doctorId || ''}
            onPrescriptionCreated={handlePrescriptionCreated}
          />

          <ReviewModal
            isOpen={showReviewModal}
            onClose={() => {
              setShowReviewModal(false);
              setReviewAppointmentId(null);
            }}
            onSubmit={handleReviewSubmit}
          />
        </>
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