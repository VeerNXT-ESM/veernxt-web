import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Mail, Phone as PhoneIcon, ArrowLeft, Briefcase, User, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [role, setRole] = useState('candidate'); // 'candidate' | 'employer'
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' | 'email'
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  
  // Candidate form inputs
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  // Employer form inputs
  const [employerEmail, setEmployerEmail] = useState('');
  const [employerPassword, setEmployerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
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

    // Mock verify OTP - navigates candidates to the Profiling center first
    setTimeout(() => {
      navigate('/profiling');
      setLoading(false);
    }, 1500);
  };

  const handleEmployerLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Mock Employer Authentication
    setTimeout(() => {
      const cleanEmail = employerEmail.trim().toLowerCase();
      if (employerPassword.length >= 6) {
        // Pre-fill a session if desired, then go to Find Candidates directory
        const employerSession = {
          email: cleanEmail,
          name: cleanEmail.split('@')[0].toUpperCase() + ' CORP',
          role: 'Employer Partner'
        };
        localStorage.setItem('employer_session', JSON.stringify(employerSession));
        navigate('/find-candidates');
      } else {
        setMessage('Invalid password. Security credentials must be at least 6 characters.');
      }
      setLoading(false);
    }, 1200);
  };

  const resetFlow = () => {
    setStep('request');
    setOtp('');
    setMessage('');
  };

  return (
    <div className="login-splash-container" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      padding: '2rem 1.5rem', 
      backgroundImage: 'linear-gradient(135deg, rgba(31, 58, 46, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%), url("/hero/hero_image.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div className="login-modal-card ios-card animate-fade-in" style={{ 
        padding: '3rem 2.25rem', 
        maxWidth: '460px', 
        width: '100%', 
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        borderRadius: '24px',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.3)'
      }}>
        
        {/* Brand Header */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <img src="/logo.png" alt="VeerNXT" style={{ width: '74px', height: '74px', objectFit: 'contain', borderRadius: '12px' }} />
        </div>
        
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>VeerNXT Access</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>National portal for corporate transitioning & hiring</p>
        
        {/* Core Role Selector Tabs */}
        <div style={{ 
          display: 'flex', 
          background: '#f1f5f9', 
          borderRadius: '14px', 
          padding: '0.3rem', 
          marginBottom: '2rem' 
        }}>
          <button
            type="button"
            onClick={() => {
              setRole('candidate');
              resetFlow();
            }}
            style={{
              flex: 1,
              padding: '0.85rem 0.5rem',
              borderRadius: '11px',
              border: 'none',
              background: role === 'candidate' ? 'white' : 'transparent',
              color: role === 'candidate' ? 'var(--ios-olive)' : '#64748b',
              boxShadow: role === 'candidate' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
              fontWeight: '700',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <User size={16} /> CANDIDATES
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('employer');
              resetFlow();
            }}
            style={{
              flex: 1,
              padding: '0.85rem 0.5rem',
              borderRadius: '11px',
              border: 'none',
              background: role === 'employer' ? 'white' : 'transparent',
              color: role === 'employer' ? 'var(--ios-olive)' : '#64748b',
              boxShadow: role === 'employer' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
              fontWeight: '700',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Briefcase size={16} /> EMPLOYERS
          </button>
        </div>

        {/* Dynamic Authentication Content */}
        {role === 'candidate' ? (
          /* ================= CANDIDATE FLOW ================= */
          step === 'request' ? (
            <div className="animate-fade-in">
              {/* Toggle Phone / Email for Candidates */}
              <div style={{ display: 'flex', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.2rem', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setAuthMethod('phone')}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    borderRadius: '9px',
                    border: 'none',
                    background: authMethod === 'phone' ? 'white' : 'transparent',
                    color: authMethod === 'phone' ? 'var(--ios-olive)' : '#64748b',
                    boxShadow: authMethod === 'phone' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none',
                    fontWeight: authMethod === 'phone' ? '700' : '600',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <PhoneIcon size={14} /> Phone
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    borderRadius: '9px',
                    border: 'none',
                    background: authMethod === 'email' ? 'white' : 'transparent',
                    color: authMethod === 'email' ? 'var(--ios-olive)' : '#64748b',
                    boxShadow: authMethod === 'email' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none',
                    fontWeight: authMethod === 'email' ? '700' : '600',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Mail size={14} /> Email
                </button>
              </div>

              <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block', letterSpacing: '0.05em' }}>
                    {authMethod === 'phone' ? 'Agniveer Registered Mobile' : 'Agniveer Corporate Email'}
                  </label>
                  
                  {authMethod === 'phone' ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{
                        padding: '0.85rem 0.75rem',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontWeight: '700',
                        fontSize: '0.95rem',
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
                          padding: '0.85rem 1rem',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          background: 'white',
                          color: '#0f172a',
                          outline: 'none',
                          fontFamily: 'inherit',
                          fontSize: '0.95rem',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </div>
                  ) : (
                    <input
                      type="email"
                      placeholder="e.g. rahul.kumar@veernxt.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        background: 'white',
                        color: '#0f172a',
                        outline: 'none',
                        fontFamily: 'inherit',
                        fontSize: '0.95rem',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  )}
                </div>
                <button type="submit" className="btn-primary ios-pill" disabled={loading} style={{ padding: '0.9rem', fontSize: '0.95rem', background: 'var(--ios-olive)' }}>
                  {loading ? 'Dispatched OTP...' : 'Generate OTP'}
                </button>
              </form>

              <div style={{
                marginTop: '1.5rem',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                fontSize: '0.78rem',
                color: '#64748b',
                textAlign: 'left',
                lineHeight: '1.5'
              }}>
                <strong>Developer Credentials Info:</strong><br />
                Candidates are set up with instant developer bypass logs. Use any email/phone to receive custom local OTP codes automatically.
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <button 
                onClick={resetFlow}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer',
                  marginBottom: '1.5rem',
                  padding: '0.5rem 0',
                  fontWeight: '600'
                }}
              >
                <ArrowLeft size={16} /> Back to credential request
              </button>

              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block', letterSpacing: '0.05em' }}>Enter 6-Digit Agniveer OTP</label>
                  <input
                    type="text"
                    placeholder="------"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: 'white',
                      color: '#0f172a',
                      outline: 'none',
                      fontFamily: 'monospace',
                      fontSize: '1.5rem',
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </div>
                <button type="submit" className="btn-primary ios-pill" disabled={loading || otp.length !== 6} style={{ padding: '0.9rem', fontSize: '0.95rem', background: 'var(--ios-olive)' }}>
                  {loading ? 'Verifying profile...' : 'Confirm OTP & Proceed'}
                </button>
              </form>
            </div>
          )
        ) : (
          /* ================= EMPLOYER FLOW ================= */
          <form onSubmit={handleEmployerLogin} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block', letterSpacing: '0.05em' }}>
                Recruiter / Corporate Email
              </label>
              <input
                type="email"
                placeholder="e.g. recruiting@tata.com"
                value={employerEmail}
                onChange={(e) => setEmployerEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#0f172a',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block', letterSpacing: '0.05em' }}>
                Security Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={employerPassword}
                  onChange={(e) => setEmployerPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.85rem 3rem 0.85rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    color: '#0f172a',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary ios-pill" disabled={loading} style={{ padding: '0.9rem', fontSize: '0.95rem', background: 'var(--ios-olive)', cursor: 'pointer', width: '100%', marginTop: '0.5rem' }}>
              {loading ? 'Authenticating recruiter...' : 'Access Recruiting Panel'}
            </button>

            <div style={{
              marginTop: '1rem',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              fontSize: '0.78rem',
              color: '#64748b',
              lineHeight: '1.5'
            }}>
              <strong>Corporate Access Credentials:</strong><br />
              Recruiters are provided local sandbox access. Use any verified employer email and a passcode matching 6 or more characters to bypass checks.
            </div>
          </form>
        )}

        {message && (
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '0.85rem', 
            borderRadius: '12px', 
            background: message.includes('OTP sent') ? 'rgba(75, 107, 50, 0.06)' : 'rgba(239, 68, 68, 0.06)', 
            color: message.includes('OTP sent') ? 'var(--ios-olive)' : '#ef4444', 
            fontSize: '0.85rem', 
            fontWeight: '600' 
          }}>
            {message}
          </div>
        )}

        {/* Encrypted Session Footer */}
        <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#94a3b8' }}>
          <ShieldCheck size={16} />
          <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>End-to-end encrypted session</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
