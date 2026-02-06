import React, { useState } from 'react';
import { X, Activity, Thermometer, Heart, Scale, Droplet } from 'lucide-react';
import { PrescriptionService } from '../../services/prescriptionService';
import { VitalSigns } from '../../types/prescription';

interface VitalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onSave?: () => void;
}

export default function VitalsModal({ isOpen, onClose, patientId, patientName, onSave }: VitalsModalProps) {
  const [vitals, setVitals] = useState({
    systolic: '',
    diastolic: '',
    heartRate: '',
    temperature: '',
    weight: '',
    spo2: '',
    bloodSugar: '',
    bloodSugarType: 'random' as 'fasting' | 'random' | 'post_meal'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const prescriptionService = PrescriptionService.getInstance();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVitals(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const vitalSigns: VitalSigns = {
        recordedAt: new Date().toISOString(),
      };

      if (vitals.systolic && vitals.diastolic) {
        vitalSigns.bloodPressure = {
          systolic: parseInt(vitals.systolic),
          diastolic: parseInt(vitals.diastolic),
          unit: 'mmHg'
        };
      }

      if (vitals.heartRate) {
        vitalSigns.heartRate = {
          value: parseInt(vitals.heartRate),
          unit: 'bpm'
        };
      }

      if (vitals.temperature) {
        vitalSigns.temperature = {
          value: parseFloat(vitals.temperature),
          unit: 'F' // Assuming Fahrenheit for common thermometer use
        };
      }

      if (vitals.weight) {
        vitalSigns.weight = {
          value: parseFloat(vitals.weight),
          unit: 'kg'
        };
      }

      if (vitals.spo2) {
        vitalSigns.oxygenSaturation = {
          value: parseInt(vitals.spo2),
          unit: '%'
        };
      }

      if (vitals.bloodSugar) {
        vitalSigns.bloodSugar = {
          value: parseInt(vitals.bloodSugar),
          unit: 'mg/dL',
          type: vitals.bloodSugarType
        };
      }

      // Save as a Health Record
      prescriptionService.createHealthRecord({
        patientId,
        recordType: 'visit', // or 'vitals' if supported
        title: 'Field Vitals Check',
        description: 'Vitals recorded by Health Worker',
        date: new Date().toISOString().split('T')[0],
        vitalSigns
      });

      if (onSave) onSave();
      onClose();
      // Reset form
      setVitals({
        systolic: '',
        diastolic: '',
        heartRate: '',
        temperature: '',
        weight: '',
        spo2: '',
        bloodSugar: '',
        bloodSugarType: 'random'
      });
    } catch {
      setError('Failed to save vitals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Record Vitals</h2>
            <p className="text-sm text-gray-500">For {patientName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Blood Pressure */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Activity size={18} className="text-red-500" />
              <span>Blood Pressure (mmHg)</span>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="number"
                  name="systolic"
                  placeholder="Systolic (120)"
                  value={vitals.systolic}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  name="diastolic"
                  placeholder="Diastolic (80)"
                  value={vitals.diastolic}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Heart Rate & SpO2 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <Heart size={18} className="text-pink-500" />
                <span>Heart Rate</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  name="heartRate"
                  placeholder="BPM"
                  value={vitals.heartRate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <Activity size={18} className="text-blue-500" />
                <span>SpO2 (%)</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  name="spo2"
                  placeholder="%"
                  value={vitals.spo2}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Temperature & Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <Thermometer size={18} className="text-orange-500" />
                <span>Temp (°F)</span>
              </div>
              <input
                type="number"
                name="temperature"
                step="0.1"
                placeholder="98.6"
                value={vitals.temperature}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <Scale size={18} className="text-gray-500" />
                <span>Weight (kg)</span>
              </div>
              <input
                type="number"
                name="weight"
                step="0.1"
                placeholder="Kg"
                value={vitals.weight}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Blood Sugar */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-gray-700 font-medium">
                <Droplet size={18} className="text-red-600" />
                <span>Blood Sugar (mg/dL)</span>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                    <input
                        type="number"
                        name="bloodSugar"
                        placeholder="Value"
                        value={vitals.bloodSugar}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
                <div className="flex-1">
                    <select
                        name="bloodSugarType"
                        value={vitals.bloodSugarType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                        <option value="random">Random</option>
                        <option value="fasting">Fasting</option>
                        <option value="post_meal">Post Meal</option>
                    </select>
                </div>
              </div>
          </div>

          {/* Device Upload */}
          <div className="pt-2 border-t border-gray-100">
             <label className="block text-sm font-medium text-gray-700 mb-2">Device Integration</label>
             <div className="flex gap-3">
                 <button type="button" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 bg-white">
                    <Activity size={16} />
                    Connect BP Monitor
                 </button>
                 <button type="button" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 bg-white">
                    <Droplet size={16} />
                    Connect Glucometer
                 </button>
             </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Vitals'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
