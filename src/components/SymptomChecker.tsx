import React, { useState } from 'react';
import { Brain, Zap, Clock, Activity } from 'lucide-react';
import { AISymptomService, PredictionResult } from '../services/aiSymptomService';

export default function SymptomChecker() {
  const [input, setInput] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [results, setResults] = useState<PredictionResult[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [source, setSource] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const aiService = AISymptomService.getInstance();

  const handleAddSymptom = () => {
    if (input.trim() && !symptoms.includes(input.trim())) {
      setSymptoms([...symptoms, input.trim()]);
      setInput('');
      setResults([]); // Clear old results
    }
  };

  const handlePredict = async () => {
    if (symptoms.length === 0) return;
    
    setIsLoading(true);
    try {
        const response = await aiService.getPrediction(symptoms);
        setResults(response.results);
        setLatency(response.latency);
        setSource(response.source);
    } catch (error) {
        console.error("Prediction failed", error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-gray-900">AI Symptom Checker</h2>
                <p className="text-sm text-gray-600">Powered by On-Device TFLite (Optimized)</p>
            </div>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Input Area */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Describe Symptoms</label>
            <div className="flex space-x-2">
                <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSymptom()}
                    placeholder="e.g., headache, fever, cough"
                    className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
                <button 
                    onClick={handleAddSymptom}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                    Add
                </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                {symptoms.map((s, i) => (
                    <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {s}
                        <button 
                            onClick={() => setSymptoms(symptoms.filter((_, idx) => idx !== i))}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                            &times;
                        </button>
                    </span>
                ))}
            </div>
        </div>

        <button
            onClick={handlePredict}
            disabled={symptoms.length === 0 || isLoading}
            className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                symptoms.length === 0 || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
            {isLoading ? (
                <>
                    <Activity className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Analyzing...
                </>
            ) : (
                <>
                    <Zap className="-ml-1 mr-2 h-5 w-5" />
                    Analyze Symptoms
                </>
            )}
        </button>

        {/* Results Area */}
        {results.length > 0 && (
            <div className="mt-6 space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                    <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Response Time: <span className="font-mono font-bold ml-1 text-gray-900">{latency?.toFixed(2)}ms</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ml-2 ${source === 'cache' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        Source: {source === 'cache' ? 'Cached' : 'Model Inference'}
                    </span>
                </div>

                <div className="space-y-4">
                    {results.map((result, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{result.condition}</h3>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    result.probability > 0.7 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {(result.probability * 100).toFixed(0)}% Match
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                <span className="font-medium text-gray-900">Recommendation:</span> {result.recommendation}
                            </p>
                        </div>
                    ))}
                </div>
                
                <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-700">
                    <strong>Disclaimer:</strong> This is an AI-assisted tool simulation. Always consult a certified doctor for precise diagnosis.
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
