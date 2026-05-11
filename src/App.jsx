import React from 'react';
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

// New Legal Pages
import PrivacyPolicy from './pages/PrivacyPolicy';
import Support from './pages/Support';
import Legal from './pages/Legal';
import InteractiveQuiz from './components/InteractiveQuiz';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminContentEditor from './pages/admin/AdminContentEditor';
import AdminQuizEditor from './pages/admin/AdminQuizEditor';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Routes with Global Header */}
        <Route element={<Layout />}>
          <Route path="/profiling" element={<Profiling />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/learning-center" element={<LearningCenter />} />
          <Route path="/financial-guidance" element={<FinancialGuidance />} />
          <Route path="/jobs" element={<PublicJobs />} />
          <Route path="/reader/:id" element={<SecureReader />} />
          <Route path="/quiz/:id" element={<InteractiveQuiz />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/support" element={<Support />} />
          <Route path="/legal" element={<Legal />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/content/:id?" element={<AdminContentEditor />} />
        <Route path="/admin/quiz/:id?" element={<AdminQuizEditor />} />
        <Route path="/admin/jobs" element={<AdminJobs />} />

        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
