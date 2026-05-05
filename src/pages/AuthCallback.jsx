import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
          navigate('/login');
          return;
        }

        // Fetch user profile to check completeness
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('profiling_completed')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          // Ignore not found error as it might be a new user
          throw profileError;
        }

        if (profile && profile.profiling_completed) {
          navigate('/dashboard');
        } else {
          navigate('/profiling');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Authentication failed. Please try again.');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'red' }}>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/login')} style={{ marginTop: '1rem' }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--accent-green)' }}>Verifying...</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Please wait while we securely log you in.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
