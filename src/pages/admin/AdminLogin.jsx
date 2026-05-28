import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldAlert, CheckCircle } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [showForgotForm, setShowForgotForm] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    // Default Super Admin credential
    if (cleanEmail === 'veernxt.esm@gmail.com' && password === 'veernxtadmin2026') {
      const sessionData = {
        email: 'veernxt.esm@gmail.com',
        name: 'Vivek Talwar',
        role: 'Super Admin',
        permissions: ['all']
      };
      localStorage.setItem('admin_session', JSON.stringify(sessionData));
      
      // Ensure local admin registry is initialized in localStorage
      const existingAdmins = localStorage.getItem('admin_registry');
      if (!existingAdmins) {
        localStorage.setItem('admin_registry', JSON.stringify([sessionData]));
      }
      
      navigate('/admin');
      return;
    }

    // Check against dynamically added admins in local storage registry
    const registry = JSON.parse(localStorage.getItem('admin_registry') || '[]');
    const matchedAdmin = registry.find(a => a.email.toLowerCase() === cleanEmail && password === 'veernxtadmin2026'); // simplified password for test
    
    if (matchedAdmin) {
      localStorage.setItem('admin_session', JSON.stringify(matchedAdmin));
      navigate('/admin');
    } else {
      setError('Invalid admin credentials. Please use Super Admin login or registered admin credentials.');
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
    setTimeout(() => {
      setForgotSent(false);
      setShowForgotForm(false);
      setForgotEmail('');
    }, 4000);
  };

  return (
    <div className="admin-login-container">
      <div className="login-card">
        <div className="logo-section">
          <img src="/logo.png" alt="VeerNXT Logo" className="logo-img" />
          <h1>VeerNXT</h1>
          <span className="badge">Content Factory CMS</span>
        </div>

        {!showForgotForm ? (
          <form onSubmit={handleLogin} className="login-form">
            <p className="subtitle">Secure portal access for platform administrators.</p>
            
            <div className="input-group">
              <label>Administrator Email</label>
              <div className="input-field">
                <Mail size={18} className="input-icon" />
                <input 
                  type="email" 
                  placeholder="name@veernxt.in" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <div className="label-row">
                <label>Security Password</label>
                <button type="button" onClick={() => setShowForgotForm(true)} className="forgot-link">Forgot?</button>
              </div>
              <div className="input-field">
                <Lock size={18} className="input-icon" />
                <input 
                  type="password" 
                  placeholder="••••••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="error-message">
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary">Access Control Panel</button>
            
            <div className="info-box">
              <strong>Super Admin Login:</strong><br />
              Email: <code>veernxt.esm@gmail.com</code><br />
              Password: <code>veernxtadmin2026</code>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit} className="login-form animate-fade-in">
            <h3>Reset Security Access</h3>
            <p className="subtitle">Enter your registered email. We will generate and send a password reset verification link.</p>

            <div className="input-group">
              <label>Registered Email</label>
              <div className="input-field">
                <Mail size={18} className="input-icon" />
                <input 
                  type="email" 
                  placeholder="veernxt.esm@gmail.com" 
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {forgotSent ? (
              <div className="success-message">
                <CheckCircle size={16} />
                <span>Reset token dispatched to {forgotEmail}! Redirecting...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowForgotForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" style={{ margin: 0 }}>Send Link</button>
              </div>
            )}
          </form>
        )}
      </div>

      <style>{`
        .admin-login-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1F3A2E 100%);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          padding: 1.5rem;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          padding: 3rem 2.5rem;
          border-radius: 28px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(31, 58, 46, 0.15);
          width: 100%;
          max-width: 440px;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .logo-section {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-img {
          width: 64px;
          height: 64px;
          object-fit: contain;
          margin-bottom: 0.75rem;
          filter: drop-shadow(0 4px 8px rgba(31, 58, 46, 0.2));
          border-radius: 12px;
        }

        .logo-section h1 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.03em;
        }

        .badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 800;
          color: #1F3A2E;
          background: #eef2f0;
          padding: 0.25rem 0.75rem;
          border-radius: 100px;
          margin-top: 0.4rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .subtitle {
          color: #64748b;
          font-size: 0.85rem;
          line-height: 1.5;
          margin-bottom: 2rem;
          text-align: center;
        }

        .login-form h3 {
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
          text-align: center;
          margin: 0 0 0.5rem 0;
        }

        .input-group {
          margin-bottom: 1.25rem;
          text-align: left;
        }

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .input-group label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          margin-bottom: 0.5rem;
          display: block;
        }

        .forgot-link {
          background: none;
          border: none;
          color: #1F3A2E;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .input-field {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: #94a3b8;
        }

        .input-field input {
          width: 100%;
          padding: 0.85rem 1rem 0.85rem 2.8rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
          background: #f8fafc;
        }

        .input-field input:focus {
          border-color: #1F3A2E;
          background: white;
          box-shadow: 0 0 0 4px rgba(31, 58, 46, 0.08);
        }

        .error-message, .success-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          line-height: 1.4;
        }

        .error-message {
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fee2e2;
        }

        .success-message {
          background: #ecfdf5;
          color: #10b981;
          border: 1px solid #d1fae5;
          margin-top: 1.5rem;
        }

        .btn-primary {
          width: 100%;
          padding: 0.95rem;
          background: #1f2937;
          background: linear-gradient(135deg, #1F3A2E 0%, #111111 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(31, 58, 46, 0.2);
          margin-top: 0.5rem;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(31, 58, 46, 0.3);
        }

        .btn-secondary {
          flex: 1;
          padding: 0.95rem;
          background: white;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #f8fafc;
        }

        .info-box {
          margin-top: 2rem;
          background: #f8fafc;
          border: 1px dashed #e2e8f0;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
          color: #64748b;
          text-align: left;
          line-height: 1.6;
        }

        .info-box code {
          color: #1F3A2E;
          font-weight: bold;
          font-family: monospace;
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;
