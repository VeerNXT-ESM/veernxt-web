import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Menu, Settings, LogOut, User, Bell, Landmark, Briefcase,
  Home, Users, MessageSquare, ChevronDown, Grid, Target, Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userProfileName, setUserProfileName] = useState('Rahul Kumar');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await supabase.from('user_profiles').select('full_name').limit(1);
        if (data && data[0]?.full_name) {
          setUserProfileName(data[0].full_name);
        }
      } catch (e) {
        console.warn("Could not load user profile for header name");
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="linkedin-header">
      <div className="header-container">
        {/* Left Side: Logo */}
        <div className="header-left">
          <Link to="/dashboard" className="logo-link">
            <img src="/logo.png" alt="VeerNXT" className="logo-img" />
          </Link>
        </div>

        {/* Right Side: LinkedIn-styled Navigation links */}
        <div className="header-right">
          <Link to="/dashboard" className={`nav-link-item ${window.location.pathname === '/dashboard' ? 'active' : ''}`}>
            <Home size={20} />
            <span>Home</span>
          </Link>

          <Link to="/learning-center" className={`nav-link-item ${window.location.pathname === '/learning-center' ? 'active' : ''}`}>
            <Users size={20} />
            <span>Learning</span>
          </Link>

          <Link to="/jobs" className={`nav-link-item ${window.location.pathname === '/jobs' ? 'active' : ''}`}>
            <Briefcase size={20} />
            <span className="dot-badge"></span>
            <span>Jobs</span>
          </Link>

          <Link to="/financial-guidance" className={`nav-link-item ${window.location.pathname === '/financial-guidance' ? 'active' : ''}`}>
            <Landmark size={20} />
            <span>Finance</span>
          </Link>

          {/* User Profile / Dropdown */}
          <div className="nav-profile-dropdown" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <div className="nav-profile-trigger">
              <div className="nav-avatar-placeholder">
                <User size={14} />
              </div>
              <span className="me-text">
                Me <ChevronDown size={12} />
              </span>
            </div>

            {isMenuOpen && (
              <div className="profile-dropdown-menu">
                <div className="dropdown-user-header">
                  <div className="menu-avatar-placeholder">
                    <User size={18} />
                  </div>
                  <div className="dropdown-user-details">
                    <span className="details-name">{userProfileName}</span>
                    <span className="details-role">Active Candidate</span>
                  </div>
                </div>
                
                <div className="dropdown-divider"></div>
                
                <button onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }} className="dropdown-btn">
                  <User size={14} /> My Profile
                </button>
                <button onClick={() => { navigate('/privacy'); setIsMenuOpen(false); }} className="dropdown-btn">
                  Privacy Policy
                </button>
                <button onClick={() => { navigate('/support'); setIsMenuOpen(false); }} className="dropdown-btn">
                  Support
                </button>
                <button onClick={() => { navigate('/legal'); setIsMenuOpen(false); }} className="dropdown-btn">
                  Legal
                </button>
                
                <div className="dropdown-divider"></div>
                
                <button onClick={handleLogout} className="dropdown-btn logout">
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .linkedin-header {
          background: white;
          border-bottom: 1px solid #eef3f8;
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          font-family: -apple-system, system-ui, BlinkMacSystemFont, sans-serif;
          padding: 1.5rem 0 1rem; /* Header top padding and bottom padding */
          display: flex;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }
        .logo-img {
          height: 96px; /* 3 times 32px size, making logo 3x larger! */
          width: auto;
          object-fit: contain;
          border-radius: 4px;
          display: block;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          height: 100%;
        }
        .nav-link-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #666;
          text-decoration: none;
          font-size: 0.75rem;
          font-weight: 550;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          cursor: pointer;
          position: relative;
          transition: all 0.15s;
          border-bottom: 2px solid transparent;
        }
        .nav-link-item:hover {
          color: #191919;
        }
        .nav-link-item.active {
          color: #191919;
          border-bottom: 2px solid #1F3A2E; /* VeerNXT active green active line */
        }
        .dot-badge {
          position: absolute;
          top: 4px;
          right: 18px;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
        }
        .nav-profile-dropdown {
          position: relative;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .nav-profile-trigger {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.15rem;
          color: #666;
        }
        .nav-profile-trigger:hover {
          color: #191919;
        }
        .nav-avatar-placeholder {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #eef3f8;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
        }
        .me-text {
          font-size: 0.72rem;
          font-weight: 550;
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .vertical-divider {
          width: 1px;
          height: 34px;
          background: #eef3f8;
          align-self: center;
          margin: 0 0.25rem;
        }
        .premium-mock {
          opacity: 0.85;
        }
        .premium-mock:hover {
          opacity: 1;
        }

        /* Profile Dropdown Menu */
        .profile-dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.25rem;
          width: 240px;
          background: white;
          border: 1px solid #eef3f8;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          z-index: 200;
          overflow: hidden;
          padding: 0.5rem;
          text-align: left;
        }
        .dropdown-user-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0.5rem;
        }
        .menu-avatar-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
        }
        .dropdown-user-details {
          display: flex;
          flex-direction: column;
        }
        .details-name {
          font-weight: 750;
          font-size: 0.9rem;
          color: #0f172a;
        }
        .details-role {
          font-size: 0.72rem;
          color: #64748b;
        }
        .dropdown-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 0.5rem 0;
        }
        .dropdown-btn {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border: none;
          background: none;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 600;
          color: #475569;
          border-radius: 6px;
          transition: background 0.2s, color 0.2s;
          text-align: left;
        }
        .dropdown-btn:hover {
          background: #f8fafc;
          color: #0f172a;
        }
        .dropdown-btn.logout {
          color: #ef4444;
        }
        .dropdown-btn.logout:hover {
          background: #fef2f2;
          color: #ef4444;
        }
      `}} />
    </header>
  );
};

export default Header;
