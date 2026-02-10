import { Brain, Activity, Zap } from 'lucide-react';

interface TriageLog {
  id: string;
  patientId: string;
  symptoms: string[];
  severity: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
  village: string;
}

// Mock triage logs data
const MOCK_TRIAGE_LOGS: TriageLog[] = [
  { id: 'T001', patientId: 'PAT001', symptoms: ['fever', 'cough'], severity: 'medium', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), village: 'Nabha' },
  { id: 'T002', patientId: 'PAT002', symptoms: ['headache', 'body pain'], severity: 'low', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), village: 'Rajpura' },
  { id: 'T003', patientId: 'PAT003', symptoms: ['chest pain', 'shortness of breath'], severity: 'urgent', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), village: 'Nabha' },
  { id: 'T004', patientId: 'PAT004', symptoms: ['nausea', 'vomiting', 'diarrhea'], severity: 'high', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), village: 'Khanna' },
  { id: 'T005', patientId: 'PAT005', symptoms: ['cold', 'sore throat'], severity: 'low', timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), village: 'Samana' },
  { id: 'T006', patientId: 'PAT006', symptoms: ['abdominal pain', 'fever'], severity: 'high', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), village: 'Nabha' },
  { id: 'T007', patientId: 'PAT007', symptoms: ['fatigue', 'loss of appetite'], severity: 'medium', timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(), village: 'Rajpura' },
  { id: 'T008', patientId: 'PAT008', symptoms: ['dizziness'], severity: 'low', timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(), village: 'Khanna' },
];

interface TriageLogsCardProps {
  isLoading?: boolean;
}

export default function TriageLogsCard({ isLoading = false }: TriageLogsCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const severityDistribution = {
    low: MOCK_TRIAGE_LOGS.filter(t => t.severity === 'low').length,
    medium: MOCK_TRIAGE_LOGS.filter(t => t.severity === 'medium').length,
    high: MOCK_TRIAGE_LOGS.filter(t => t.severity === 'high').length,
    urgent: MOCK_TRIAGE_LOGS.filter(t => t.severity === 'urgent').length,
  };

  // Get common symptoms
  const allSymptoms: { [key: string]: number } = {};
  MOCK_TRIAGE_LOGS.forEach(log => {
    log.symptoms.forEach(symptom => {
      allSymptoms[symptom] = (allSymptoms[symptom] || 0) + 1;
    });
  });

  const commonSymptoms = Object.entries(allSymptoms)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Get triage by village
  const villageTriageMap: { [key: string]: number } = {};
  MOCK_TRIAGE_LOGS.forEach(log => {
    villageTriageMap[log.village] = (villageTriageMap[log.village] || 0) + 1;
  });

  const triageByVillage = Object.entries(villageTriageMap)
    .map(([village, count]) => ({ village, count }))
    .sort((a, b) => b.count - a.count);

  // Get recent triages
  const recentTriages = [...MOCK_TRIAGE_LOGS]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Triage Logs</h3>
        <div className="bg-purple-100 p-3 rounded-lg">
          <Brain className="h-6 w-6 text-purple-600" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Total Triages */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600">Total Triage Interactions</p>
          <p className="text-3xl font-bold text-gray-900">{MOCK_TRIAGE_LOGS.length}</p>
        </div>

        {/* Severity Distribution */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600 flex items-center mb-2">
            <Zap className="w-4 h-4 mr-2" />
            Severity Distribution
          </p>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-green-50 p-2 rounded">
              <p className="text-2xl font-bold text-green-600">{severityDistribution.low}</p>
              <p className="text-xs text-gray-600">Low</p>
            </div>
            <div className="bg-yellow-50 p-2 rounded">
              <p className="text-2xl font-bold text-yellow-600">{severityDistribution.medium}</p>
              <p className="text-xs text-gray-600">Medium</p>
            </div>
            <div className="bg-orange-50 p-2 rounded">
              <p className="text-2xl font-bold text-orange-600">{severityDistribution.high}</p>
              <p className="text-xs text-gray-600">High</p>
            </div>
            <div className="bg-red-50 p-2 rounded">
              <p className="text-2xl font-bold text-red-600">{severityDistribution.urgent}</p>
              <p className="text-xs text-gray-600">Urgent</p>
            </div>
          </div>
        </div>

        {/* Common Symptoms */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600 mb-2">Most Common Symptoms</p>
          <div className="space-y-2">
            {commonSymptoms.map((symptom, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-sm text-gray-700 capitalize">{symptom.name}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600"
                      style={{ width: `${(symptom.count / MOCK_TRIAGE_LOGS.length) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{symptom.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Triage by Village */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600 mb-2">Triage Usage by Village</p>
          <div className="space-y-2">
            {triageByVillage.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                <span className="text-sm text-gray-700">{item.village}</span>
                <span className="text-sm font-semibold text-purple-600">{item.count} triages</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Triages */}
        <div>
          <p className="text-sm text-gray-600 flex items-center mb-2">
            <Activity className="w-4 h-4 mr-2" />
            Recent Triage Sessions
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {recentTriages.map((triage) => (
              <div key={triage.id} className="flex items-start justify-between bg-gray-50 p-2 rounded text-xs">
                <div>
                  <span className={`inline-block px-2 py-1 rounded-full font-semibold mb-1 border ${getSeverityColor(triage.severity)}`}>
                    {triage.severity.charAt(0).toUpperCase() + triage.severity.slice(1)}
                  </span>
                  <p className="text-gray-700">
                    {triage.symptoms.slice(0, 2).join(', ')}
                    {triage.symptoms.length > 2 ? '...' : ''}
                  </p>
                  <p className="text-gray-500">{triage.village} • {new Date(triage.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">Note:</span> This displays mock triage data. Real AI triage integration coming soon.
        </p>
      </div>
    </div>
  );
}
