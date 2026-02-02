import React from "react";
import { Heart, Menu, X, User, LogIn, Globe } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import UserProfile from "./auth/UserProfile";

interface HeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onLoginClick: () => void;
}

export default function Header({
  mobileMenuOpen,
  setMobileMenuOpen,
  onLoginClick,
}: HeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [showProfile, setShowProfile] = React.useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = React.useState(false);

  const languages = [
    { code: "en", nativeName: "English" },
    { code: "hi", nativeName: "हिंदी" },
    { code: "pa", nativeName: "ਪੰਜਾਬੀ" },
  ];

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {t("header.title")}
              </h1>
              <p className="text-xs text-gray-600">
                {t("header.subtitle")}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-50"
              >
                <Globe className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {languages.find(l => l.code === language)?.nativeName}
                </span>
              </button>

              {showLanguageMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as any);
                        setShowLanguageMenu(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        language === lang.code
                          ? "bg-blue-50 text-blue-600"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {lang.nativeName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auth */}
            {isAuthenticated && user ? (
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center space-x-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg"
              >
                <User className="h-4 w-4" />
                <span>{user.firstName} {user.lastName}</span>
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                <LogIn className="h-4 w-4" />
                <span>{t("header.signin")}</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <UserProfile isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </header>
  );
}
