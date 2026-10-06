import { useState } from 'react';
import { ShieldCheck, User, KeyRound, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

const FirstLoginModal = ({ session, onComplete }) => {
  const [name, setName] = useState(session?.name || '');
  const [currentPassword, setCurrentPassword] = useState('123456789');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setError('Please provide your full administrator name (minimum 2 characters).');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('Your new password must be at least 6 characters long.');
      return;
    }

    if (newPassword === '123456789' || newPassword === '1234556789') {
      setError('Your new password cannot be the temporary default password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
        },
        body: JSON.stringify({
          action: 'first-login-setup',
          newName: cleanName,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to initialize account security. Please verify your current password.');
        setLoading(false);
        return;
      }

      // Store updated session
      const updatedSession = {
        ...session,
        ...data.session.user,
        token: data.session.token,
        is_first_login: false,
        must_change_password: false,
        must_change_name: false,
      };

      localStorage.setItem('admin_session', JSON.stringify(updatedSession));
      onComplete(updatedSession);
    } catch (err) {
      console.error('First login setup error:', err);
      setError('Connection failure. Unable to contact authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="first-login-overlay">
      <div className="first-login-dialog animate-scale-up">
        <div className="dialog-badge">
          <ShieldCheck size={28} />
        </div>

        <h2>First-Time Security Setup</h2>
        <p className="dialog-desc">
          Welcome to the <strong>VeerNXT Content Management System</strong>. For platform security, all newly provisioned administrators must verify their full name and replace the temporary password with a personalized security credential.
        </p>

        <form onSubmit={handleSubmit} className="first-login-form">
          <div className="first-login-group">
            <label>Administrator Full Name <span className="req">*</span></label>
            <div className="first-login-field">
              <User size={17} className="field-icon" />
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="first-login-group">
            <label>Current Temporary Password</label>
            <div className="first-login-field">
              <Lock size={17} className="field-icon" />
              <input
                type="password"
                placeholder="Default temporary password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <span className="field-hint">Pre-filled with default: <code>123456789</code></span>
          </div>

          <div className="first-login-row">
            <div className="first-login-group">
              <label>New Security Password <span className="req">*</span></label>
              <div className="first-login-field">
                <KeyRound size={17} className="field-icon" />
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="first-login-group">
              <label>Confirm New Password <span className="req">*</span></label>
              <div className="first-login-field">
                <KeyRound size={17} className="field-icon" />
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="first-login-error">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="first-login-submit" disabled={loading}>
            {loading ? 'Activating Security Credentials...' : 'Save & Enter Content Factory'}
          </button>
        </form>
      </div>

      <style>{`
        .first-login-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .first-login-dialog {
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          padding: 2.5rem;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(16, 185, 129, 0.15);
          text-align: center;
          color: #f8fafc;
        }

        .dialog-badge {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem auto;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.35);
        }

        .first-login-dialog h2 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0 0 0.5rem 0;
          color: #f8fafc;
          letter-spacing: -0.02em;
        }

        .dialog-desc {
          font-size: 0.86rem;
          color: #94a3b8;
          line-height: 1.55;
          margin: 0 0 1.75rem 0;
        }

        .dialog-desc strong {
          color: #e2e8f0;
        }

        .first-login-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
          text-align: left;
        }

        .first-login-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          flex: 1;
        }

        .first-login-group label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #cbd5e1;
        }

        .req {
          color: #f87171;
        }

        .first-login-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .first-login-field {
          position: relative;
          display: flex;
          align-items: center;
        }

        .first-login-field .field-icon {
          position: absolute;
          left: 0.9rem;
          color: #64748b;
        }

        .first-login-field input {
          width: 100%;
          padding: 0.75rem 0.9rem 0.75rem 2.6rem;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #f8fafc;
          font-size: 0.9rem;
          outline: none;
          transition: all 0.2s;
        }

        .first-login-field input:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        .field-hint {
          font-size: 0.72rem;
          color: #64748b;
          margin-top: 0.15rem;
        }

        .field-hint code {
          color: #34d399;
          font-family: monospace;
          background: rgba(16, 185, 129, 0.1);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
        }

        .first-login-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          font-size: 0.8rem;
          font-weight: 600;
          line-height: 1.4;
        }

        .first-login-submit {
          width: 100%;
          padding: 0.95rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
          margin-top: 0.5rem;
        }

        .first-login-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.45);
        }

        .first-login-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .animate-scale-up {
          animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes scaleUp {
          from {
            opacity: 0;
            transform: scale(0.94);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (max-width: 600px) {
          .first-login-row {
            grid-template-columns: 1fr;
          }
          .first-login-dialog {
            padding: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default FirstLoginModal;
