import { useState } from 'react';
import { Appointment } from '../../types/prescription';
import { PrescriptionService } from '../../services/prescriptionService';
import { Users, MapPin, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function HealthWorkerDashboard() {
  const prescriptionService = PrescriptionService.getInstance();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Get all appointments for today (all patients)
  const today = new Date().toISOString().split('T')[0];
  const allAppointments: Appointment[] = prescriptionService.getAppointments().filter(apt => apt.date === today);

  // Group appointments by priority
  const priorityGroups: { [key: string]: Appointment[] } = {
    urgent: [],
    high: [],
    medium: [],
    low: [],
  };
  allAppointments.forEach(apt => {
    priorityGroups[apt.priority].push(apt);
  });

  // Doctor availability logic (replace with real check)
  const isDoctorAvailable = allAppointments.some(apt => apt.status === 'scheduled');

  // Dynamic community stats from appointments
  const communityStats = Array.from(new Set(allAppointments.map(apt => apt.village))).map(village => {
    const villageAppointments = allAppointments.filter(apt => apt.village === village);
    return {
      village,
      population: villageAppointments.length * 100, // Example: 100 patients per appointment
      healthScore: Math.round(Math.random() * 30 + 70), // Example: random health score
      alerts: villageAppointments.filter(apt => apt.priority === 'urgent').length
    };
  });

  // Dynamic health alerts from appointments
  const healthAlerts = allAppointments.filter(apt => apt.priority === 'urgent' || apt.priority === 'high').map(apt => ({
    id: apt.id,
    type: 'appointment',
    message: `Urgent appointment for ${apt.patientName} in ${apt.village}`,
    priority: apt.priority,
    date: apt.date
  }));

  // Dynamic today's tasks from appointments

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Patient Priority Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <h2 className="text-xl font-bold mb-4">Patients by Priority</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {['urgent', 'high', 'medium', 'low'].map(priority => (
            <div key={priority} className="bg-white rounded-lg shadow-sm p-4">
              <h3 className={`font-semibold mb-2 text-${priority === 'urgent' ? 'red' : priority === 'high' ? 'orange' : priority === 'medium' ? 'yellow' : 'green'}-600`}>{priority.charAt(0).toUpperCase() + priority.slice(1)} Priority</h3>
              {priorityGroups[priority].length === 0 ? (
                <p className="text-gray-500">No patients</p>
              ) : (
                <ul className="space-y-2">
                  {priorityGroups[priority].map((apt: Appointment) => (
                    <li key={apt.id} className="flex justify-between items-center">
                      <span>{apt.patientName}</span>
                      <span className="text-xs text-gray-400">{apt.time}</span>
                      {!isDoctorAvailable && (
                        <div className="flex space-x-2">
                          <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs">Give Medicine</button>
                          <button className="bg-green-600 text-white px-2 py-1 rounded text-xs">Start Video Call</button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-gray-600 mt-1">Community Health Worker</p>
              {user?.workLocation && (
                <p className="text-sm text-gray-500">{user.workLocation}</p>
              )}
              {user?.experience && (
                <p className="text-sm text-gray-500">{user.experience} years experience</p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Worker ID</p>
                <p className="font-semibold text-gray-900">{user?.id.slice(-8).toUpperCase()}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">4</p>
                <p className="text-gray-600">Villages Covered</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">8,700</p>
                <p className="text-gray-600">Population Served</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">6</p>
                <p className="text-gray-600">Active Alerts</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">82%</p>
                <p className="text-gray-600">Avg Health Score</p>
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
                { id: 'communities', label: 'Communities', icon: MapPin },
                { id: 'alerts', label: 'Health Alerts', icon: AlertTriangle },
                { id: 'activities', label: 'Activities', icon: Activity }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
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
            {/* Overview tab content removed with approval system. Add other overview content here if needed. */}

            {activeTab === 'communities' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Community Health Overview</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {communityStats.map((community, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">{community.village}</h4>
                          <p className="text-gray-600">Population: {community.population.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">{community.healthScore}%</p>
                          <p className="text-sm text-gray-500">Health Score</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          community.alerts === 0 
                            ? 'bg-green-100 text-green-800'
                            : community.alerts <= 2
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {community.alerts} alerts
                        </span>
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'alerts' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Health Alerts</h3>
                  <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                    Create Alert
                  </button>
                </div>
                <div className="space-y-4">
                  {healthAlerts.map((alert) => (
                    <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-3">
                          <div className={`w-3 h-3 rounded-full mt-2 ${
                            alert.priority === 'high' ? 'bg-red-500' :
                            alert.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></div>
                          <div>
                            <h4 className="font-medium text-gray-900">{alert.message}</h4>
                            <p className="text-sm text-gray-600 mt-1">{alert.date}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            View
                          </button>
                          <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                            Resolve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'activities' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Activity Log</h3>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    Log Activity
                  </button>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-center">Activity history and logging interface will be displayed here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}