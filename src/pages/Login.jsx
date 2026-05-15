import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Mail, Phone as PhoneIcon, ArrowLeft } from 'lucide-react';

const Login = () => {
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' | 'email'
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  const handleSendOTP = (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Mock sending OTP
    setTimeout(() => {
      setStep('verify');
      setLoading(false);
      setMessage(`OTP sent to your ${authMethod === 'phone' ? 'phone' : 'email'}.`);
    }, 1200);
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Mock verify OTP
    setTimeout(() => {
      navigate('/profiling');
      setLoading(false);
    }, 1500);
  };

  const resetFlow = () => {
    setStep('request');
    setOtp('');
    setMessage('');
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
          <img src="/logo.png" alt="VeerNXT" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
        </div>
        
        <h2 style={{ fontSize: '1.75rem', tracking: '-0.03em', marginBottom: '0.5rem' }}>VeerNXT App</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.9rem' }}>Secure portal for Agniveer candidates</p>
        
        {step === 'request' ? (
          <>
            {/* Toggle Phone / Email */}
            <div style={{ display: 'flex', background: 'var(--ios-secondary)', borderRadius: '12px', padding: '0.25rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setAuthMethod('phone')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: authMethod === 'phone' ? 'white' : 'transparent',
                  color: authMethod === 'phone' ? 'var(--ios-olive)' : 'var(--text-secondary)',
                  boxShadow: authMethod === 'phone' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  fontWeight: authMethod === 'phone' ? '700' : '500',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <PhoneIcon size={16} /> Phone
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('email')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: authMethod === 'email' ? 'white' : 'transparent',
                  color: authMethod === 'email' ? 'var(--ios-olive)' : 'var(--text-secondary)',
                  boxShadow: authMethod === 'email' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  fontWeight: authMethod === 'email' ? '700' : '500',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Mail size={16} /> Email
              </button>
            </div>

            <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ textAlign: 'left' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>
                  {authMethod === 'phone' ? 'Mobile Number' : 'Email Address'}
                </label>
                
                {authMethod === 'phone' ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{
                      padding: '1rem 0.75rem',
                      borderRadius: '12px',
                      border: '1px solid #eee',
                      background: 'var(--ios-secondary)',
                      color: 'var(--ios-text)',
                      fontWeight: '600',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      +91
                    </div>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      style={{
                        flex: 1,
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '1px solid #eee',
                        background: 'var(--ios-secondary)',
                        color: 'var(--ios-text)',
                        outline: 'none',
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                        letterSpacing: '0.05em'
                      }}
                    />
                  </div>
                ) : (
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
                )}
              </div>
              <button type="submit" className="btn-primary ios-pill" disabled={loading} style={{ padding: '1rem', fontSize: '1rem' }}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          </>
        ) : (
          <div className="animate-fade-in">
            <button 
              onClick={resetFlow}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                cursor: 'pointer',
                marginBottom: '1.5rem',
                padding: '0.5rem 0',
                fontWeight: '600'
              }}
            >
              <ArrowLeft size={16} /> Back
            </button>

            <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ textAlign: 'left' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Enter 6-Digit OTP</label>
                <input
                  type="text"
                  placeholder="------"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #eee',
                    background: 'var(--ios-secondary)',
                    color: 'var(--ios-text)',
                    outline: 'none',
                    fontFamily: 'monospace',
                    fontSize: '1.5rem',
                    letterSpacing: '0.5em',
                    textAlign: 'center'
                  }}
                />
              </div>
              <button type="submit" className="btn-primary ios-pill" disabled={loading || otp.length !== 6} style={{ padding: '1rem', fontSize: '1rem' }}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
            </form>
          </div>
        )}

        {message && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', background: message.includes('OTP sent') ? 'rgba(75, 107, 50, 0.05)' : 'rgba(239, 68, 68, 0.05)', color: message.includes('OTP sent') ? 'var(--ios-olive)' : '#ef4444', fontSize: '0.85rem', fontWeight: '600' }}>
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

