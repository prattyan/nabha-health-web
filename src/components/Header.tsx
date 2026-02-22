import React, { useRef, useState } from 'react';
import { Heart, Menu, X, User, LogIn, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage, type Language } from '../contexts/LanguageContext';
import UserProfile from './auth/UserProfile';

interface HeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onLoginClick: () => void;
}

// Animated nav link component with hover effect
const NavLink = ({ 
  href, 
  children, 
  onHover 
}: { 
  href: string; 
  children: React.ReactNode; 
  onHover: (rect: DOMRect | null) => void;
}) => {
  const ref = useRef<HTMLAnchorElement>(null);
  
  return (
    <motion.a
      ref={ref}
      href={href}
      className="relative text-slate-700 font-medium px-4 py-2 rounded-lg transition-colors z-10"
      onMouseEnter={() => {
        if (ref.current) {
          onHover(ref.current.getBoundingClientRect());
        }
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.span
        className="relative z-10"
        whileHover={{ color: '#2563eb' }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.span>
    </motion.a>
  );
};

export default function Header({ mobileMenuOpen, setMobileMenuOpen, onLoginClick }: HeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showProfile, setShowProfile] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' }
  ];

  const handleNavHover = (rect: DOMRect | null) => {
    if (rect && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      setHighlightRect({
        ...rect,
        x: rect.x - navRect.x,
        y: rect.y - navRect.y,
      } as DOMRect);
    }
  };

  return (
    <motion.header 
      className="bg-gradient-to-r from-slate-50 via-white to-blue-50/30 backdrop-blur-md shadow-lg shadow-blue-100/20 sticky top-0 z-50 border-b border-blue-100/50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <motion.div 
            className="flex items-center space-x-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div 
              className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-200/50"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Heart className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">{t('header.title')}</h1>
              <p className="text-xs text-blue-600/70">{t('header.subtitle')}</p>
            </div>
          </motion.div>
          {/* Only show language selector and user name if signed in */}
          {isAuthenticated && user ? (
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="relative">
                <motion.button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="flex items-center space-x-2 text-slate-700 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {languages.find(lang => lang.code === language)?.nativeName}
                  </span>
                </motion.button>
                <AnimatePresence>
                  {showLanguageMenu && (
                    <motion.div 
                      className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-blue-100 z-50 overflow-hidden"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                        {languages.map((lang: { code: Language; name: string; nativeName: string }, index: number) => (
                        <motion.button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);

                            setShowLanguageMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${
                            language === lang.code ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'
                          }`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ x: 5, backgroundColor: '#eff6ff' }}
                        >
                          {lang.nativeName}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative">
                <motion.button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2.5 rounded-xl shadow-md shadow-blue-200/50"
                  whileHover={{ scale: 1.05, boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  <User className="h-4 w-4" />
                  <span className="font-medium">{user.firstName} {user.lastName}</span>
                </motion.button>
                <UserProfile isOpen={showProfile} onClose={() => setShowProfile(false)} />
              </div>
            </motion.div>
          ) : (
            <>
              <nav 
                ref={navRef}
                className="hidden md:flex items-center space-x-1 relative bg-gradient-to-r from-blue-50/60 to-indigo-50/60 rounded-full px-3 py-1.5 border border-blue-100/50"
                onMouseEnter={() => setIsNavHovered(true)}
                onMouseLeave={() => {
                  setIsNavHovered(false);
                  setHighlightRect(null);
                }}
              >
                {/* Animated highlight box */}
                <AnimatePresence>
                  {isNavHovered && highlightRect && (
                    <motion.div
                      className="absolute bg-gradient-to-r from-blue-100 to-indigo-50 rounded-lg border border-blue-200/50 shadow-sm shadow-blue-100/30"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        x: highlightRect.x,
                        width: highlightRect.width,
                        height: highlightRect.height,
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      style={{ top: highlightRect.y }}
                    />
                  )}
                </AnimatePresence>
                <NavLink href="#home" onHover={handleNavHover}>{t('header.home')}</NavLink>
                <NavLink href="#problem" onHover={handleNavHover}>{t('header.problem')}</NavLink>
                <NavLink href="#solution" onHover={handleNavHover}>{t('header.solution')}</NavLink>
                <NavLink href="#servicearea" onHover={handleNavHover}>{t('header.servicearea')}</NavLink>
                <NavLink href="#impact" onHover={handleNavHover}>{t('header.impact')}</NavLink>
              </nav>
              <motion.div 
                className="hidden md:flex items-center space-x-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="relative">
                  <motion.button
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    className="flex items-center space-x-2 text-slate-700 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Globe className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {languages.find(lang => lang.code === language)?.nativeName}
                    </span>
                  </motion.button>
                  <AnimatePresence>
                    {showLanguageMenu && (
                      <motion.div 
                        className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-blue-100 z-50 overflow-hidden"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        {languages.map((lang: { code: Language; name: string; nativeName: string }, index: number) => (
                          <motion.button
                            key={lang.code}
                            onClick={() => {
                              setLanguage(lang.code);

                              setShowLanguageMenu(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${
                              language === lang.code ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'
                            }`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ x: 5 }}
                          >
                            {lang.nativeName}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <motion.button
                  onClick={onLoginClick}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-5 py-2.5 rounded-xl shadow-md shadow-blue-200/50"
                  whileHover={{ 
                    scale: 1.05, 
                    boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <LogIn className="h-4 w-4" />
                  <span className="font-medium">{t('header.signin')}</span>
                </motion.button>
              </motion.div>
            </>
          )}
          <div className="md:hidden">
            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-700 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="h-6 w-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="h-6 w-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              className="md:hidden pb-4 border-t border-blue-100 overflow-hidden bg-gradient-to-b from-white to-blue-50/30"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <nav className="flex flex-col space-y-2 pt-4">
                {/* Only show language and user name if signed in */}
                {isAuthenticated && user ? (
                  <>
                    <motion.div 
                      className="pt-2 border-t border-blue-100"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <p className="text-sm font-medium text-slate-700 mb-2">{t('header.language')}</p>
                      <div className="flex space-x-2">
                        {languages.map((lang: { code: Language; name: string; nativeName: string }) => (
                          <motion.button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code)}

                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              language === lang.code 
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm' 
                                : 'bg-slate-100 text-slate-700 hover:bg-blue-50'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {lang.nativeName}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                    <motion.div 
                      className="pt-4 border-t border-blue-100"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="flex items-center space-x-2 py-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="text-slate-700">{user.firstName} {user.lastName}</span>
                      </div>
                    </motion.div>
                  </>
                ) : (
                  <>
                    {['home', 'problem', 'solution', 'servicearea', 'impact'].map((item, index) => (
                      <motion.a 
                        key={item}
                        href={`#${item}`} 
                        className="text-slate-700 hover:text-blue-600 font-medium py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 5, backgroundColor: '#eff6ff' }}
                      >
                        {t(`header.${item}`)}
                      </motion.a>
                    ))}
                    <motion.div 
                      className="pt-2 border-t border-blue-100"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <p className="text-sm font-medium text-slate-700 mb-2">{t('header.language')}</p>
                      <div className="flex space-x-2">
                        {languages.map((lang: { code: Language; name: string; nativeName: string }) => (
                          <motion.button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code)}

                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              language === lang.code 
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm' 
                                : 'bg-slate-100 text-slate-700 hover:bg-blue-50'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {lang.nativeName}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                    <motion.div 
                      className="pt-4 border-t border-blue-100"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <motion.button
                        onClick={onLoginClick}
                        className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2.5 rounded-xl shadow-md shadow-blue-200/50 w-full justify-center"
                        whileHover={{ scale: 1.02, boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)' }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <LogIn className="h-4 w-4" />
                        <span>{t('header.signin')}</span>
                      </motion.button>
                    </motion.div>
                  </>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}