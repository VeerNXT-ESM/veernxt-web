import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple shared password for the 3-person team
    if (password === 'veernxtadmin2026') {
      localStorage.setItem('admin_session', 'true');
      navigate('/admin');
    } else {
      setError('Invalid admin password');
    }
  };

  return (
    <div className="admin-login-container">
      <div className="login-card">
        <h1>Admin Portal</h1>
        <p>Enter the secure password to manage VeerNXT content.</p>
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <input 
              type="password" 
              placeholder="Admin Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn-primary">Access Dashboard</button>
        </form>
      </div>

      <style>{`
        .admin-login-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
        }
        .login-card {
          background: white;
          padding: 3rem;
          border-radius: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        h1 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
        p { color: #64748b; font-size: 0.9rem; margin-bottom: 2rem; }
        .input-group { margin-bottom: 1rem; }
        input {
          width: 100%;
          padding: 1rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          font-size: 1rem;
          outline: none;
          transition: all 0.2s;
        }
        input:focus { border-color: var(--ios-olive); box-shadow: 0 0 0 4px rgba(75, 107, 50, 0.1); }
        .error-message { color: #ef4444; font-size: 0.8rem; margin-bottom: 1rem; font-weight: 600; }
        .btn-primary {
          width: 100%;
          padding: 1rem;
          background: var(--ios-olive);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;
