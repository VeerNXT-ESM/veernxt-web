import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import Header from './components/Header';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Profiling from './pages/Profiling';
import Dashboard from './pages/Dashboard';
import LearningCenter from './pages/LearningCenter';
import FinancialGuidance from './pages/FinancialGuidance';
import SecureReader from './components/SecureReader';
import Footer from './components/Footer';
import AdminJobs from './pages/admin/AdminJobs';
import PublicJobs from './pages/PublicJobs';
import FindCandidates from './pages/FindCandidates';
import MessagingWorkspace from './components/MessagingWorkspace';
import Subscribe from './pages/Subscribe';
import Network from './pages/Network';

// Landing & Payment Bridge
import { LandingPage } from './components/landing/LandingPage';
import { PaymentPage } from './components/PaymentPage';
import { supabase } from './lib/supabase';

// New Legal Pages
import PrivacyPolicy from './pages/PrivacyPolicy';
import Support from './pages/Support';
import Legal from './pages/Legal';
import InteractiveQuiz from './components/InteractiveQuiz';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminContentEditor from './pages/admin/AdminContentEditor';
import AdminQuizEditor from './pages/admin/AdminQuizEditor';
import CVBuilder from './pages/CVBuilder';
import './index.css';

/**
 * RootRoute Component
 * - If user is NOT signed in -> Renders LandingPage.
 * - If user IS signed in -> Redirects directly to /dashboard.
 */
const RootRoute = () => {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (mounted) setSession(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) setSession(s);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Loading state
  if (session === undefined) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0a0a0a',
        color: '#ffffff',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.2)',
          borderTop: '3px solid #8BB85C',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // If signed in -> redirect to dashboard
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  // If not signed in -> render landing page
  return <LandingPage />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing / Root Handler */}
        <Route path="/" element={<RootRoute />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/financial-guidance" element={<FinancialGuidance />} />
        <Route path="/pay" element={<PaymentPage />} />

        {/* Routes with Global Header */}
        <Route element={<Layout />}>
          <Route path="/profiling" element={<AuthGuard skipProfilingCheck><Profiling /></AuthGuard>} />
          <Route path="/subscribe" element={<AuthGuard skipProfilingCheck><Subscribe /></AuthGuard>} />
          <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
          <Route path="/learning-center" element={<AuthGuard><LearningCenter /></AuthGuard>} />
          <Route path="/jobs" element={<AuthGuard><PublicJobs /></AuthGuard>} />
          <Route path="/find-candidates" element={<AuthGuard><FindCandidates /></AuthGuard>} />
          <Route path="/messaging" element={<AuthGuard><MessagingWorkspace /></AuthGuard>} />
          <Route path="/network" element={<AuthGuard><Network /></AuthGuard>} />
          <Route path="/reader/:id" element={<AuthGuard><SecureReader /></AuthGuard>} />
          <Route path="/quiz/:id" element={<AuthGuard><InteractiveQuiz /></AuthGuard>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/support" element={<Support />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/cv" element={<AuthGuard><CVBuilder /></AuthGuard>} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/content/:id?" element={<AdminContentEditor />} />
        <Route path="/admin/quiz/:id?" element={<AdminQuizEditor />} />
        <Route path="/admin/jobs" element={<AdminJobs />} />
      </Routes>
    </Router>
  );
}

// Layout wrapper for pages that need the Header
const Layout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: '1' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default App;
