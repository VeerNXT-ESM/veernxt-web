import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * AuthGuard — protects routes that require authentication.
 * 
 * Flow:
 *   1. No session → redirect to /login
 *   2. Session exists but no profile completed → redirect to /profiling
 *   3. Session + profile → render children
 * 
 * The profiling gate can be skipped for certain routes via `skipProfilingCheck`.
 */
const AuthGuard = ({ children, skipProfilingCheck = false }) => {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profilingDone, setProfilingDone] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (mounted) setSession(s);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) setSession(s);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Once we have a session, check if profiling is complete
  useEffect(() => {
    if (!session?.user || skipProfilingCheck) return;

    const checkProfiling = async () => {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('profiling_completed')
          .eq('id', session.user.id)
          .single();

        setProfilingDone(profile?.profiling_completed || false);
      } catch {
        setProfilingDone(false);
      }
    };

    checkProfiling();
  }, [session, skipProfilingCheck]);

  // Loading state
  if (session === undefined) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '2rem 3rem',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #4B6B32',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Verifying session...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }
  // No session — redirect to login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Employer Access Authorization Gate
  if (location.pathname === '/find-candidates') {
    const isEmployer = session.user?.user_metadata?.role === 'employer' || !!localStorage.getItem('employer_session');
    if (!isEmployer) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If profiling check is skipped (e.g. the /profiling page itself), render children
  if (skipProfilingCheck) {
    return children;
  }

  // Still loading profiling status
  if (profilingDone === null) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '2rem 3rem',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #4B6B32',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Loading profile...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Profiling not completed — redirect to profiling page
  if (!profilingDone) {
    return <Navigate to="/profiling" replace />;
  }

  // Authenticated + profiling complete — render protected content
  return children;
};

export default AuthGuard;
