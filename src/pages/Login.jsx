import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Mail, Phone as PhoneIcon, ArrowLeft, Briefcase, User, Eye, EyeOff, Lock, UserPlus, KeyRound } from 'lucide-react';

/**
 * Login Page — Production Auth Flow
 * 
 * Candidates:
 *   - Register: Phone → OTP → Set Password → Profiling
 *   - Login: Phone/Email + Password → Dashboard
 *   - Forgot Password: Phone → OTP → Reset Password → Login
 * 
 * Employers:
 *   - Email + Password → Find Candidates
 */

const Login = () => {
  const [role, setRole] = useState('candidate');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot'
  
  // Shared
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [registerToken, setRegisterToken] = useState('');
  const [isDevMode, setIsDevMode] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [step, setStep] = useState('input'); // 'input' | 'otp' | 'set-password'

  useEffect(() => {
    let timer;
    if (step === 'otp' && resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [step, resendCooldown]);

  const handleResendOTP = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (resendCooldown > 0 || loading) return;
    await handleSendOTP();
  };

  const sanitizePhoneNumber = (val) => {
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length > 10) {
      digits = digits.slice(2);
    }
    return digits.slice(0, 10);
  };
  
  // Employer
  const [employerEmail, setEmployerEmail] = useState('');
  const [employerPassword, setEmployerPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'info' });
  const [verifiedMobile, setVerifiedMobile] = useState('');

  const navigate = useNavigate();

  const showMsg = (text, type = 'info') => setMessage({ text, type });
  const clearMsg = () => setMessage({ text: '', type: 'info' });

  // ═══════════════════════════════════════════
  // CANDIDATE: REGISTER FLOW
  // ═══════════════════════════════════════════
  const handleSendOTP = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!phone || phone.length < 10) {
      showMsg('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    setLoading(true);
    clearMsg();

    try {
      const purpose = authMode === 'forgot' ? 'reset' : 'register';
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phone, purpose }),
      });
      const data = await res.json();

      if (data.ok) {
        setStep('otp');
        setIsDevMode(!!data.devMode);
        setOtpToken(data.otpToken || '');
        setResendCooldown(30);
        showMsg(data.devMode
          ? 'DEV MODE: Use code 123456 to verify.'
          : `OTP sent to +91 ${phone}. Check your messages.`, 'success');
      } else {
        showMsg(data.error || 'Failed to send OTP.', 'error');
      }
    } catch (err) {
      showMsg('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setLoading(true);
    clearMsg();

    try {
      const purpose = authMode === 'forgot' ? 'reset' : 'register';
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phone, otp, purpose, otpToken }),
      });
      const data = await res.json();

      if (data.ok && data.verified) {
        setVerifiedMobile(data.mobile);
        if (authMode === 'forgot' && data.resetToken) {
          setResetToken(data.resetToken);
        }
        if (authMode === 'register' && data.registerToken) {
          setRegisterToken(data.registerToken);
        }
        setStep('set-password');
        showMsg(authMode === 'forgot'
          ? 'OTP verified! Set your new password below.'
          : 'Mobile verified! Create your account password.', 'success');
      } else {
        showMsg(data.error || 'Invalid OTP. Please try again.', 'error');
      }
    } catch (err) {
      showMsg('Network error verifying OTP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      showMsg('Password must be at least 6 characters.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showMsg('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    clearMsg();

    try {
      if (authMode === 'register') {
        // Call backend registration API instead of direct client-side signUp
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile: verifiedMobile,
            password: password,
            registerToken: registerToken,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          showMsg(data.error || 'Failed to create account.', 'error');
        } else {
          showMsg('Account created! Auto-logging you in...', 'success');
          
          // Auto-login after successful registration
          const syntheticEmail = `${verifiedMobile}@veernxt.in`;
          await supabase.auth.signInWithPassword({
            email: syntheticEmail,
            password: password,
          });

          setTimeout(() => navigate('/profiling'), 1000);
        }
      } else if (authMode === 'forgot') {
        // Reset password via secure backend API
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            mobile: verifiedMobile, 
            newPassword: password,
            resetToken: resetToken 
          }),
        });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          showMsg(data.error || 'Could not reset password. Please contact support.', 'error');
        } else {
          showMsg('Password reset successful! Logging you in...', 'success');
          
          // Auto-login after successful reset
          const syntheticEmail = `${verifiedMobile}@veernxt.in`;
          await supabase.auth.signInWithPassword({
            email: syntheticEmail,
            password: password,
          });
          
          setTimeout(() => navigate('/dashboard'), 1000);
        }
      }
    } catch (err) {
      showMsg('Error creating account. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════
  // CANDIDATE: LOGIN FLOW (phone/email + password)
  // ═══════════════════════════════════════════
  const handleCandidateLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMsg();

    try {
      // If user entered a phone number, convert to synthetic email
      let loginEmail = email;
      if (!loginEmail && phone) {
        const cleanPhone = phone.replace(/[\s\-+]/g, '');
        const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
        loginEmail = `${fullPhone}@veernxt.in`;
      }

      if (!loginEmail) {
        showMsg('Please enter your phone number or email.', 'error');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (error) {
        if (error.message?.includes('Invalid login')) {
          showMsg('Invalid credentials. Check your phone/email and password.', 'error');
        } else {
          showMsg(error.message, 'error');
        }
      } else {
        // Check if profiling is done
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('profiling_completed')
          .eq('id', data.user.id)
          .single();

        if (profile?.profiling_completed) {
          navigate('/dashboard');
        } else {
          navigate('/profiling');
        }
      }
    } catch (err) {
      showMsg('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════
  // EMPLOYER: LOGIN FLOW
  // ═══════════════════════════════════════════
  const handleEmployerLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMsg();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: employerEmail,
        password: employerPassword,
      });

      if (error) {
        showMsg('Invalid employer credentials.', 'error');
      } else {
        const employerSession = {
          email: employerEmail,
          name: employerEmail.split('@')[0].toUpperCase() + ' CORP',
          role: 'Employer Partner',
        };
        localStorage.setItem('employer_session', JSON.stringify(employerSession));
        navigate('/find-candidates');
      }
    } catch (err) {
      showMsg('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep('input');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setVerifiedMobile('');
    setIsDevMode(false);
    setRegisterToken('');
    setOtpToken('');
    setResendCooldown(0);
    clearMsg();
  };

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  const inputStyle = {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: 'white',
    color: '#0f172a',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: '0.75rem',
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: '0.5rem',
    display: 'block',
    letterSpacing: '0.05em',
  };

  const renderCandidateContent = () => {
    // ── REGISTER / FORGOT PASSWORD — OTP STEP ──
    if ((authMode === 'register' || authMode === 'forgot') && step === 'otp') {
      return (
        <div className="animate-fade-in">
          <button onClick={resetFlow} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', marginBottom: '1.5rem', padding: '0.5rem 0', fontWeight: '600' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={labelStyle}>Enter 6-Digit OTP</label>
              <input type="text" placeholder="------" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center' }}
              />
              {isDevMode && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <span style={{ fontWeight: '600', color: 'var(--ios-olive)' }}>TEST MODE ACTIVE:</span> Please enter <strong style={{ letterSpacing: '1px' }}>123456</strong>
                </div>
              )}
            </div>
            <button type="submit" className="btn-primary ios-pill" disabled={loading || otp.length !== 6}
              style={{ padding: '0.9rem', fontSize: '0.95rem', background: 'var(--ios-olive)' }}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
              <button 
                type="button" 
                onClick={handleResendOTP} 
                disabled={resendCooldown > 0 || loading}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: resendCooldown > 0 ? '#94a3b8' : 'var(--ios-olive)', 
                  fontWeight: '700', 
                  fontSize: '0.85rem', 
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  padding: '0.25rem 0.5rem',
                  outline: 'none'
                }}
              >
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        </div>
      );
    }

    // ── REGISTER / FORGOT PASSWORD — SET PASSWORD STEP ──
    if ((authMode === 'register' || authMode === 'forgot') && step === 'set-password') {
      return (
        <div className="animate-fade-in">
          <button onClick={resetFlow} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', marginBottom: '1.5rem', padding: '0.5rem 0', fontWeight: '600' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ background: 'rgba(75, 107, 50, 0.06)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--ios-olive)', fontWeight: 600 }}>
            ✓ Mobile +91 {phone} verified
          </div>
          <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
            <div>
              <label style={labelStyle}>{authMode === 'forgot' ? 'New Password' : 'Create Password'}</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  style={{ ...inputStyle, paddingRight: '3rem' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input type="password" placeholder="Re-enter password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                style={inputStyle}
              />
            </div>
            <button type="submit" className="btn-primary ios-pill" disabled={loading}
              style={{ padding: '0.9rem', fontSize: '0.95rem', background: 'var(--ios-olive)' }}>
              {loading ? 'Processing...' : (authMode === 'forgot' ? 'Reset Password' : 'Create Account & Continue')}
            </button>
          </form>
        </div>
      );
    }

    // ── REGISTER — PHONE INPUT ──
    if (authMode === 'register') {
      return (
        <div className="animate-fade-in">
          <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={labelStyle}>Mobile Number</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ padding: '0.85rem 0.75rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}>+91</div>
                <input type="tel" placeholder="e.g. 9876543210" value={phone}
                  onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value))} required
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary ios-pill" disabled={loading}
              style={{ padding: '0.9rem', fontSize: '0.95rem', background: 'var(--ios-olive)' }}>
              {loading ? 'Sending OTP...' : 'Verify Mobile & Register'}
            </button>
          </form>
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Already have an account? </span>
            <button onClick={() => { setAuthMode('login'); resetFlow(); }}
              style={{ background: 'none', border: 'none', color: 'var(--ios-olive)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              Login
            </button>
          </div>
        </div>
      );
    }

    // ── FORGOT PASSWORD — PHONE INPUT ──
    if (authMode === 'forgot') {
      return (
        <div className="animate-fade-in">
          <button onClick={() => { setAuthMode('login'); resetFlow(); }}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', marginBottom: '1.5rem', padding: '0.5rem 0', fontWeight: '600' }}>
            <ArrowLeft size={16} /> Back to login
          </button>
          <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={labelStyle}>Registered Mobile Number</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ padding: '0.85rem 0.75rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}>+91</div>
                <input type="tel" placeholder="e.g. 9876543210" value={phone}
                  onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value))} required
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary ios-pill" disabled={loading}
              style={{ padding: '0.9rem', fontSize: '0.95rem', background: 'var(--ios-olive)' }}>
              {loading ? 'Sending OTP...' : 'Send Reset OTP'}
            </button>
          </form>
        </div>
      );
    }

    // ── LOGIN — DEFAULT ──
    return (
      <div className="animate-fade-in">
        <form onSubmit={handleCandidateLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
          <div>
            <label style={labelStyle}>Mobile Number or Email</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ padding: '0.85rem 0.75rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}>+91</div>
              <input type="text" placeholder="Phone or email" value={phone || email}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes('@')) { setEmail(val); setPhone(''); }
                  else { setPhone(sanitizePhoneNumber(val)); setEmail(''); }
                }}
                required style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} required
                style={{ ...inputStyle, paddingRight: '3rem' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-primary ios-pill" disabled={loading}
            style={{ padding: '0.9rem', fontSize: '0.95rem', background: 'var(--ios-olive)' }}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => { setAuthMode('forgot'); resetFlow(); }}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
            <KeyRound size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Forgot password?
          </button>
          <button onClick={() => { setAuthMode('register'); resetFlow(); }}
            style={{ background: 'none', border: 'none', color: 'var(--ios-olive)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700 }}>
            <UserPlus size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Create account
          </button>
        </div>
      </div>
    );
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
      fontFamily: "'Inter', sans-serif",
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
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.3)',
      }}>

        {/* Brand Header */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <img src="/logo.png" alt="VeerNXT" style={{ width: '74px', height: '74px', objectFit: 'contain', borderRadius: '12px' }} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>VeerNXT Access</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>National portal for corporate transitioning & hiring</p>

        {/* Role Selector Tabs (Hidden for now) */}
        <div style={{ display: 'none', background: '#f1f5f9', borderRadius: '14px', padding: '0.3rem', marginBottom: '2rem' }}>
          <button type="button"
            onClick={() => { setRole('candidate'); setAuthMode('login'); resetFlow(); }}
            style={{
              flex: 1, padding: '0.85rem 0.5rem', borderRadius: '11px', border: 'none',
              background: role === 'candidate' ? 'white' : 'transparent',
              color: role === 'candidate' ? 'var(--ios-olive)' : '#64748b',
              boxShadow: role === 'candidate' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
              fontWeight: '700', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}>
            <User size={16} /> CANDIDATES
          </button>
          <button type="button"
            onClick={() => { setRole('employer'); resetFlow(); }}
            style={{
              flex: 1, padding: '0.85rem 0.5rem', borderRadius: '11px', border: 'none',
              background: role === 'employer' ? 'white' : 'transparent',
              color: role === 'employer' ? 'var(--ios-olive)' : '#64748b',
              boxShadow: role === 'employer' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
              fontWeight: '700', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}>
            <Briefcase size={16} /> EMPLOYERS
          </button>
        </div>

        {/* Auth Content */}
        {role === 'candidate' ? renderCandidateContent() : (
          /* ═══ EMPLOYER FLOW ═══ */
          <form onSubmit={handleEmployerLogin} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
            <div>
              <label style={labelStyle}>Recruiter / Corporate Email</label>
              <input type="email" placeholder="e.g. recruiting@tata.com"
                value={employerEmail} onChange={(e) => setEmployerEmail(e.target.value)} required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Security Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  value={employerPassword} onChange={(e) => setEmployerPassword(e.target.value)} required
                  style={{ ...inputStyle, paddingRight: '3rem' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: 0 }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary ios-pill" disabled={loading}
              style={{ padding: '0.9rem', fontSize: '0.95rem', background: 'var(--ios-olive)', cursor: 'pointer', width: '100%', marginTop: '0.5rem' }}>
              {loading ? 'Authenticating...' : 'Access Recruiting Panel'}
            </button>
          </form>
        )}

        {/* Message Display */}
        {message.text && (
          <div style={{
            marginTop: '1.5rem',
            padding: '0.85rem',
            borderRadius: '12px',
            background: message.type === 'success' ? 'rgba(75, 107, 50, 0.06)' : 'rgba(239, 68, 68, 0.06)',
            color: message.type === 'success' ? 'var(--ios-olive)' : '#ef4444',
            fontSize: '0.85rem',
            fontWeight: '600',
          }}>
            {message.text}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#94a3b8' }}>
          <ShieldCheck size={16} />
          <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>End-to-end encrypted session</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
