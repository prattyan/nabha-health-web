import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RBACProvider, useRBAC } from './contexts/RBACContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Header from './components/Header';
import LoginModal from './components/auth/LoginModal';
import RegisterModal from './components/auth/RegisterModal';
import PatientDashboard from './components/dashboards/PatientDashboard';
import DoctorDashboard from './components/dashboards/DoctorDashboard';
import HealthWorkerDashboard from './components/dashboards/HealthWorkerDashboard';
import PharmacyDashboard from './components/dashboards/PharmacyDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import RBACTester from './components/debug/RBACTester';
import Hero from './components/Hero';
import ProblemStatement from './components/ProblemStatement';
import Solution from './components/Solution';
import ServiceAreaMap from './components/ServiceAreaMap';
import Impact from './components/Impact';
import Footer from './components/Footer';

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const { checkPermission } = useRBAC();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

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
    // Check for RBAC test route - restrict to admins only
    if (window.location.hash === '#rbac-test') {
      // Only allow admin users to access RBAC tester
      if (user.role !== 'admin' && !checkPermission('admin:view_system_stats')) {
        // Redirect non-admins away from RBAC tester
        window.location.hash = '';
        return (
          <div className="min-h-screen">
            <Header 
              mobileMenuOpen={mobileMenuOpen} 
              setMobileMenuOpen={setMobileMenuOpen}
              onLoginClick={() => setShowLoginModal(true)}
            />
            <div className="pt-16 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
                <p className="text-gray-600">You need admin privileges to access the RBAC tester.</p>
              </div>
            </div>
          </div>
        );
      }
      
      return (
        <div className="min-h-screen">
          <Header 
            mobileMenuOpen={mobileMenuOpen} 
            setMobileMenuOpen={setMobileMenuOpen}
            onLoginClick={() => setShowLoginModal(true)}
          />
          <div className="pt-16">
            <RBACTester />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen">
        <Header 
          mobileMenuOpen={mobileMenuOpen} 
          setMobileMenuOpen={setMobileMenuOpen}
          onLoginClick={() => setShowLoginModal(true)}
        />
        {user.role === 'patient' && <PatientDashboard />}
        {user.role === 'doctor' && <DoctorDashboard />}
        {user.role === 'healthworker' && <HealthWorkerDashboard />}
        {user.role === 'pharmacy' && <PharmacyDashboard />}
        {user.role === 'admin' && <AdminDashboard />}
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
        <RBACProvider>
          <AppContent />
        </RBACProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;