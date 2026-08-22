import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { getStoredFcmToken, registerNotificationServiceWorker, subscribeToForegroundMessages } from './services/notificationService';

// Critical path — above-the-fold, must load immediately
import Header from './components/Header';
import Hero from './components/Hero';

// Lazy-loaded dashboards — only one renders per authenticated session
const PatientDashboard = lazy(() => import('./components/dashboards/PatientDashboard'));
const DoctorDashboard = lazy(() => import('./components/dashboards/DoctorDashboard'));
const HealthWorkerDashboard = lazy(() => import('./components/dashboards/HealthWorkerDashboard'));
const AdminDashboard = lazy(() => import('./components/dashboards/AdminDashboard'));

// Lazy-loaded auth modals — only render when user clicks login/register
const LoginModal = lazy(() => import('./components/auth/LoginModal'));
const RegisterModal = lazy(() => import('./components/auth/RegisterModal'));

// Lazy-loaded below-fold landing sections — not visible on initial viewport
const ProblemStatement = lazy(() => import('./components/ProblemStatement'));
const Solution = lazy(() => import('./components/Solution'));
const ServiceAreaMap = lazy(() => import('./components/ServiceAreaMap'));
const Impact = lazy(() => import('./components/Impact'));
const Footer = lazy(() => import('./components/Footer'));

// Minimal loading fallback to avoid layout shift
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      const storedToken = getStoredFcmToken(user.id);
      if (storedToken && Notification.permission === 'granted') {
        registerNotificationServiceWorker().then(() => {
          subscribeToForegroundMessages();
        });
      }
    }
  }, [isAuthenticated, user]);

  const handleSwitchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  // Show dashboard if user is authenticated
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen">
        <Header 
          mobileMenuOpen={mobileMenuOpen} 
          setMobileMenuOpen={setMobileMenuOpen}
          onLoginClick={() => setShowLoginModal(true)}
        />
        <Suspense fallback={<LoadingFallback />}>
          {user.role === 'admin' && <AdminDashboard />}
          {user.role === 'patient' && <PatientDashboard />}
          {user.role === 'doctor' && <DoctorDashboard />}
          {user.role === 'healthworker' && <HealthWorkerDashboard />}
        </Suspense>
      </div>
    );
  }

  // Show landing page if not authenticated
  return (
    <div className="min-h-screen">
      <Header 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen}
        onLoginClick={() => setShowLoginModal(true)}
      />
      <Hero />
      <Suspense fallback={<LoadingFallback />}>
        <ProblemStatement />
        <Solution />
        <ServiceAreaMap />
        <Impact />
        <Footer />
      </Suspense>
      
      {showLoginModal && (
        <Suspense fallback={null}>
          <LoginModal
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            onSwitchToRegister={handleSwitchToRegister}
          />
        </Suspense>
      )}
      
      {showRegisterModal && (
        <Suspense fallback={null}>
          <RegisterModal
            isOpen={showRegisterModal}
            onClose={() => setShowRegisterModal(false)}
            onSwitchToLogin={handleSwitchToLogin}
          />
        </Suspense>
      )}
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;