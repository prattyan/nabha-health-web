import React, { useState } from 'react';
import { X, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  customRegister?: (data: any) => Promise<{ success: boolean; message?: string }>;
}

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin, customRegister }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'patient' as 'patient' | 'doctor' | 'healthworker',
    specialization: '',
    licenseNumber: '',
    village: '',
    workLocation: '',
    experience: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const { t } = useLanguage();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const dataToSubmit = {
      ...formData,
      experience: formData.experience ? parseInt(formData.experience) : undefined,
    };

    let result;
    if (customRegister) {
       result = await customRegister(dataToSubmit);
    } else {
       result = await register(dataToSubmit);
    }
    
    if (result.success) {
      setSuccess(result.message || 'Registration successful!');
      // Show success message for 2 seconds before closing
      setTimeout(() => {
        onClose();
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          firstName: '',
          lastName: '',
          phone: '',
          role: 'patient',
          specialization: '',
          licenseNumber: '',
          village: '',
          workLocation: '',
          experience: '',
        });
        setSuccess('');

        // Only switch to login if we are using the default flow (not custom register)
        if (!customRegister && onSwitchToLogin) {
             onSwitchToLogin();
        }
      }, 2000);
    } else {
      setError(result.message || 'Registration failed');
    }
    
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="text-center mb-6">
          <div className="bg-green-100 p-3 rounded-full inline-block mb-4">
            <UserPlus className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
          <h2 className="text-2xl font-bold text-gray-900">{t('auth.createAccount')}</h2>
          <p className="text-gray-600">{t('auth.joinDescription')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.firstName')} *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.lastName')} *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.email')} *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.phone')} *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="+91 XXXXX XXXXX"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.role')} *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            >
              <option value="patient">{t('auth.patient')}</option>
              <option value="doctor">{t('auth.doctor')}</option>
              <option value="healthworker">{t('auth.healthworker')}</option>
            </select>
          </div>

          {/* Role-specific fields */}
          {formData.role === 'patient' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.village')}
              </label>
              <input
                type="text"
                name="village"
                value={formData.village}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={t('auth.village')}
              />
            </div>
          )}

          {formData.role === 'doctor' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.specialization')}
                </label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t('auth.specialization')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.licenseNumber')}
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t('auth.licenseNumber')}
                />
              </div>
            </div>
          )}

          {formData.role === 'healthworker' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.workLocation')}
              </label>
              <input
                type="text"
                name="workLocation"
                value={formData.workLocation}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={t('auth.workLocation')}
              />
            </div>
          )}

          {(formData.role === 'doctor' || formData.role === 'healthworker') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.experience')}
              </label>
              <input
                type="number"
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                min="0"
                max="50"
              />
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.password')} *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.confirmPassword')} *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? t('auth.creatingAccount') : t('auth.createAccountBtn')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {t('auth.haveAccount')}{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              {t('auth.signInHere')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}