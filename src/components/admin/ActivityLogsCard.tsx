import { Clock, AlertCircle } from 'lucide-react';
import { StorageService } from '../../services/storageService';

interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  userId: string;
  details?: string;
}

interface ActivityLogsCardProps {
  isLoading?: boolean;
}

export default function ActivityLogsCard({ isLoading = false }: ActivityLogsCardProps) {
  const storageService = StorageService.getInstance();
  
  // Get activity logs from StorageService
  const getActivityLogs = (): ActivityLog[] => {
    try {
      const logsStr = storageService.getItem('activity_logs');
      return logsStr ? JSON.parse(logsStr) : [];
    } catch {
      return [];
    }
  };

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

  const activityLogs = getActivityLogs();
  const recentLogs = [...activityLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  // Categorize logs by action
  const logCategories: { [key: string]: number } = {
    'login': 0,
    'export': 0,
    'import': 0,
    'view': 0,
    'update': 0,
    'delete': 0,
  };

  activityLogs.forEach(log => {
    const action = log.action.toLowerCase();
    for (const category in logCategories) {
      if (action.includes(category)) {
        logCategories[category]++;
        break;
      }
    }
  });

  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('delete') || lowerAction.includes('logout')) {
      return 'bg-red-100 text-red-800 border-red-300';
    } else if (lowerAction.includes('export') || lowerAction.includes('import')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (lowerAction.includes('update') || lowerAction.includes('edit')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else if (lowerAction.includes('login') || lowerAction.includes('view')) {
      return 'bg-green-100 text-green-800 border-green-300';
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Activity Logs</h3>
        <div className="bg-cyan-100 p-3 rounded-lg">
          <Clock className="h-6 w-6 text-cyan-600" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Total Activities */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600">Total Activities Recorded</p>
          <p className="text-3xl font-bold text-gray-900">{activityLogs.length}</p>
        </div>

        {/* Activity Distribution */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600 mb-2">Activity by Type</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 p-2 rounded">
              <p className="text-lg font-bold text-green-600">{logCategories['login']}</p>
              <p className="text-xs text-gray-600">Logins</p>
            </div>
            <div className="bg-blue-50 p-2 rounded">
              <p className="text-lg font-bold text-blue-600">{logCategories['export'] + logCategories['import']}</p>
              <p className="text-xs text-gray-600">Backups</p>
            </div>
            <div className="bg-yellow-50 p-2 rounded">
              <p className="text-lg font-bold text-yellow-600">{logCategories['view'] + logCategories['update']}</p>
              <p className="text-xs text-gray-600">Actions</p>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="border-b pb-4">
          <p className="text-sm text-gray-600 flex items-center mb-2">
            <Clock className="w-4 h-4 mr-2" />
            Recent Activities
          </p>
          {recentLogs.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-gray-600">{log.details}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">ID: {log.userId}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">No activities recorded yet.</span> Activities will be logged as admin performs actions like exports, imports, and data management operations.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Activity Summary */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Activity Summary (Last 24h)</p>
          <div className="space-y-2">
            {Object.entries(logCategories)
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 capitalize">{category}</span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            {Object.values(logCategories).every(count => count === 0) && (
              <p className="text-sm text-gray-500 italic">No activities in the last 24 hours</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">Note:</span> Activity logs are stored locally and used for audit trail purposes.
        </p>
      </div>
    </div>
  );
}
