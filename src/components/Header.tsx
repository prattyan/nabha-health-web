import React from 'react';
import { Heart, Menu, X, User, LogIn, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage, Language } from '../contexts/LanguageContext';
import UserProfile from './auth/UserProfile';

interface HeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onLoginClick: () => void;
}

export default function Header({ mobileMenuOpen, setMobileMenuOpen, onLoginClick }: HeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showProfile, setShowProfile] = React.useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = React.useState(false);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' }
  ];

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('header.title')}</h1>
              <p className="text-xs text-gray-600">{t('header.subtitle')}</p>
            </div>
          </div>
          {/* Only show language selector and user name if signed in */}
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {languages.find(lang => lang.code === language)?.nativeName}
                  </span>
                </button>
                {showLanguageMenu && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code as Language);
                          setShowLanguageMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          language === lang.code ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {lang.nativeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center space-x-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span className="font-medium">{user.firstName} {user.lastName}</span>
                </button>
                <UserProfile isOpen={showProfile} onClose={() => setShowProfile(false)} />
              </div>
            </div>
          ) : (
            <>
              <nav className="hidden lg:flex space-x-8">
                <a href="#home" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">{t('header.home')}</a>
                <a href="#problem" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">{t('header.problem')}</a>
                <a href="#solution" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">{t('header.solution')}</a>
                <a href="#servicearea" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">{t('header.servicearea')}</a>
                <a href="#impact" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">{t('header.impact')}</a>
              </nav>
              <div className="hidden lg:flex items-center space-x-4">
                <div className="relative">
                  <button
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {languages.find(lang => lang.code === language)?.nativeName}
                    </span>
                  </button>
                  {showLanguageMenu && (
                    <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code as Language);
                            setShowLanguageMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            language === lang.code ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {lang.nativeName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={onLoginClick}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{t('header.signin')}</span>
                </button>
              </div>
            </>
          )}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-blue-600"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-2 pt-4">
              {/* Only show language and user name if signed in */}
              {isAuthenticated && user ? (
                <>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('header.language')}</p>
                    <div className="flex space-x-2">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => setLanguage(lang.code as Language)}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            language === lang.code 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {lang.nativeName}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2 py-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-700">{user.firstName} {user.lastName}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <a href="#home" className="text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors">{t('header.home')}</a>
                  <a href="#problem" className="text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors">{t('header.problem')}</a>
                  <a href="#solution" className="text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors">{t('header.solution')}</a>
                  <a href="#servicearea" className="text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors">{t('header.servicearea')}</a>
                  <a href="#impact" className="text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors">{t('header.impact')}</a>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('header.language')}</p>
                    <div className="flex space-x-2">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => setLanguage(lang.code as Language)}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            language === lang.code 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {lang.nativeName}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={onLoginClick}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full justify-center"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>{t('header.signin')}</span>
                    </button>
                  </div>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}