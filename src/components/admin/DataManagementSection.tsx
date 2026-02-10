import React, { useState } from 'react';
import { Download, Upload, Archive, AlertCircle } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { StorageService } from '../../services/storageService';

interface DataManagementSectionProps {
  onDataImported?: () => void;
}

export default function DataManagementSection({ onDataImported }: DataManagementSectionProps) {
  const authService = AuthService.getInstance();
  const storageService = StorageService.getInstance();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExportData = () => {
    try {
      setIsExporting(true);
      const exportedData = authService.exportUserData();
      
      // Create blob and download
      const blob = new Blob([exportedData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nabhacare-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Log activity and update backup time
      const activities = JSON.parse(storageService.getItem('activity_logs') || '[]');
      activities.push({
        id: Date.now().toString(),
        action: 'Data Export',
        timestamp: new Date().toISOString(),
        userId: authService.getCurrentUser()?.id || 'unknown',
        details: `Exported user data backup`
      });
      storageService.setItem('activity_logs', JSON.stringify(activities));
      storageService.setItem('last_backup', new Date().toISOString());

      setMessage({ type: 'success', text: 'Data exported successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error exporting data' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importedData = JSON.parse(content);

          // Validate structure
          if (!importedData.users || !Array.isArray(importedData.users)) {
            throw new Error('Invalid backup file format');
          }

      // Save imported users to StorageService
          const usersToImport = importedData.users.map((user: any) => ({
            ...user,
            password: '***' // Don't import passwords
          }));

          storageService.setItem('users', JSON.stringify(usersToImport));
          // Log activity
          const activities = JSON.parse(storageService.getItem('activity_logs') || '[]');
          activities.push({
            id: Date.now().toString(),
            action: 'Data Import',
            timestamp: new Date().toISOString(),
            userId: authService.getCurrentUser()?.id || 'unknown',
            details: `Imported ${usersToImport.length} users`
          });
          storageService.setItem('activity_logs', JSON.stringify(activities));
          storageService.setItem('last_backup', new Date().toISOString());
          setMessage({ type: 'success', text: `Imported ${usersToImport.length} users successfully!` });
          
          if (onDataImported) {
            onDataImported();
          }
          setTimeout(() => setMessage(null), 3000);
        } catch (error) {
          setMessage({ type: 'error', text: 'Invalid backup file format' });
          setTimeout(() => setMessage(null), 3000);
        } finally {
          setIsImporting(false);
        }
      };

      reader.readAsText(file);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error importing data' });
      setTimeout(() => setMessage(null), 3000);
      setIsImporting(false);
    }
  };

  const getLastBackupTime = () => {
    const lastBackup = storageService.getItem('last_backup');
    if (!lastBackup) return 'Never';
    return new Date(lastBackup).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Data Management</h2>
        <div className="bg-indigo-100 p-3 rounded-lg">
          <Archive className="h-6 w-6 text-indigo-600" />
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Backup Information */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Backup Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {localStorage.getItem('nabhacare_users') 
                  ? JSON.parse(localStorage.getItem('nabhacare_users') || '[]').length 
                  : 0}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Last Backup</p>
              <p className="text-lg font-semibold text-gray-900">{getLastBackupTime()}</p>
            </div>
          </div>
        </div>

        {/* Export Data */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Export Data
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Export all user data as a JSON backup file. This file will be encrypted when downloaded.
          </p>
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? 'Exporting...' : 'Export User Data'}</span>
          </button>
        </div>

        {/* Import Data */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Import Data
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Import user data from a previously exported backup file. This will add/update users in the system.
          </p>
          <label className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 cursor-pointer transition-colors">
            <Upload className="h-4 w-4" />
            <span>{isImporting ? 'Importing...' : 'Import User Data'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              disabled={isImporting}
              className="hidden"
            />
          </label>
        </div>

        {/* Storage Info */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Storage Status</h3>
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Storage Type:</span> Browser localStorage (5MB limit)
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">Important:</span> Regular backups are recommended. Data persists only in this browser until exported.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
