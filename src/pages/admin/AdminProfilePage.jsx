import { useState, useEffect } from 'react';
import { Shield, KeyRound, User, Phone, Mail, CheckCircle2, AlertCircle, Save, ShieldCheck, Lock } from 'lucide-react';
import './AdminCMS.css';

const AdminProfilePage = () => {
  const [session, setSession] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Profile update state
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    const raw = localStorage.getItem('admin_session');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setSession(parsed);
        setFullName(parsed.name || '');
        setPhone(parsed.phone || '');
      } catch (e) {
        console.error('Failed to parse admin session', e);
      }
    }
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ text: '', type: '' });

    if (!fullName.trim() || fullName.trim().length < 2) {
      setProfileMsg({ text: 'Full name must contain at least 2 characters.', type: 'error' });
      return;
    }

    setProfileLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
        },
        body: JSON.stringify({
          action: 'update-profile',
          name: fullName.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setProfileMsg({ text: data.error || 'Failed to update profile.', type: 'error' });
        return;
      }

      // Update local session
      const updatedSession = {
        ...session,
        ...data.user,
      };
      localStorage.setItem('admin_session', JSON.stringify(updatedSession));
      setSession(updatedSession);
      setProfileMsg({ text: 'Profile details saved successfully.', type: 'success' });
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileMsg({ text: 'Unable to connect to server. Please try again.', type: 'error' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ text: '', type: '' });

    if (!currentPassword) {
      setPasswordMsg({ text: 'Please enter your current security password.', type: 'error' });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters long.', type: 'error' });
      return;
    }

    if (newPassword === '123456789' || newPassword === '1234556789') {
      setPasswordMsg({ text: 'New password cannot be the temporary default password.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'New password and confirmation do not match.', type: 'error' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
        },
        body: JSON.stringify({
          action: 'change-password',
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPasswordMsg({ text: data.error || 'Failed to change password.', type: 'error' });
        return;
      }

      setPasswordMsg({ text: 'Security password changed successfully.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Mark must_change_password as false in session
      if (session) {
        const updated = { ...session, must_change_password: false, is_first_login: false };
        localStorage.setItem('admin_session', JSON.stringify(updated));
        setSession(updated);
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordMsg({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!session) return null;

  const initials = (session.name || 'Admin')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="admin-profile-page">
      {/* Top Banner / Identity Card */}
      <div className="profile-identity-card">
        <div className="profile-avatar-circle">{initials}</div>
        <div className="profile-identity-details">
          <div className="profile-name-row">
            <h1>{session.name}</h1>
            <span className="profile-badge-role">
              <Shield size={13} /> {session.role}
            </span>
          </div>
          <p className="profile-email-meta">
            <Mail size={14} /> {session.email}
          </p>
          <div className="profile-status-tags">
            <span className="tag-pill active">
              <ShieldCheck size={12} /> Active Administrator
            </span>
            <span className="tag-pill">ID: {session.id?.slice(0, 8)}...</span>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        {/* Left Column: Personal Information */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="card-icon-box">
              <User size={18} />
            </div>
            <div>
              <h3>Admin Profile Details</h3>
              <p>Update your personal name and contact information.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="profile-form">
            <div className="form-group">
              <label>Administrator Full Name</label>
              <div className="field-with-icon">
                <User size={16} className="field-icon" />
                <input
                  type="text"
                  placeholder="e.g. Shreya Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Official Administrator Email</label>
              <div className="field-with-icon disabled">
                <Mail size={16} className="field-icon" />
                <input type="email" value={session.email} disabled />
              </div>
              <small className="field-hint">Email is managed by Super Administrator directory.</small>
            </div>

            <div className="form-group">
              <label>Direct Phone / Contact (Optional)</label>
              <div className="field-with-icon">
                <Phone size={16} className="field-icon" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {profileMsg.text && (
              <div className={`status-banner ${profileMsg.type}`}>
                {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <button type="submit" className="save-btn" disabled={profileLoading}>
              <Save size={16} />
              <span>{profileLoading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Security & Password */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="card-icon-box security">
              <KeyRound size={18} />
            </div>
            <div>
              <h3>Security &amp; Password</h3>
              <p>Update your administrator access password.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="profile-form">
            <div className="form-group">
              <label>Current Security Password</label>
              <div className="field-with-icon">
                <Lock size={16} className="field-icon" />
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>New Security Password</label>
              <div className="field-with-icon">
                <KeyRound size={16} className="field-icon" />
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <small className="field-hint">Must be at least 6 characters and different from default.</small>
            </div>

            <div className="form-group">
              <label>Confirm New Security Password</label>
              <div className="field-with-icon">
                <KeyRound size={16} className="field-icon" />
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {passwordMsg.text && (
              <div className={`status-banner ${passwordMsg.type}`}>
                {passwordMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <button type="submit" className="save-btn security" disabled={passwordLoading}>
              <Lock size={16} />
              <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Permissions & Access Control List */}
      <div className="profile-card privileges-section">
        <div className="profile-card-header">
          <div className="card-icon-box">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3>Administrative Access Level</h3>
            <p>Privileges granted to your account across VeerNXT subsystems.</p>
          </div>
        </div>

        <div className="privileges-grid">
          <div className="privilege-item active">
            <CheckCircle2 size={16} className="check-icon" />
            <div>
              <strong>CMS Content Management</strong>
              <p>Manage learning exams, book chapters, reader themes, syllabus mapping.</p>
            </div>
          </div>
          <div className="privilege-item active">
            <CheckCircle2 size={16} className="check-icon" />
            <div>
              <strong>Assessments &amp; PYQs</strong>
              <p>Curate interactive quizzes, questions, and previous year exam papers.</p>
            </div>
          </div>
          <div className="privilege-item active">
            <CheckCircle2 size={16} className="check-icon" />
            <div>
              <strong>Operations &amp; Job Board</strong>
              <p>Review public job vacancies, private sector listings, and legal aid requests.</p>
            </div>
          </div>
          <div className={`privilege-item ${session.role === 'Super Admin' ? 'active' : 'subtle'}`}>
            <CheckCircle2 size={16} className="check-icon" />
            <div>
              <strong>Admin Directory &amp; Roles</strong>
              <p>{session.role === 'Super Admin' ? 'Super Admin privilege: Add, update and audit platform administrators.' : 'Restricted to Super Administrator.'}</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .admin-profile-page {
          max-width: 1080px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding-bottom: 3rem;
        }

        .profile-identity-card {
          background: #1e293b;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem 2.25rem;
          display: flex;
          align-items: center;
          gap: 2rem;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
        }

        .profile-avatar-circle {
          width: 80px;
          height: 80px;
          border-radius: 22px;
          background: linear-gradient(135deg, #10b981 0%, #047857 100%);
          color: white;
          font-size: 2rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35);
          letter-spacing: -0.02em;
          flex-shrink: 0;
        }

        .profile-identity-details {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .profile-name-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .profile-name-row h1 {
          font-size: 1.6rem;
          font-weight: 800;
          color: #f8fafc;
          margin: 0;
        }

        .profile-badge-role {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .profile-email-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #94a3b8;
          font-size: 0.9rem;
          margin: 0;
        }

        .profile-status-tags {
          display: flex;
          gap: 0.6rem;
          margin-top: 0.4rem;
        }

        .tag-pill {
          font-size: 0.75rem;
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.06);
          color: #cbd5e1;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .tag-pill.active {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.12);
        }

        .profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 1.5rem;
        }

        .profile-card {
          background: #182234;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
        }

        .profile-card-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .card-icon-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .card-icon-box.security {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .profile-card-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #f1f5f9;
        }

        .profile-card-header p {
          margin: 0.2rem 0 0 0;
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-group label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #cbd5e1;
        }

        .field-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-icon {
          position: absolute;
          left: 0.9rem;
          color: #64748b;
        }

        .field-with-icon input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.6rem;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #f8fafc;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .field-with-icon input:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        .field-with-icon.disabled input {
          background: rgba(15, 23, 42, 0.5);
          color: #64748b;
          cursor: not-allowed;
        }

        .field-hint {
          font-size: 0.75rem;
          color: #64748b;
        }

        .status-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .status-banner.success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
        }

        .status-banner.error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .save-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1.25rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 0.5rem;
        }

        .save-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
        }

        .save-btn.security {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .save-btn.security:hover:not(:disabled) {
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .privileges-section {
          grid-column: 1 / -1;
        }

        .privileges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
        }

        .privilege-item {
          display: flex;
          gap: 0.8rem;
          padding: 1rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
        }

        .privilege-item.active .check-icon {
          color: #10b981;
        }

        .privilege-item.subtle {
          opacity: 0.5;
        }

        .privilege-item.subtle .check-icon {
          color: #64748b;
        }

        .privilege-item strong {
          display: block;
          font-size: 0.85rem;
          color: #f1f5f9;
          margin-bottom: 0.2rem;
        }

        .privilege-item p {
          margin: 0;
          font-size: 0.75rem;
          color: #94a3b8;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};

export default AdminProfilePage;
