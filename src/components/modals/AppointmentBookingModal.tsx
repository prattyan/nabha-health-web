import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Clock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PrescriptionService } from '../../services/prescriptionService';
import { AuthService } from '../../services/authService';
import { Appointment } from '../../types/prescription';
import { User as UserType } from '../../types/auth';

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppointmentBooked: (appointment: Appointment) => void;
  selectedDoctorId?: string;
  patientId?: string;
}

export default function AppointmentBookingModal({ 
  isOpen, 
  onClose, 
  onAppointmentBooked,
  selectedDoctorId,
  patientId 
}: AppointmentBookingModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const prescriptionService = PrescriptionService.getInstance();
  const authService = AuthService.getInstance();
  
  const [step, setStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState<UserType | null>(null);
  const [availableDoctors, setAvailableDoctors] = useState<UserType[]>([]);
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    time: '',
    type: 'consultation' as const,
    reason: '',
    priority: 'medium' as const,
    symptoms: [] as string[],
    notes: ''
  });
  // Only show available dates for selected doctor
  const [doctorAvailableDates, setDoctorAvailableDates] = useState<string[]>([]);
  const [symptomInput, setSymptomInput] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Mock doctors data - in real app this would come from API
  useEffect(() => {
    if (isOpen) {
      // Load available doctors from the registration system
      const doctors = authService.getAvailableDoctors();
      setAvailableDoctors(doctors);
    }
  }, [isOpen, authService]);

  useEffect(() => {
    if (isOpen && selectedDoctorId) {
      const doctor = availableDoctors.find(d => d.id === selectedDoctorId);
      if (doctor) {
        setSelectedDoctor(doctor);
        setStep(2);
        setDoctorAvailableDates(Array.isArray(doctor.availableDates) ? doctor.availableDates : []);
      }
    }
  }, [isOpen, selectedDoctorId, availableDoctors]);

  // Always update available dates when selectedDoctor changes
  useEffect(() => {
    if (selectedDoctor) {
      setDoctorAvailableDates(Array.isArray(selectedDoctor.availableDates) ? selectedDoctor.availableDates : []);
    }
  }, [selectedDoctor]);

  const generateAvailableSlots = useCallback(() => {
    // Generate slots and filter out already booked ones for the doctor and date
    const allSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];
    if (!selectedDoctor || !appointmentData.date) {
      setAvailableSlots(allSlots);
      return;
    }
    // Get all appointments for this doctor on the selected date
    const bookedAppointments = prescriptionService
      .getAppointmentsByDoctor(selectedDoctor.id)
      .filter(apt => apt.date === appointmentData.date);
    const bookedSlots = bookedAppointments.map(apt => apt.time);
    const available = allSlots.filter(slot => !bookedSlots.includes(slot));
    setAvailableSlots(available);
  }, [selectedDoctor, appointmentData.date, prescriptionService]);

  useEffect(() => {
    if (appointmentData.date && selectedDoctor) {
      generateAvailableSlots();
    }
  }, [appointmentData.date, selectedDoctor, generateAvailableSlots]);

  const handleDoctorSelect = (doctor: UserType) => {
  setSelectedDoctor(doctor);
  setStep(2);
  };

  const handleDateSelect = (date: string) => {
    setAppointmentData(prev => ({ ...prev, date }));
  };

  const handleTimeSelect = (time: string) => {
    setAppointmentData(prev => ({ ...prev, time }));
  };

  const addSymptom = () => {
    if (symptomInput.trim() && !appointmentData.symptoms.includes(symptomInput.trim())) {
      setAppointmentData(prev => ({
        ...prev,
        symptoms: [...prev.symptoms, symptomInput.trim()]
      }));
      setSymptomInput('');
    }
  };

  const removeSymptom = (symptom: string) => {
    setAppointmentData(prev => ({
      ...prev,
      symptoms: prev.symptoms.filter(s => s !== symptom)
    }));
  };

  const handleSubmit = async () => {
    if (!user || !selectedDoctor) return;

    if (!appointmentData.date) {
      setError('Please select an appointment date');
      return;
    }
    if (!appointmentData.time) {
      setError('Please select an appointment time');
      return;
    }
    if (!appointmentData.reason.trim()) {
      setError('Please enter the reason for the visit');
      return;
    }

    // Validate that the appointment time is in the future if it's today
    const appointmentDateTime = new Date(`${appointmentData.date}T${appointmentData.time}`);
    if (appointmentDateTime < new Date()) {
      setError('Cannot book appointments in the past');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use provided patientId if available, otherwise current user
      const targetPatientId = patientId || user.id;
      let targetPatientName = `${user.firstName} ${user.lastName}`;
      let targetVillage = user.village;
      
      // If booking for another patient, we need their details
      if (patientId && patientId !== user.id) {
         const patient = authService.getUserById(patientId);
         if (patient) {
            targetPatientName = `${patient.firstName} ${patient.lastName}`;
            targetVillage = patient.village;
         }
      }

      const newAppointment = prescriptionService.createAppointment({
        patientId: targetPatientId,
        doctorId: selectedDoctor.id,
        patientName: targetPatientName,
        doctorName: `${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
        date: appointmentData.date,
        time: appointmentData.time,
        duration: 30,
        type: appointmentData.type,
        reason: appointmentData.reason,
        priority: appointmentData.priority,
        symptoms: appointmentData.symptoms,
        notes: appointmentData.notes,
        specialization: selectedDoctor.specialization,
        village: targetVillage,
        // If logged in user is health worker, tag them (assuming healthworker role)
        healthWorkerId: user.role === 'healthworker' ? user.id : undefined 
      });

      onAppointmentBooked(newAppointment);
      resetForm();
      onClose();
    } catch {
      setError('Failed to book appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDoctor(null);
    setAppointmentData({
      date: '',
      time: '',
      type: 'consultation',
      reason: '',
      priority: 'medium',
      symptoms: [],
      notes: ''
    });
    setSymptomInput('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('patient.bookAppointment')}
          </h2>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Step 1: Doctor Selection */}
        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Doctor</h3>
            <div className="space-y-4">
              {availableDoctors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No doctors available at the moment</p>
                  <p className="text-sm">Please try again later or contact support</p>
                </div>
              ) : (
                availableDoctors.map((doctor) => {
                  const hasAvailableDates = Array.isArray(doctor.availableDates) && doctor.availableDates.length > 0;
                  // If no available dates, mark as unavailable
                  return (
                    <div
                      key={doctor.id}
                      onClick={() => hasAvailableDates ? handleDoctorSelect(doctor) : undefined}
                      className={`border border-gray-200 rounded-lg p-4 transition-colors ${hasAvailableDates ? 'cursor-pointer hover:border-blue-500 hover:bg-blue-50' : 'bg-gray-100 cursor-not-allowed opacity-60'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{doctor.firstName} {doctor.lastName}</h4>
                          <p className="text-gray-600">{doctor.specialization}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm">
                            <span className="text-green-600">₹{doctor.consultationFee || 500}</span>
                            <span className="text-yellow-600">★ {doctor.rating || 4.5}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              hasAvailableDates 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {hasAvailableDates ? 'Available' : 'Unavailable'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Step 2: Appointment Details */}
        {step === 2 && selectedDoctor && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900">{selectedDoctor.firstName} {selectedDoctor.lastName}</h3>
              <p className="text-gray-600">{selectedDoctor.specialization}</p>
              <p className="text-green-600">₹{selectedDoctor.consultationFee || 500}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Date *
                </label>
                {/* Only show available dates for doctor */}
                <select
                  value={appointmentData.date}
                  onChange={e => handleDateSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select date</option>
                  {doctorAvailableDates.length > 0 ? (
                    doctorAvailableDates.map(date => (
                      <option key={date} value={date}>{date}</option>
                    ))
                  ) : (
                    <option value="" disabled>No available dates</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Time *
                </label>
                <select
                  value={appointmentData.time}
                  onChange={(e) => handleTimeSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select time</option>
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Appointment Type
              </label>
              <select
                value={appointmentData.type}
                onChange={(e) => setAppointmentData(prev => ({ 
                  ...prev, 
                  type: e.target.value as Appointment['type'] 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="consultation">Consultation</option>
                <option value="followup">Follow-up</option>
                <option value="routine_checkup">Routine Checkup</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Visit *
              </label>
              <textarea
                value={appointmentData.reason}
                onChange={(e) => setAppointmentData(prev => ({ 
                  ...prev, 
                  reason: e.target.value 
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Briefly describe your health concern..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={appointmentData.priority}
                onChange={(e) => setAppointmentData(prev => ({ 
                  ...prev, 
                  priority: e.target.value as Appointment['priority'] 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Symptoms
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a symptom..."
                />
                <button
                  type="button"
                  onClick={addSymptom}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {appointmentData.symptoms.map((symptom, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {symptom}
                    <button
                      onClick={() => removeSymptom(symptom)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={appointmentData.notes}
                onChange={(e) => setAppointmentData(prev => ({ 
                  ...prev, 
                  notes: e.target.value 
                }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional information..."
              />
            </div>

            <div className="flex justify-between pt-6 border-t">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Booking...' : 'Book Appointment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}