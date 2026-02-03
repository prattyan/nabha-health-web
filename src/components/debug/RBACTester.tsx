import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRBAC } from '../../contexts/RBACContext';
import { APIMiddleware } from '../../services/apiMiddleware';
import { RBACService } from '../../services/rbacService';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Play, 
  Users, 
  Database,
  AlertTriangle,
  Info
} from 'lucide-react';

interface TestResult {
  scenario: string;
  request: any;
  result: any;
}

const RBACTester: React.FC = () => {
  const { user } = useAuth();
  const { checkPermission, currentUser } = useRBAC();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [systemStats, setSystemStats] = useState<any>({});

  const apiMiddleware = APIMiddleware.getInstance();
  const rbacService = RBACService.getInstance();

  useEffect(() => {
    loadSystemStats();
  }, []);

  const loadSystemStats = () => {
    const stats = rbacService.getSystemStats();
    setSystemStats(stats);
  };

  const runRBACTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Create test users if they don't exist
      apiMiddleware.createTestUsers();
      
      // Wait a bit for users to be created
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Run test scenarios
      const results = await apiMiddleware.testRBACScenarios();
      setTestResults(results);
      
      // Reload stats
      loadSystemStats();
    } catch (error) {
      console.error('Error running RBAC tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const testCurrentUserPermissions = () => {
    if (!user) return [];

    const testPermissions = [
      'patient:view_profile',
      'doctor:view_appointments',
      'pharmacy:view_prescriptions',
      'admin:view_all_users',
      'system:api_access'
    ];

    return testPermissions.map(permission => ({
      permission,
      hasPermission: checkPermission(permission as any)
    }));
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const permissionTests = testCurrentUserPermissions();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Shield className="h-6 w-6 mr-2 text-blue-600" />
              RBAC System Tester
            </h2>
            <p className="text-gray-600 mt-1">
              Test Role-Based Access Control implementation
            </p>
          </div>
          <button
            onClick={runRBACTests}
            disabled={isRunning}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running Tests...' : 'Run RBAC Tests'}
          </button>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total Users</p>
                <p className="text-2xl font-bold text-blue-900">{systemStats.totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Active Roles</p>
                <p className="text-2xl font-bold text-green-900">{systemStats.totalRoles || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-600">User Roles</p>
                <p className="text-2xl font-bold text-purple-900">{systemStats.activeUserRoles || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-600">Recent Logs</p>
                <p className="text-2xl font-bold text-yellow-900">{systemStats.recentAuditLogs || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current User Permissions */}
        {user && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Current User Permissions ({user.firstName} {user.lastName} - {user.role})
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {permissionTests.map((test, index) => (
                  <div key={index} className="flex items-center justify-between bg-white rounded p-3">
                    <span className="text-sm text-gray-700">{test.permission}</span>
                    {getStatusIcon(test.hasPermission)}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-gray-600">
                <Info className="h-4 w-4 inline mr-1" />
                Total permissions: {currentUser.permissions.length}
              </div>
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              API Access Test Results
            </h3>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{result.scenario}</h4>
                    <div className="flex items-center">
                      {getStatusIcon(result.result.success)}
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(result.result.success)}`}>
                        {result.result.statusCode}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Request:</strong> {result.request.method} {result.request.path}
                    {result.request.userId && (
                      <span className="ml-2">
                        (User: {result.request.userId})
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm">
                    {result.result.success ? (
                      <span className="text-green-600">✓ Access granted</span>
                    ) : (
                      <span className="text-red-600">✗ {result.result.error}</span>
                    )}
                  </div>

                  {result.result.data && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer">
                        View Response Data
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How to Test RBAC:</h4>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>Click "Run RBAC Tests" to create test users and run API access scenarios</li>
            <li>Check the test results to see which API calls succeed or fail based on user roles</li>
            <li>View your current user permissions above to understand your access level</li>
            <li>Try logging in as different test users to see different permission sets</li>
            <li>Test users created: patient@test.com, doctor@test.com, pharmacy@test.com, admin@test.com (password: password123)</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default RBACTester;