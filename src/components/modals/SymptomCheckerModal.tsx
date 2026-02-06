import { useState } from 'react';
import { X, Bot, AlertCircle, ChevronRight, Activity, ClipboardCheck } from 'lucide-react';
import { AISymptomService, PredictionResult } from '../../services/aiSymptomService';

interface SymptomCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
}

export default function SymptomCheckerModal({ isOpen, onClose, patientName }: SymptomCheckerModalProps) {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<{
    results: PredictionResult[];
    latency: number;
  } | null>(null);

  const aiService = AISymptomService.getInstance();

  const handleAddSymptom = () => {
    if (currentInput.trim()) {
      setSymptoms([...symptoms, currentInput.trim()]);
      setCurrentInput('');
      setPrediction(null); // Reset prediction when symptoms change
    }
  };

  const handleRemoveSymptom = (idx: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== idx));
    setPrediction(null);
  };

  const runTriage = async () => {
    if (symptoms.length === 0) return;
    
    setLoading(true);
    try {
      const result = await aiService.getPrediction(symptoms);
      setPrediction({
        results: result.results,
        latency: result.latency
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                <Bot size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Symptom Triage</h2>
              <p className="text-sm text-gray-500">Assisting {patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Input Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Symptoms
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSymptom()}
                placeholder="e.g. fever, headache, cough"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleAddSymptom}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {symptoms.map((s, idx) => (
                <span key={idx} className="flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                  {s}
                  <button onClick={() => handleRemoveSymptom(idx)} className="hover:text-purple-900">
                    <X size={14} />
                  </button>
                </span>
              ))}
              {symptoms.length === 0 && (
                <span className="text-sm text-gray-400 italic">No symptoms added yet.</span>
              )}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={runTriage}
            disabled={symptoms.length === 0 || loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all font-medium shadow-sm"
          >
            {loading ? (
                <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Running Analysis...
                </>
            ) : (
                <>
                    <Activity size={18} />
                    Run AI Triage
                </>
            )}
          </button>

          {/* Results Section */}
          {prediction && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                 <h3 className="font-semibold text-gray-900">Analysis Results</h3>
                 <span className="text-xs text-gray-400">Latency: {prediction.latency.toFixed(0)}ms</span>
              </div>
              
              <div className="space-y-3">
                {prediction.results.map((result, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-gray-900">{result.condition}</div>
                        <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                            result.probability > 0.7 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                            {(result.probability * 100).toFixed(0)}% Match
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Recommendation:</span> {result.recommendation}
                    </p>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
                        <div 
                            className={`h-1.5 rounded-full ${result.probability > 0.7 ? 'bg-red-500' : 'bg-yellow-500'}`}
                            style={{ width: `${result.probability * 100}%` }}
                        ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 items-start p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>
                    This is an AI-generated assessment. Please confirm with a doctor before administering treatment.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
