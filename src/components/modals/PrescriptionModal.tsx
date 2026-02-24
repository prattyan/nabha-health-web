import React, { useState } from 'react';
import { X, Plus, Trash2, FileText } from 'lucide-react';
import { Medicine, Prescription } from '../../types/prescription';
import { PrescriptionService } from '../../services/prescriptionService';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  onPrescriptionCreated: () => void;
}

export default function PrescriptionModal({
  isOpen,
  onClose,
  appointmentId,
  patientId,
  patientName,
  doctorId,
  onPrescriptionCreated
}: PrescriptionModalProps) {
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([
    {
      id: '1',
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      quantity: 1,
      timesToTake: []
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const prescriptionService = PrescriptionService.getInstance();

  const addMedicine = () => {
    const newMedicine: Medicine = {
      id: Date.now().toString(),
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      quantity: 1,
      timesToTake: []
    };
    setMedicines([...medicines, newMedicine]);
  };

  const removeMedicine = (id: string) => {
    setMedicines(medicines.filter(med => med.id !== id));
  };

  const updateMedicine = (id: string, field: keyof Medicine, value: string | number) => {
    setMedicines(medicines.map(med => 
      med.id === id ? { ...med, [field]: value } : med
    ));
  };

  const generateMedicineSchedule = (frequency: string, duration: string) => {
    // Generate times to take based on frequency
    const timesToTake: string[] = [];
    switch (frequency) {
      case 'Once daily':
        timesToTake.push('09:00');
        break;
      case 'Twice daily':
        timesToTake.push('09:00', '21:00');
        break;
      case 'Three times daily':
        timesToTake.push('08:00', '14:00', '20:00');
        break;
      case 'Four times daily':
        timesToTake.push('08:00', '12:00', '16:00', '20:00');
        break;
      default:
        timesToTake.push('09:00'); // Default fallback
    }

    // Calculate start and end dates
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    
    // Parse duration (e.g., "7 days", "2 weeks", "1 month")
    const durationMatch = duration.match(/(\d+)\s*(day|week|month)s?/i);
    if (durationMatch) {
      const [, amount, unit] = durationMatch;
      const days = parseInt(amount);
      switch (unit.toLowerCase()) {
        case 'week':
          endDate.setDate(endDate.getDate() + (days * 7) - 1);
          break;
        case 'month':
          endDate.setMonth(endDate.getMonth() + days);
          endDate.setDate(endDate.getDate() - 1);
          break;
        default: // days
          endDate.setDate(endDate.getDate() + days - 1);
      }
    } else {
      // Default to 7 days if duration is not parseable
      endDate.setDate(endDate.getDate() + 6);
    }

    return {
      timesToTake,
      startDate,
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Process medicines to add required tracking fields
      const processedMedicines = medicines
        .filter(med => med.name.trim() !== '')
        .map(medicine => {
          const schedule = generateMedicineSchedule(medicine.frequency, medicine.duration);
          return {
            ...medicine,
            ...schedule,
            remainingQuantity: medicine.quantity
          };
        });

      // File validation and upload simulation
      let attachmentUrl = undefined;
      if (selectedFile) {
        // Validate file size (max 5MB)
        if (selectedFile.size > 5 * 1024 * 1024) {
          alert("File size exceeds 5MB limit.");
          setIsLoading(false);
          return;
        }
        
        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(selectedFile.type)) {
          alert("Invalid file type. Only PDF, JPG, and PNG are allowed.");
          setIsLoading(false);
          return;
        }

        console.log('Uploading file:', selectedFile.name);
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Generate a mock URL for the stored file
        // In a real implementation, this would be the URL returned by the storage service
        attachmentUrl = `https://storage.nabhacare.com/uploads/${Date.now()}_${selectedFile.name}`;
      }

      const prescriptionData: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'> = {
        patientId,
        patientName,
        doctorId,
        appointmentId,
        date: new Date().toISOString().split('T')[0],
        diagnosis,
        symptoms,
        medicines: processedMedicines,
        notes,
        followUpDate: followUpDate || undefined,
        status: 'active',
        attachmentUrl // Save the attachment URL
      };

      // In real app, we would upload the file here

      if (selectedFile) {
        console.log('Attaching file:', selectedFile.name);
      }

      prescriptionService.createPrescription(prescriptionData);
      onPrescriptionCreated();
      onClose();
      
      // Reset form
      setDiagnosis('');
      setSymptoms('');
      setNotes('');
      setFollowUpDate('');
      setMedicines([{
        id: '1',
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        quantity: 1,
        timesToTake: []
      }]);
    } catch (error) {
      console.error('Error creating prescription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create Prescription</h2>
                <p className="text-gray-600">Patient: {patientName}</p>
              </div>
            </div>
            <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          title="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Symptoms *
              </label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe patient symptoms..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnosis *
              </label>
              <textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Enter diagnosis..."
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Medicines</h3>
              <button
                type="button"
                onClick={addMedicine}
                className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                title="Add medicine"
              >
                <Plus className="h-4 w-4" />
                <span>Add Medicine</span>
              </button>
            </div>

            <div className="space-y-4">
              {medicines.map((medicine, index) => (
                <div key={medicine.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Medicine {index + 1}</h4>
                    {medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedicine(medicine.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Remove medicine"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Medicine Name *
                      </label>
                      <input
                        type="text"
                        value={medicine.name}
                        onChange={(e) => updateMedicine(medicine.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Paracetamol"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dosage *
                      </label>
                      <input
                        type="text"
                        value={medicine.dosage}
                        onChange={(e) => updateMedicine(medicine.id, 'dosage', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 500mg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frequency *
                      </label>
                      <select
                        value={medicine.frequency}
                        onChange={(e) => updateMedicine(medicine.id, 'frequency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        title="Select frequency"
                      >
                        <option value="">Select frequency</option>
                        <option value="Once daily">Once daily</option>
                        <option value="Twice daily">Twice daily</option>
                        <option value="Three times daily">Three times daily</option>
                        <option value="Four times daily">Four times daily</option>
                        <option value="As needed">As needed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={medicine.quantity}
                        onChange={(e) => updateMedicine(medicine.id, 'quantity', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                        title="Enter quantity"
                        placeholder="e.g., 10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Instructions
                      </label>
                      <input
                        type="text"
                        value={medicine.instructions}
                        onChange={(e) => updateMedicine(medicine.id, 'instructions', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., After meals"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Any additional instructions or notes..."
              />
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                  title="Select follow-up date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Previous Records / Scans
                </label>
                <input 
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, JPG, PNG (Max 5MB)</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}