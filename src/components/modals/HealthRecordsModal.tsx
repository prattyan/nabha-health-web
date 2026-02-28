import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, Heart, Thermometer, Activity, Weight, Calendar, User, Download, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PrescriptionService } from '../../services/prescriptionService';
import { HealthRecord, VitalSigns } from '../../types/prescription';

interface HealthRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VitalSignsFormData {
  bloodPressure: { systolic: string; diastolic: string; };
  heartRate: string;
  temperature: string;
  weight: string;
  height: string;
  bloodSugar: string;
  oxygenSaturation: string;
}

export default function HealthRecordsModal({ 
  isOpen, 
  onClose 
}: HealthRecordsModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const prescriptionService = PrescriptionService.getInstance();
  
  const [activeTab, setActiveTab] = useState('records');
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  
  // Reset visible count when modal opens or tab changes
  useEffect(() => {
    if (isOpen) setVisibleCount(10);
  }, [isOpen, activeTab]);

  // Form states
  const [newRecord, setNewRecord] = useState({
    recordType: 'visit' as const,
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [vitalSignsForm, setVitalSignsForm] = useState<VitalSignsFormData>({
    bloodPressure: { systolic: '', diastolic: '' },
    heartRate: '',
    temperature: '',
    weight: '',
    height: '',
    bloodSugar: '',
    oxygenSaturation: ''
  });

  const loadHealthRecords = useCallback(() => {
    if (!user) return;
    
    const records = prescriptionService.getHealthRecordsByPatient(user.id);
    setHealthRecords(records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [user, prescriptionService]);

  useEffect(() => {
    if (isOpen && user) {
      loadHealthRecords();
    }
  }, [isOpen, user, loadHealthRecords]);

  const handleAddRecord = async () => {
    if (!user || !newRecord.title || !newRecord.description) return;

    setIsLoading(true);
    
    try {
      const recordData = {
        patientId: user.id,
        recordType: newRecord.recordType,
        title: newRecord.title,
        description: newRecord.description,
        date: newRecord.date
      };

      prescriptionService.createHealthRecord(recordData);
      loadHealthRecords();
      setActiveTab('records');
      setNewRecord({
        recordType: 'visit',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Failed to add health record:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVitalSigns = async () => {
    if (!user) return;

    const vitalSigns: VitalSigns = {
      recordedAt: new Date().toISOString()
    };

    // Add non-empty vital signs
    if (vitalSignsForm.bloodPressure.systolic && vitalSignsForm.bloodPressure.diastolic) {
      vitalSigns.bloodPressure = {
        systolic: parseInt(vitalSignsForm.bloodPressure.systolic),
        diastolic: parseInt(vitalSignsForm.bloodPressure.diastolic),
        unit: 'mmHg'
      };
    }

    if (vitalSignsForm.heartRate) {
      vitalSigns.heartRate = {
        value: parseInt(vitalSignsForm.heartRate),
        unit: 'bpm'
      };
    }

    if (vitalSignsForm.temperature) {
      vitalSigns.temperature = {
        value: parseFloat(vitalSignsForm.temperature),
        unit: 'C'
      };
    }

    if (vitalSignsForm.weight) {
      vitalSigns.weight = {
        value: parseFloat(vitalSignsForm.weight),
        unit: 'kg'
      };
    }

    if (vitalSignsForm.height) {
      vitalSigns.height = {
        value: parseFloat(vitalSignsForm.height),
        unit: 'cm'
      };
    }

    if (vitalSignsForm.bloodSugar) {
      vitalSigns.bloodSugar = {
        value: parseInt(vitalSignsForm.bloodSugar),
        unit: 'mg/dL',
        type: 'random'
      };
    }

    if (vitalSignsForm.oxygenSaturation) {
      vitalSigns.oxygenSaturation = {
        value: parseInt(vitalSignsForm.oxygenSaturation),
        unit: '%'
      };
    }

    setIsLoading(true);

    try {
      const recordData = {
        patientId: user.id,
        recordType: 'visit' as const,
        title: 'Vital Signs Recording',
        description: 'Self-recorded vital signs',
        date: new Date().toISOString().split('T')[0],
        vitalSigns
      };

      prescriptionService.createHealthRecord(recordData);
      loadHealthRecords();
      setActiveTab('records');
      setVitalSignsForm({
        bloodPressure: { systolic: '', diastolic: '' },
        heartRate: '',
        temperature: '',
        weight: '',
        height: '',
        bloodSugar: '',
        oxygenSaturation: ''
      });
    } catch (error) {
      console.error('Failed to add vital signs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'visit': return <User className="h-5 w-5" />;
      case 'test': return <Activity className="h-5 w-5" />;
      case 'vaccination': return <Heart className="h-5 w-5" />;
      case 'surgery': return <FileText className="h-5 w-5" />;
      case 'diagnosis': return <FileText className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case 'visit': return 'bg-blue-100 text-blue-800';
      case 'test': return 'bg-green-100 text-green-800';
      case 'vaccination': return 'bg-purple-100 text-purple-800';
      case 'surgery': return 'bg-red-100 text-red-800';
      case 'diagnosis': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatVitalSign = (vitalSigns: VitalSigns) => {
    const signs = [];
    
    if (vitalSigns.bloodPressure) {
      signs.push(`BP: ${vitalSigns.bloodPressure.systolic}/${vitalSigns.bloodPressure.diastolic} ${vitalSigns.bloodPressure.unit}`);
    }
    
    if (vitalSigns.heartRate) {
      signs.push(`HR: ${vitalSigns.heartRate.value} ${vitalSigns.heartRate.unit}`);
    }
    
    if (vitalSigns.temperature) {
      signs.push(`Temp: ${vitalSigns.temperature.value}°${vitalSigns.temperature.unit}`);
    }
    
    if (vitalSigns.weight) {
      signs.push(`Weight: ${vitalSigns.weight.value} ${vitalSigns.weight.unit}`);
    }
    
    return signs.join(' | ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('dashboard.records')}
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
              { id: 'records', label: 'Health Records', icon: FileText },
              { id: 'vitals', label: 'Vital Signs', icon: Activity },
              { id: 'add', label: 'Add New', icon: Plus }
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
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Health Records Tab */}
        {activeTab === 'records' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Medical History</h3>
              <button className="flex items-center space-x-2 px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>

            {healthRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No health records available</p>
                <p className="text-sm">Your medical history will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {healthRecords.slice(0, visibleCount).map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${getRecordTypeColor(record.recordType)}`}>
                          {getRecordTypeIcon(record.recordType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{record.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRecordTypeColor(record.recordType)}`}>
                              {record.recordType}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-2">{record.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(record.date).toLocaleDateString()}</span>
                            </span>
                            {record.doctorId && (
                              <span className="flex items-center space-x-1">
                                <User className="h-4 w-4" />
                                <span>Doctor</span>
                              </span>
                            )}
                          </div>
                          {record.vitalSigns && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                              <strong>Vital Signs:</strong> {formatVitalSign(record.vitalSigns)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {healthRecords.length > visibleCount && (
                  <button
                    onClick={() => setVisibleCount(prev => prev + 10)}
                    className="w-full py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 font-medium"
                  >
                    Load More Records
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vital Signs Tab */}
        {activeTab === 'vitals' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Recent Vital Signs</h3>
              <button
                onClick={() => setActiveTab('add')}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Record Vitals</span>
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { icon: Heart, label: 'Blood Pressure', value: '120/80', unit: 'mmHg', color: 'text-red-600' },
                { icon: Activity, label: 'Heart Rate', value: '72', unit: 'bpm', color: 'text-blue-600' },
                { icon: Thermometer, label: 'Temperature', value: '98.6', unit: '°F', color: 'text-orange-600' },
                { icon: Weight, label: 'Weight', value: '70', unit: 'kg', color: 'text-green-600' }
              ].map((vital, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{vital.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{vital.value}</p>
                      <p className="text-sm text-gray-500">{vital.unit}</p>
                    </div>
                    <vital.icon className={`h-8 w-8 ${vital.color}`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {healthRecords.filter(record => record.vitalSigns).map((record) => (
                <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{record.title}</h4>
                    <span className="text-sm text-gray-500">
                      {new Date(record.date).toLocaleDateString()}
                    </span>
                  </div>
                  {record.vitalSigns && (
                    <div className="bg-gray-50 rounded p-3">
                      <div className="grid md:grid-cols-2 gap-2 text-sm">
                        {record.vitalSigns.bloodPressure && (
                          <div>Blood Pressure: {record.vitalSigns.bloodPressure.systolic}/{record.vitalSigns.bloodPressure.diastolic} {record.vitalSigns.bloodPressure.unit}</div>
                        )}
                        {record.vitalSigns.heartRate && (
                          <div>Heart Rate: {record.vitalSigns.heartRate.value} {record.vitalSigns.heartRate.unit}</div>
                        )}
                        {record.vitalSigns.temperature && (
                          <div>Temperature: {record.vitalSigns.temperature.value}°{record.vitalSigns.temperature.unit}</div>
                        )}
                        {record.vitalSigns.weight && (
                          <div>Weight: {record.vitalSigns.weight.value} {record.vitalSigns.weight.unit}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Tab */}
        {activeTab === 'add' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Add Health Record */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Add Health Record</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Record Type
                    </label>
                    <select
                      value={newRecord.recordType}
                      onChange={(e) => setNewRecord(prev => ({ 
                        ...prev, 
                        recordType: e.target.value as HealthRecord['recordType']
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="visit">Doctor Visit</option>
                      <option value="test">Test Result</option>
                      <option value="vaccination">Vaccination</option>
                      <option value="surgery">Surgery</option>
                      <option value="diagnosis">Diagnosis</option>
                      <option value="allergy">Allergy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newRecord.title}
                      onChange={(e) => setNewRecord(prev => ({ 
                        ...prev, 
                        title: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Annual Checkup"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newRecord.date}
                      onChange={(e) => setNewRecord(prev => ({ 
                        ...prev, 
                        date: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newRecord.description}
                      onChange={(e) => setNewRecord(prev => ({ 
                        ...prev, 
                        description: e.target.value 
                      }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe the medical event..."
                    />
                  </div>

                  <button
                    onClick={handleAddRecord}
                    disabled={isLoading || !newRecord.title || !newRecord.description}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Adding...' : 'Add Record'}
                  </button>
                </div>
              </div>

              {/* Quick Record Vital Signs */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Record Vital Signs</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Systolic"
                      value={vitalSignsForm.bloodPressure.systolic}
                      onChange={(e) => setVitalSignsForm(prev => ({
                        ...prev,
                        bloodPressure: { ...prev.bloodPressure, systolic: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Diastolic"
                      value={vitalSignsForm.bloodPressure.diastolic}
                      onChange={(e) => setVitalSignsForm(prev => ({
                        ...prev,
                        bloodPressure: { ...prev.bloodPressure, diastolic: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-sm text-gray-500 -mt-2">Blood Pressure (mmHg)</p>

                  <div>
                    <input
                      type="number"
                      placeholder="Heart Rate (bpm)"
                      value={vitalSignsForm.heartRate}
                      onChange={(e) => setVitalSignsForm(prev => ({
                        ...prev,
                        heartRate: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Temperature (°C)"
                      value={vitalSignsForm.temperature}
                      onChange={(e) => setVitalSignsForm(prev => ({
                        ...prev,
                        temperature: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Weight (kg)"
                      value={vitalSignsForm.weight}
                      onChange={(e) => setVitalSignsForm(prev => ({
                        ...prev,
                        weight: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleAddVitalSigns}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Recording...' : 'Record Vital Signs'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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