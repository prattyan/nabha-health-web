import { useState, useEffect, useCallback } from 'react';
import { Appointment } from '../../types/prescription';
import { User, RegisterData } from '../../types/auth'; // Ensure RegisterData is imported
import { PrescriptionService } from '../../services/prescriptionService';
import { AuthService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, MapPin, Activity, AlertTriangle, Search, UserPlus, 
  Wifi, WifiOff, Bell, ClipboardList, Clock, RefreshCw, Bot
} from 'lucide-react';
import RegisterModal from '../auth/RegisterModal';
import AppointmentBookingModal from '../modals/AppointmentBookingModal';
import VitalsModal from '../modals/VitalsModal';
import SymptomCheckerModal from '../modals/SymptomCheckerModal';

export default function HealthWorkerDashboard() {
  const prescriptionService = PrescriptionService.getInstance();
  const authService = AuthService.getInstance();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // State for Patients
  const [patients, setPatients] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');

  // Network State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isSymptomCheckerOpen, setIsSymptomCheckerOpen] = useState(false);

  // Load data
  const loadPatients = useCallback(() => {
    const allPatients = authService.getUsersByRole('patient');
    // In a real app, filter by health worker's village/jurisdiction
    // For now, filter if the health worker has a village assigned
    if (user?.village) {
        setPatients(allPatients.filter(p => p.village?.toLowerCase() === user.village?.toLowerCase()));
    } else {
        setPatients(allPatients);
    }
  }, [authService, user?.village]);

  useEffect(() => {
    loadPatients();
    
    const handleOnline = () => {
        setIsOnline(true);
        // Simulate auto-sync on reconnect
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 2000);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadPatients]);

  // Handle Manual Sync
  const handleSync = () => {
      if (!isOnline) return;
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 1500);
  };

  // Appointments Logic
  const today = new Date().toISOString().split('T')[0];
  const allAppointments: Appointment[] = prescriptionService.getAppointments(); // Get all appointments
  // Filter appointments related to this health worker or their village
  const myAppointments = allAppointments.filter(apt => {
     // If assigned by this HW OR (HW has village AND patient is in that village)
     return (apt.healthWorkerId === user?.id) || (user?.village && apt.village === user.village);
  });

  const todayAppointments = myAppointments.filter(apt => apt.date === today);

  // Stats
  const urgentCount = myAppointments.filter(apt => apt.priority === 'urgent').length;
  const patientsCount = patients.length;
  
  // Follow-up Logic (Mock) + Assignments
  const followUps = myAppointments.filter(apt => 
    (apt.type === 'followup' && apt.status === 'scheduled') ||
    (apt.priority === 'high' && apt.status === 'completed') // High priority completed visits needing checkup
  );

  // Mock Notifications
  interface Notification { id: number; message: string; type: 'urgent' | 'info' | 'pharmacy' }
  const notifications: Notification[] = [];
  if (urgentCount > 0) notifications.push({ id: 1, message: `${urgentCount} Urgent triage cases require attention`, type: 'urgent' });
  notifications.push({ id: 2, message: 'Paracetamol stock low in Village Center A', type: 'pharmacy' });
  notifications.push({ id: 3, message: 'Dr. Sharma available today 2pm-5pm', type: 'info' });


  const handleRegisterPatient = async (data: RegisterData) => { // Use RegisterData type
    const patientData = { ...data, role: 'patient' }; 
    const result = await authService.register(patientData as RegisterData);
    if (result.success) {
        loadPatients(); // Refresh list
        return { success: true, message: 'Patient registered successfully' };
    }
    return { success: false, message: result.message };
  };

  const handleBookAppointment = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsBookingModalOpen(true);
  };

  const handleRecordVitals = (patient: User) => {
    setSelectedPatientId(patient.id);
    setSelectedPatientName(`${patient.firstName} ${patient.lastName}`);
    setIsVitalsModalOpen(true);
  };

  const handleSymptomCheck = (patient: User) => {
    setSelectedPatientId(patient.id);
    setSelectedPatientName(`${patient.firstName} ${patient.lastName}`);
    setIsSymptomCheckerOpen(true);
  };

  const filteredPatients = patients.filter(p => 
    p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with Connectivity & Notifications */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Worker Portal</h1>
          <div className="flex items-center gap-3 mt-1">
             <p className="text-gray-500">Welcome back, {user?.firstName}</p>
             {isOnline ? (
                 isSyncing ? (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        <RefreshCw size={12} className="animate-spin" /> Syncing...
                    </span>
                 ) : (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium cursor-pointer" onClick={handleSync}>
                        <Wifi size={12} /> Online
                    </span>
                 )
             ) : (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                    <WifiOff size={12} /> Offline Mode
                </span>
             )}
          </div>
        </div>
        <div className="flex items-center gap-3">
             <div className="relative p-2 rounded-full hover:bg-gray-100 cursor-pointer group">
                <Bell size={20} className="text-gray-600" />
                {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                )}
                {/* Notification Dropdown (Hover) */}
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 p-2 hidden group-hover:block z-50">
                    <h3 className="text-sm font-semibold px-2 py-1 mb-1">Notifications</h3>
                    <div className="space-y-1">
                        {notifications.map(n => (
                            <div key={n.id} className={`p-2 rounded-lg text-sm ${n.type === 'urgent' ? 'bg-red-50 text-red-700' : n.type === 'pharmacy' ? 'bg-orange-50 text-orange-700' : 'bg-gray-50'}`}>
                                {n.message}
                            </div>
                        ))}
                        {notifications.length === 0 && <div className="text-xs text-gray-400 p-2">No new notifications</div>}
                    </div>
                </div>
             </div>
            <button 
                onClick={() => setIsRegisterModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
                <UserPlus size={18} />
                <span className="hidden sm:inline">Add Patient</span>
            </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {['overview', 'patients', 'appointments', 'followups'].map((tab) => (
            <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 capitalize font-medium transition-colors relative whitespace-nowrap ${
                activeTab === tab
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            >
            {tab === 'followups' ? 'Tasks & Follow-Ups' : tab}
            </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Patients</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{patientsCount}</h3>
                    </div>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Users size={20} />
                    </div>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Today's Visits</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{todayAppointments.length}</h3>
                    </div>
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                        <Activity size={20} />
                    </div>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Urgent Cases</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{urgentCount}</h3>
                    </div>
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                        <AlertTriangle size={20} />
                    </div>
                </div>
            </div>
             <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Tasks</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{followUps.length}</h3>
                    </div>
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                        <ClipboardList size={20} />
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex gap-4">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="text-gray-500" size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search patients by name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Village</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredPatients.map((patient) => (
                            <tr key={patient.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        {patient.firstName} {patient.lastName}
                                    </div>
                                    <div className="text-sm text-gray-500">ID: {patient.id}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{patient.phone}</div>
                                    <div className="text-sm text-gray-500">{patient.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                        <MapPin size={12} className="mr-1" />
                                        {patient.village || 'Unknown'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button 
                                        onClick={() => handleSymptomCheck(patient)}
                                        className="text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-lg transition"
                                        title="AI Triage"
                                    >
                                        <Bot size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleRecordVitals(patient)}
                                        className="text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1 rounded-lg transition"
                                    >
                                        Vitals
                                    </button>
                                    <button 
                                        onClick={() => handleBookAppointment(patient.id)}
                                        className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg transition"
                                    >
                                        Book
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

    {activeTab === 'appointments' && (
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-4 border-b border-gray-100">
                 <h3 className="font-semibold text-gray-900">Appointments Dashboard</h3>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full">
                     <thead className="bg-gray-50">
                         <tr>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-200">
                         {myAppointments.map((apt) => (
                             <tr key={apt.id} className="hover:bg-gray-50">
                                 <td className="px-6 py-4 whitespace-nowrap">
                                     <div className="text-sm font-medium text-gray-900">{apt.date}</div>
                                     <div className="text-sm text-gray-500">{apt.time}</div>
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap">
                                     <div className="text-sm text-gray-900">{apt.patientName}</div>
                                     {apt.healthWorkerId && <div className="text-xs text-blue-500">Referred by You</div>}
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                     {apt.doctorName}
                                 </td>
                                 <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                     {apt.reason}
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap capitalize">
                                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                         apt.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                         apt.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                     }`}>
                                         {apt.status}
                                     </span>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         </div>
     )}

     {activeTab === 'followups' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
             <div className="p-4 border-b border-gray-100">
                 <h3 className="font-semibold text-gray-900">Assigned Tasks & Follow-Ups</h3>
             </div>
             <div className="divide-y divide-gray-100">
                {followUps.length > 0 ? followUps.map(task => (
                    <div key={task.id} className="p-4 hover:bg-gray-50 flex justify-between items-center group">
                        <div className="flex gap-4 items-start">
                             <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Clock size={20} />
                             </div>
                             <div>
                                <div className="flex items-center gap-2">
                                     <h4 className="text-sm font-semibold text-gray-900">{task.patientName}</h4>
                                     <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                        Maternal Care
                                     </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {task.type === 'followup' ? 'Scheduled Follow-up' : 'Post-Appointment Checkup'} • {task.date}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">{task.reason}</p>
                             </div>
                        </div>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => handleRecordVitals({ id: task.patientId, firstName: task.patientName.split(' ')[0], lastName: task.patientName.split(' ')[1] || '' } as User)}
                                className="px-3 py-1.5 border border-emerald-600 text-emerald-600 text-sm rounded-lg hover:bg-emerald-50 transition"
                            >
                                Record Vitals
                            </button>
                             <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                                Complete
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="p-8 text-center text-gray-500">
                        <ClipboardList className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                        <p>No pending tasks assigned.</p>
                    </div>
                )}
             </div>
        </div>
     )}

    <RegisterModal 
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSwitchToLogin={() => {}} // No-op
        customRegister={handleRegisterPatient}
    />
    
    <AppointmentBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedPatientId(null);
        }}
        onAppointmentBooked={() => {
            /* Refresh */
        }}
        patientId={selectedPatientId || undefined} 
    />

    {selectedPatientId && (
        <VitalsModal
            isOpen={isVitalsModalOpen}
            onClose={() => setIsVitalsModalOpen(false)}
            patientId={selectedPatientId}
            patientName={selectedPatientName}
        />
    )}

    {selectedPatientId && (
        <SymptomCheckerModal
            isOpen={isSymptomCheckerOpen}
            onClose={() => setIsSymptomCheckerOpen(false)}
            patientName={selectedPatientName}
        />
    )}
    </div>
  );
}
