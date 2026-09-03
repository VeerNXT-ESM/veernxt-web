import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Mail, Phone as PhoneIcon, ArrowLeft, Briefcase, User, Eye, EyeOff, Lock, UserPlus, KeyRound } from 'lucide-react';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';

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
  const [employerPhone, setEmployerPhone] = useState('');
  const [employerPassword, setEmployerPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'info' });
  const [verifiedMobile, setVerifiedMobile] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

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
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', mobile: phone, purpose }),
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
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', mobile: phone, otp, purpose, otpToken }),
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
            role: role,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          showMsg(data.error || 'Failed to create account.', 'error');
        } else {
          showMsg('Account created! Auto-logging you in...', 'success');

          // Auto-login after successful registration. Must match the same
          // role-suffixed format api/auth/register.js just created the
          // account under (see that file for why candidate vs employer
          // need distinct synthetic emails for the same phone number).
          const syntheticEmail = role === 'employer' ? `${verifiedMobile}+employer@veernxt.in` : `${verifiedMobile}@veernxt.in`;
          await supabase.auth.signInWithPassword({
            email: syntheticEmail,
            password: password,
          });

          if (role === 'employer') {
            const employerSession = {
              email: syntheticEmail,
              name: 'NEW CORPORATE',
              role: 'Employer Partner',
            };
            localStorage.setItem('employer_session', JSON.stringify(employerSession));
            setTimeout(() => navigate('/dashboard'), 1000);
          } else {
            setTimeout(() => navigate('/profiling'), 1000);
          }
        }
      } else if (authMode === 'forgot') {
        // Reset password via secure backend API
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile: verifiedMobile,
            newPassword: password,
            resetToken: resetToken,
            role: role,
          }),
        });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          showMsg(data.error || 'Could not reset password. Please contact support.', 'error');
        } else {
          showMsg('Password reset successful! Logging you in...', 'success');

          // Auto-login after successful reset -- same role-suffixed format
          // api/auth/reset-password.js just looked the account up under.
          const syntheticEmail = role === 'employer' ? `${verifiedMobile}+employer@veernxt.in` : `${verifiedMobile}@veernxt.in`;
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
    localStorage.removeItem('employer_session');

    try {
      // If user entered a phone number, convert to synthetic email
      let loginEmail = email;
      if (!loginEmail && phone) {
        const cleanPhone = phone.replace(/[\s\-+]/g, '');
        const fullPhone = (cleanPhone.length === 10) 
          ? `91${cleanPhone}` 
          : (cleanPhone.startsWith('91') && cleanPhone.length === 12 ? cleanPhone : `91${cleanPhone}`);
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
          // Honor the page AuthGuard originally redirected from (e.g. a
          // deep link to /learning-center) instead of always landing on
          // /dashboard — AuthGuard already sets this via `state: { from }`.
          const from = location.state?.from;
          const redirectPath = from ? `${from.pathname}${from.search || ''}` : '/dashboard';
          navigate(redirectPath);
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
  const handleEmployerLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMsg();

    try {
      let loginEmail = employerEmail;
      if (!loginEmail && employerPhone) {
        const cleanPhone = employerPhone.replace(/[\s\-+]/g, '');
        const fullPhone = (cleanPhone.length === 10)
          ? `91${cleanPhone}`
          : (cleanPhone.startsWith('91') && cleanPhone.length === 12 ? cleanPhone : `91${cleanPhone}`);
        // Employer accounts registered by phone use the +employer-suffixed
        // synthetic email (see api/auth/register.js) so the same phone
        // number can also have a separate candidate account.
        loginEmail = `${fullPhone}+employer@veernxt.in`;
      }

      if (!loginEmail) {
        showMsg('Please enter your recruiter phone number or email.', 'error');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: employerPassword,
      });

      if (error) {
        showMsg('Invalid employer credentials.', 'error');
      } else {
        const employerSession = {
          email: loginEmail,
          name: loginEmail.includes('@veernxt.in') 
            ? `RECRUITER (+91 ${employerPhone || loginEmail.split('@')[0].slice(2)})` 
            : loginEmail.split('@')[0].toUpperCase() + ' CORP',
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
    setEmployerEmail('');
    setEmployerPhone('');
    clearMsg();
  };

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  // Slate-600 — meets the 3:1 non-text (border) contrast minimum against
  // white, unlike the lighter slate-300 this page used before.
  const borderColor = '#64748b';

  const inputStyle = {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: 'var(--radius-sm)',
    // Indirected through a custom property (rather than a literal color)
    // so the .vx-field:focus rule below can actually override it — a
    // plain `border` in an inline style outranks any class selector, focus
    // state or not, so a stylesheet rule alone could never win here.
    border: `1px solid var(--vx-border, ${borderColor})`,
    background: 'white',
    color: '#0f172a',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '1rem',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '0.4rem',
    display: 'block',
  };

  const renderCandidateContent = () => {
    // ── REGISTER / FORGOT PASSWORD — OTP STEP ──
    if ((authMode === 'register' || authMode === 'forgot') && step === 'otp') {
      return (
        <div className="animate-fade-in">
          <Button type="button" variant="ghost" size="sm" icon={ArrowLeft} onClick={resetFlow} style={{ padding: '0.5rem 0.25rem', marginBottom: '1.5rem' }}>
            Back
          </Button>
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={labelStyle} htmlFor="cand-otp">Enter 6-digit code</label>
              <input id="cand-otp" className="vx-field" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="------" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center' }}
              />
              {isDevMode && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#475569', textAlign: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: `1px dashed ${borderColor}` }}>
                  <span style={{ fontWeight: '700', color: 'var(--ios-olive)' }}>TEST MODE:</span> enter <strong style={{ letterSpacing: '1px' }}>123456</strong>
                </div>
              )}
            </div>
            <Button type="submit" fullWidth size="lg" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying…' : 'Verify code'}
            </Button>
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                className="vx-link"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? '#94a3b8' : 'var(--ios-olive)',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  padding: '0.6rem 0.75rem',
                  minHeight: '44px',
                }}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
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
          <Button type="button" variant="ghost" size="sm" icon={ArrowLeft} onClick={resetFlow} style={{ padding: '0.5rem 0.25rem', marginBottom: '1.5rem' }}>
            Back
          </Button>
          <div role="status" style={{ background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--ios-olive)', fontWeight: 600, textAlign: 'left' }}>
            ✓ Mobile +91 {phone} verified
          </div>
          <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
            <div>
              <label style={labelStyle} htmlFor="cand-new-password">{authMode === 'forgot' ? 'New password' : 'Create password'}</label>
              <div style={{ position: 'relative' }}>
                <input id="cand-new-password" className="vx-field" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Minimum 6 characters"
                  value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  style={{ ...inputStyle, paddingRight: '3.25rem' }}
                />
                <button type="button" className="vx-icon-btn" onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                  style={{ position: 'absolute', right: '0.15rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle} htmlFor="cand-confirm-password">Confirm password</label>
              <input id="cand-confirm-password" className="vx-field" type="password" autoComplete="new-password" placeholder="Re-enter password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6}
                style={inputStyle}
              />
            </div>
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? 'Processing…' : (authMode === 'forgot' ? 'Reset password' : 'Create account & continue')}
            </Button>
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
              <label style={labelStyle} htmlFor="cand-reg-mobile">Mobile number</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div aria-hidden="true" style={{ padding: '0.85rem 0.75rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${borderColor}`, background: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>+91</div>
                <input id="cand-reg-mobile" className="vx-field" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="e.g. 9876543210" value={phone}
                  onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value))} required
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? 'Sending code…' : 'Verify mobile & register'}
            </Button>
          </form>
          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.9rem', color: '#475569' }}>
            Already have an account?{' '}
            <button className="vx-link" onClick={() => { setAuthMode('login'); resetFlow(); }}
              style={{ background: 'none', border: 'none', color: 'var(--ios-olive)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem', textDecoration: 'underline' }}>
              Log in
            </button>
          </div>
        </div>
      );
    }

    // ── FORGOT PASSWORD — PHONE INPUT ──
    if (authMode === 'forgot') {
      return (
        <div className="animate-fade-in">
          <Button type="button" variant="ghost" size="sm" icon={ArrowLeft} onClick={() => { setAuthMode('login'); resetFlow(); }} style={{ padding: '0.5rem 0.25rem', marginBottom: '1.5rem' }}>
            Back to login
          </Button>
          <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={labelStyle} htmlFor="cand-forgot-mobile">Registered mobile number</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div aria-hidden="true" style={{ padding: '0.85rem 0.75rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${borderColor}`, background: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>+91</div>
                <input id="cand-forgot-mobile" className="vx-field" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="e.g. 9876543210" value={phone}
                  onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value))} required
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? 'Sending code…' : 'Send reset code'}
            </Button>
          </form>
        </div>
      );
    }

    // ── LOGIN — DEFAULT ──
    return (
      <div className="animate-fade-in">
        <form onSubmit={handleCandidateLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
          <div>
            <label style={labelStyle} htmlFor="cand-login-id">Mobile number or email</label>
            <input id="cand-login-id" className="vx-field" type="text" inputMode="email" autoComplete="username" placeholder="9876543210 or you@email.com" value={phone || email}
              onChange={(e) => {
                const val = e.target.value;
                if (val.includes('@')) { setEmail(val); setPhone(''); }
                else { setPhone(sanitizePhoneNumber(val)); setEmail(''); }
              }}
              required style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="cand-login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input id="cand-login-password" className="vx-field" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password"
                value={password} onChange={(e) => setPassword(e.target.value)} required
                style={{ ...inputStyle, paddingRight: '3.25rem' }}
              />
              <button type="button" className="vx-icon-btn" onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                style={{ position: 'absolute', right: '0.15rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>
          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </Button>
        </form>

        <Button type="button" variant="secondary" fullWidth size="md" icon={UserPlus}
          onClick={() => { setAuthMode('register'); resetFlow(); }} style={{ marginTop: '0.85rem' }}>
          Create account
        </Button>

        <div style={{ textAlign: 'center', marginTop: '0.85rem' }}>
          <button className="vx-link" onClick={() => { setAuthMode('forgot'); resetFlow(); }}
            style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', padding: '0.6rem 0.75rem', minHeight: '44px', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <KeyRound size={14} />
            Forgot password?
          </button>
        </div>
      </div>
    );
  };

  const renderEmployerContent = () => {
    // ── REGISTER / FORGOT PASSWORD — OTP STEP ──
    if ((authMode === 'register' || authMode === 'forgot') && step === 'otp') {
      return (
        <div className="animate-fade-in">
          <Button type="button" variant="ghost" size="sm" icon={ArrowLeft} onClick={resetFlow} style={{ padding: '0.5rem 0.25rem', marginBottom: '1.5rem' }}>
            Back
          </Button>
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={labelStyle} htmlFor="emp-otp">Enter 6-digit code</label>
              <input id="emp-otp" className="vx-field" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="------" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center' }}
              />
              {isDevMode && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#475569', textAlign: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: `1px dashed ${borderColor}` }}>
                  <span style={{ fontWeight: '700', color: 'var(--ios-olive)' }}>TEST MODE:</span> enter <strong style={{ letterSpacing: '1px' }}>123456</strong>
                </div>
              )}
            </div>
            <Button type="submit" fullWidth size="lg" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying…' : 'Verify code'}
            </Button>
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                className="vx-link"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? '#94a3b8' : 'var(--ios-olive)',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  padding: '0.6rem 0.75rem',
                  minHeight: '44px',
                }}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
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
          <Button type="button" variant="ghost" size="sm" icon={ArrowLeft} onClick={resetFlow} style={{ padding: '0.5rem 0.25rem', marginBottom: '1.5rem' }}>
            Back
          </Button>
          <div role="status" style={{ background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--ios-olive)', fontWeight: 600, textAlign: 'left' }}>
            ✓ Mobile +91 {phone} verified
          </div>
          <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
            <div>
              <label style={labelStyle} htmlFor="emp-new-password">{authMode === 'forgot' ? 'New password' : 'Create recruiter password'}</label>
              <div style={{ position: 'relative' }}>
                <input id="emp-new-password" className="vx-field" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Minimum 6 characters"
                  value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  style={{ ...inputStyle, paddingRight: '3.25rem' }}
                />
                <button type="button" className="vx-icon-btn" onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                  style={{ position: 'absolute', right: '0.15rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle} htmlFor="emp-confirm-password">Confirm password</label>
              <input id="emp-confirm-password" className="vx-field" type="password" autoComplete="new-password" placeholder="Re-enter password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6}
                style={inputStyle}
              />
            </div>
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? 'Processing…' : (authMode === 'forgot' ? 'Reset password' : 'Create recruiter account')}
            </Button>
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
              <label style={labelStyle} htmlFor="emp-reg-mobile">Recruiter / corporate mobile</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div aria-hidden="true" style={{ padding: '0.85rem 0.75rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${borderColor}`, background: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>+91</div>
                <input id="emp-reg-mobile" className="vx-field" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="e.g. 9876543210" value={phone}
                  onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value))} required
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? 'Sending code…' : 'Verify mobile & register company'}
            </Button>
          </form>
          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.9rem', color: '#475569' }}>
            Already have a recruiter account?{' '}
            <button className="vx-link" onClick={() => { setAuthMode('login'); resetFlow(); }}
              style={{ background: 'none', border: 'none', color: 'var(--ios-olive)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem', textDecoration: 'underline' }}>
              Log in
            </button>
          </div>
        </div>
      );
    }

    // ── FORGOT PASSWORD — PHONE INPUT ──
    if (authMode === 'forgot') {
      return (
        <div className="animate-fade-in">
          <Button type="button" variant="ghost" size="sm" icon={ArrowLeft} onClick={() => { setAuthMode('login'); resetFlow(); }} style={{ padding: '0.5rem 0.25rem', marginBottom: '1.5rem' }}>
            Back to login
          </Button>
          <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={labelStyle} htmlFor="emp-forgot-mobile">Registered recruiter mobile number</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div aria-hidden="true" style={{ padding: '0.85rem 0.75rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${borderColor}`, background: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>+91</div>
                <input id="emp-forgot-mobile" className="vx-field" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="e.g. 9876543210" value={phone}
                  onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value))} required
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? 'Sending code…' : 'Send reset code'}
            </Button>
          </form>
        </div>
      );
    }

    // ── LOGIN — DEFAULT ──
    return (
      <div className="animate-fade-in">
        <form onSubmit={handleEmployerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
          <div>
            <label style={labelStyle} htmlFor="emp-login-id">Recruiter mobile number or email</label>
            <input id="emp-login-id" className="vx-field" type="text" inputMode="email" autoComplete="username" placeholder="9876543210 or you@company.com" value={employerPhone || employerEmail}
              onChange={(e) => {
                const val = e.target.value;
                if (val.includes('@')) {
                  setEmployerEmail(val);
                  setEmployerPhone('');
                } else {
                  setEmployerPhone(sanitizePhoneNumber(val));
                  setEmployerEmail('');
                }
              }}
              required style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="emp-login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input id="emp-login-password" className="vx-field" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password"
                value={employerPassword} onChange={(e) => setEmployerPassword(e.target.value)} required
                style={{ ...inputStyle, paddingRight: '3.25rem' }}
              />
              <button type="button" className="vx-icon-btn" onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                style={{ position: 'absolute', right: '0.15rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>
          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? 'Authenticating…' : 'Access recruiting panel'}
          </Button>
        </form>

        <Button type="button" variant="secondary" fullWidth size="md" icon={UserPlus}
          onClick={() => { setAuthMode('register'); resetFlow(); }} style={{ marginTop: '0.85rem' }}>
          Register corporate account
        </Button>

        <div style={{ textAlign: 'center', marginTop: '0.85rem' }}>
          <button className="vx-link" onClick={() => { setAuthMode('forgot'); resetFlow(); }}
            style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', padding: '0.6rem 0.75rem', minHeight: '44px', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <KeyRound size={14} />
            Forgot password?
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
      padding: '1.5rem',
      background: '#1F3A2E',
    }}>
      <div className="login-modal-card" style={{
        padding: '2rem 1.5rem',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-2)',
      }}>

        {/* Brand Header */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
          <img src="/logo.png" alt="VeerNXT" style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
        </div>

        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem', letterSpacing: '-0.01em' }}>VeerNXT Access</h1>
        <p style={{ color: '#475569', marginBottom: '1.5rem', fontSize: '0.9rem' }}>National employment portal for veteran transitioning &amp; hiring</p>

        {/* Role Selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Tabs
            fullWidth
            variant="filled"
            value={role}
            onChange={(val) => {
              if (val === 'candidate') {
                setRole('candidate');
                setAuthMode('login');
                resetFlow();
                localStorage.removeItem('employer_session');
              } else {
                setRole('employer');
                resetFlow();
              }
            }}
            options={[
              { value: 'candidate', label: 'Candidates', icon: User },
              { value: 'employer', label: 'Employers', icon: Briefcase },
            ]}
          />
        </div>

        {/* Auth Content */}
        {role === 'candidate' ? renderCandidateContent() : renderEmployerContent()}

        {/* Message Display */}
        {message.text && (
          <div role="alert" aria-live="assertive" style={{
            marginTop: '1.5rem',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${message.type === 'success' ? 'var(--ios-olive)' : 'var(--danger)'}`,
            background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: message.type === 'success' ? 'var(--ios-olive)' : 'var(--danger)',
            fontSize: '0.9rem',
            fontWeight: '600',
            textAlign: 'left',
          }}>
            {message.text}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#475569' }}>
          <ShieldCheck size={15} aria-hidden="true" />
          <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Secure connection</span>
        </div>
      </div>

      <style>{`
        .vx-field {
          font-size: 16px;
        }
        .vx-field:hover:not(:focus) {
          --vx-border: #334155;
        }
        .vx-field:focus {
          outline: none;
          --vx-border: var(--ios-olive);
          box-shadow: 0 0 0 3px rgba(75, 107, 50, 0.2);
        }
        .vx-icon-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
        }
        .vx-icon-btn:hover {
          background: #f1f5f9;
        }
        .vx-icon-btn:focus-visible,
        .vx-link:focus-visible,
        button:focus-visible {
          outline: 2px solid var(--ios-olive);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default Login;
