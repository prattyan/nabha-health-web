import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { RegisterData } from '../../types/auth';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  customRegister?: (data: RegisterData) => Promise<{ success: boolean; message?: string }>;
}

// Maps technical/backend error messages to friendly, human-readable ones
const getFriendlyErrorMessage = (message: string): string => {
  const lower = message.toLowerCase();

  if (lower.includes('email') && (lower.includes('exist') || lower.includes('taken') || lower.includes('already') || lower.includes('duplicate'))) {
    return 'An account with this email address already exists. Please try logging in or use a different email.';
  }
  if (lower.includes('phone') && (lower.includes('exist') || lower.includes('taken') || lower.includes('already') || lower.includes('duplicate'))) {
    return 'This phone number is already registered. Please use a different number.';
  }
  if (lower.includes('password') && lower.includes('weak')) {
    return 'Your password is too weak. Please choose a stronger password with at least 8 characters.';
  }
  if (lower.includes('password') && lower.includes('match')) {
    return 'Your passwords do not match. Please make sure both passwords are the same.';
  }
  if (lower.includes('invalid email') || lower.includes('email format')) {
    return 'Please enter a valid email address (e.g. name@example.com).';
  }
  if (lower.includes('invalid phone') || lower.includes('phone format')) {
    return 'Please enter a valid phone number.';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection') || lower.includes('econnrefused')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  if (lower.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }
  if (lower.includes('server error') || lower.includes('500') || lower.includes('internal')) {
    return 'Something went wrong on our end. Please try again in a moment.';
  }
  if (lower.includes('unauthorized') || lower.includes('401')) {
    return 'You are not authorised to perform this action. Please contact support.';
  }
  if (lower.includes('forbidden') || lower.includes('403')) {
    return 'Access denied. Please contact support if you believe this is a mistake.';
  }
  if (lower.includes('required') || lower.includes('missing')) {
    return 'Please fill in all required fields and try again.';
  }

  // If we cannot map the error, return a safe generic message instead of the raw technical one
  return 'Registration failed. Please check your details and try again. If the problem persists, please contact support.';
};

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin, customRegister }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'patient' as 'patient' | 'doctor' | 'healthworker' | 'admin',
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

  // Ref to track the success setTimeout so we can cancel it on unmount
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel the timer if the component unmounts during the 2-second success window
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const { register } = useAuth();
  const { t } = useLanguage();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error as user starts correcting their input
    if (error) setError('');
  };

  // Client-side validation with friendly messages before hitting the server
  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) {
      return 'Please enter your first name.';
    }
    if (!formData.lastName.trim()) {
      return 'Please enter your last name.';
    }
    if (!formData.email.trim()) {
      return 'Please enter your email address.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Please enter a valid email address (e.g. name@example.com).';
    }
    if (!formData.phone.trim()) {
      return 'Please enter your phone number.';
    }
    const phoneRegex = /^[+]?[\d\s\-()]{7,15}$/;
    if (!phoneRegex.test(formData.phone)) {
      return 'Please enter a valid phone number (e.g. +91 98765 43210).';
    }
    if (!formData.password) {
      return 'Please enter a password.';
    }
    if (formData.password.length < 8) {
      return 'Your password must be at least 8 characters long.';
    }
    if (!formData.confirmPassword) {
      return 'Please confirm your password.';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Your passwords do not match. Please make sure both passwords are the same.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Run client-side validation first
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    const dataToSubmit = {
      ...formData,
      experience: formData.experience ? parseInt(formData.experience) : undefined,
    };

    try {
      let result;
      if (customRegister) {
        result = await customRegister(dataToSubmit);
      } else {
        result = await register(dataToSubmit);
      }

      if (result.success) {
        setSuccess(result.message || 'Registration successful! Welcome aboard 🎉');
        // Show success message for 2 seconds before closing;
        // keep button disabled for the entire 2-second window
        successTimerRef.current = setTimeout(() => {
          setIsLoading(false);
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
        // Convert technical backend message to a friendly one
        const rawMessage = result.message || 'Registration failed';
        setError(getFriendlyErrorMessage(rawMessage));
        setIsLoading(false);
      }
    } catch (err: any) {
      // Handle unexpected errors (network issues, etc.)
      const rawMessage = err?.message || 'Unexpected error';
      setError(getFriendlyErrorMessage(rawMessage));
      setIsLoading(false);
    }
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
              <option value="admin">Admin</option>
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
              <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters long.</p>
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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0" aria-hidden="true">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0" aria-hidden="true">✅</span>
              <span>{success}</span>
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