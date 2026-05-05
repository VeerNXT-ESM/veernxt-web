import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    // Dummy login
    setTimeout(() => {
      navigate('/profiling');
      setLoading(false);
    }, 800);
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      padding: '1.5rem', 
      backgroundImage: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("/hero/hero_image.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      <div className="ios-card animate-fade-in" style={{ padding: '3.5rem 2.5rem', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--ios-olive)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
            V
          </div>
        </div>
        
        <h2 style={{ fontSize: '1.75rem', tracking: '-0.03em', marginBottom: '0.5rem' }}>VeerNXT App</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.9rem' }}>Secure portal for Agniveer candidates</p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. rahul@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid #eee',
                background: 'var(--ios-secondary)',
                color: 'var(--ios-text)',
                outline: 'none',
                fontFamily: 'inherit',
                fontSize: '1rem'
              }}
            />
          </div>
          <button type="submit" className="btn-primary ios-pill" disabled={loading} style={{ padding: '1rem', fontSize: '1rem' }}>
            {loading ? 'Sending link...' : 'Continue with Email'}
          </button>
        </form>

        {message && (
          <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: '12px', background: message.includes('Check') ? 'rgba(75, 107, 50, 0.05)' : 'rgba(239, 68, 68, 0.05)', color: message.includes('Check') ? 'var(--ios-olive)' : '#ef4444', fontSize: '0.85rem', fontWeight: '600' }}>
            {message}
          </div>
        )}

        <div style={{ marginTop: '3rem', borderTop: '1px solid #eee', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#ccc' }}>
          <ShieldCheck size={16} />
          <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>End-to-end encrypted session</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
