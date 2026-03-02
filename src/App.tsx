import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { getStoredFcmToken, registerNotificationServiceWorker, subscribeToForegroundMessages } from './services/notificationService';
import Header from './components/Header';
import LoginModal from './components/auth/LoginModal';
import RegisterModal from './components/auth/RegisterModal';
import PatientDashboard from './components/dashboards/PatientDashboard';
import DoctorDashboard from './components/dashboards/DoctorDashboard';
import HealthWorkerDashboard from './components/dashboards/HealthWorkerDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import Hero from './components/Hero';
import ProblemStatement from './components/ProblemStatement';
import Solution from './components/Solution';
import ServiceAreaMap from './components/ServiceAreaMap';
import Impact from './components/Impact';
import Footer from './components/Footer';

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
        {user.role === 'admin' && <AdminDashboard />}
        {user.role === 'patient' && <PatientDashboard />}
        {user.role === 'doctor' && <DoctorDashboard />}
        {user.role === 'healthworker' && <HealthWorkerDashboard />}
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
      <ProblemStatement />
      <Solution />
      <ServiceAreaMap />
      <Impact />
      <Footer />
      
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={handleSwitchToRegister}
      />
      
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />
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