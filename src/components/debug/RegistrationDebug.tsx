import { useState } from 'react';
import { Users, Database, CheckCircle, XCircle, Info } from 'lucide-react';
import { AuthService } from '../../services/authService';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RegistrationDebug({ isOpen, onClose }: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'stats' | 'integrity'>('users');
  const authService = AuthService.getInstance();

  if (!isOpen) return null;

  const users = authService.getAllUsers();
  const stats = authService.getRegistrationStats();
  const integrity = authService.validateStorageIntegrity();

  const downloadUserData = () => {
    const data = authService.exportUserData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nabhacare-users-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6" />
            <h2 className="text-xl font-bold">Registration Debug Panel</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-5 w-5 inline mr-2" />
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'stats'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Info className="h-5 w-5 inline mr-2" />
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('integrity')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'integrity'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {integrity.isValid ? (
                <CheckCircle className="h-5 w-5 inline mr-2 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 inline mr-2 text-red-500" />
              )}
              Integrity
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'users' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Registered Users</h3>
                <button
                  onClick={downloadUserData}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Export Data
                </button>
              </div>
              
              {users.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No users registered yet</p>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold">{user.firstName} {user.lastName}</h4>
                          <p className="text-gray-600">{user.email}</p>
                          <p className="text-gray-600">{user.phone}</p>
                          <span className={`inline-block px-2 py-1 rounded text-sm ${
                            user.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'healthworker' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          <p>ID: {user.id}</p>
                          <p>Created: {new Date(user.createdAt).toLocaleString()}</p>
                          <p>Updated: {new Date(user.updatedAt).toLocaleString()}</p>
                          <p>Active: {user.isActive ? 'Yes' : 'No'}</p>
                          {user.role === 'doctor' && (
                            <>
                              <p>Specialization: {user.specialization}</p>
                              <p>License: {user.licenseNumber}</p>
                            </>
                          )}
                          {user.role === 'patient' && user.village && (
                            <p>Village: {user.village}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Registration Statistics</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800">Total Users</h4>
                    <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800">Patients</h4>
                    <p className="text-2xl font-bold text-purple-900">{stats.patients}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800">Health Workers</h4>
                    <p className="text-2xl font-bold text-green-900">{stats.healthworkers}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-indigo-800">Doctors</h4>
                    <p className="text-2xl font-bold text-indigo-900">{stats.doctors}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800">Recent Registrations</h4>
                <p className="text-lg text-yellow-900">{stats.recentRegistrations} new users in the last 7 days</p>
              </div>
            </div>
          )}

          {activeTab === 'integrity' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Storage Integrity Check</h3>
              
              <div className={`p-4 rounded-lg mb-4 ${
                integrity.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {integrity.isValid ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                  <h4 className={`font-semibold ${
                    integrity.isValid ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {integrity.isValid ? 'Storage is healthy' : 'Storage issues detected'}
                  </h4>
                </div>
                
                {!integrity.isValid && (
                  <div className="mt-2">
                    <h5 className="font-medium text-red-700 mb-1">Issues found:</h5>
                    <ul className="list-disc list-inside text-red-600 text-sm">
                      {integrity.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {integrity.storageInfo && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Storage Information</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Storage Type: {integrity.storageInfo.type}</p>
                    <p>Data Size: {Math.round(integrity.storageInfo.size / 1024)} KB</p>
                    <p>Available: {integrity.storageInfo.available ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}