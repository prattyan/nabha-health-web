import React from 'react';
import { User, MapPin, Stethoscope, Briefcase, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const handleLogout = () => {
    logout();
    onClose();
  };

  if (!isOpen || !user) return null;

  const getRoleIcon = () => {
    switch (user.role) {
      case 'doctor':
        return <Stethoscope className="h-5 w-5" />;
      case 'healthworker':
        return <Briefcase className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getRoleColor = () => {
    switch (user.role) {
      case 'doctor':
        return 'bg-blue-100 text-blue-800';
      case 'healthworker':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-full">
            {getRoleIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </h3>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleColor()}`}>
              {t(`auth.${user.role}`)}
            </span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>📞</span>
            <span>{user.phone}</span>
          </div>
          
          {user.village && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{user.village}</span>
            </div>
          )}
          
          {user.specialization && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Stethoscope className="h-4 w-4" />
              <span>{user.specialization}</span>
            </div>
          )}
          
          {user.workLocation && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Briefcase className="h-4 w-4" />
              <span>{user.workLocation}</span>
            </div>
          )}
          
          {user.experience && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>🎓</span>
              <span>{user.experience} years experience</span>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-50 text-red-600 py-2 px-4 rounded-lg hover:bg-red-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>{t('common.signOut')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}