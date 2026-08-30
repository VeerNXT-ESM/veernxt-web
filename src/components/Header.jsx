import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, Settings, User, Bell, Landmark, Briefcase,
  Home, Users, MessageSquare, Grid, Target, Search, Trophy, Scale
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAccountSummary } from '../lib/useAccountSummary';
import AccountMenu from './ui/AccountMenu';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isEmployer, fullName, avatarUrl, profilingCompleted, pointsBalance } = useAccountSummary();
  const navigate = useNavigate();
  const profileTriggerRef = useRef(null);

  const handleLogout = async () => {
    localStorage.removeItem('employer_session');
    await supabase.auth.signOut();
    navigate('/');
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

        {/* Right Side: LinkedIn-styled Navigation links (Icon only with active indicator lines) */}
        <div className="header-right">
          <Link to="/dashboard" className={`nav-link-item ${window.location.pathname === '/dashboard' ? 'active' : ''}`} title="Home">
            <Home size={22} />
            <span className="nav-link-label">Home</span>
          </Link>

          <Link to="/network" className={`nav-link-item ${window.location.pathname === '/network' ? 'active' : ''}`} title="My Network">
            <Users size={22} />
            <span className="nav-link-label">Network</span>
          </Link>

          {!isEmployer && (
            <Link to="/learning-center" className={`nav-link-item ${window.location.pathname === '/learning-center' ? 'active' : ''}`} title="Learning">
              <Target size={22} />
              <span className="nav-link-label">Learning</span>
            </Link>
          )}

          {!isEmployer && (
            <Link to="/jobs" className={`nav-link-item ${window.location.pathname === '/jobs' ? 'active' : ''}`} title="Jobs">
              <Briefcase size={22} />
              <span className="dot-badge"></span>
              <span className="nav-link-label">Jobs</span>
            </Link>
          )}

          {isEmployer && (
            <Link to="/find-candidates" className={`nav-link-item ${window.location.pathname === '/find-candidates' ? 'active' : ''}`} title="Find Candidates">
              <Search size={22} />
              <span className="nav-link-label">Find</span>
            </Link>
          )}

          <Link to="/messaging" className={`nav-link-item ${window.location.pathname === '/messaging' ? 'active' : ''}`} title="Messages">
            <MessageSquare size={22} />
            <span className="dot-badge" style={{ backgroundColor: '#fbbf24' }}></span>
            <span className="nav-link-label">Messages</span>
          </Link>

          {!isEmployer && (
            <Link to="/financial-guidance" className={`nav-link-item ${window.location.pathname === '/financial-guidance' ? 'active' : ''}`} title="Finance">
              <Landmark size={22} />
              <span className="nav-link-label">Finance</span>
            </Link>
          )}

          {!isEmployer && (
            <Link to="/legal-aid" className={`nav-link-item ${window.location.pathname === '/legal-aid' ? 'active' : ''}`} title="Legal Aid Cell">
              <Scale size={22} />
              <span className="nav-link-label">Legal Aid</span>
            </Link>
          )}

          {!isEmployer && pointsBalance != null && (
            <Link to="/rewards" className="points-pill" title="VeerNXT Points — Rewards Center">
              <Trophy size={14} />
              <span>{pointsBalance.toLocaleString()}</span>
            </Link>
          )}

          {/* User Profile / Account menu */}
          <div className="nav-profile-dropdown">
            <button
              type="button"
              ref={profileTriggerRef}
              className="nav-profile-trigger"
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
            >
              <div className="nav-avatar-placeholder" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Account" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={20} />
                )}
              </div>
            </button>

            <AccountMenu
              open={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              fullName={fullName}
              avatarUrl={avatarUrl}
              isEmployer={isEmployer}
              profilingCompleted={profilingCompleted}
              onLogout={handleLogout}
              returnFocusRef={profileTriggerRef}
            />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .linkedin-header {
          background: #FFFFFF; /* Pure white header background */
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          font-family: -apple-system, system-ui, BlinkMacSystemFont, sans-serif;
          padding: calc(1rem + env(safe-area-inset-top, 0px)) 0 1rem; /* Tightened layout spacing */
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
          height: 74px; /* 15% larger logo size */
          width: auto;
          object-fit: contain;
          border-radius: 4px;
          display: block;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          height: 100%;
        }
        .nav-link-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          color: #64748b;
          text-decoration: none;
          padding: 0.75rem 0.5rem;
          cursor: pointer;
          position: relative;
          transition: all 0.15s;
        }
        .nav-link-label {
          font-size: 0.68rem;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
        }
        .nav-link-item:hover {
          color: #0f172a;
        }
        .nav-link-item.active {
          color: #1F3A2E;
        }
        .nav-link-item.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 10%;
          right: 10%;
          height: 3px;
          background: #1F3A2E; /* VeerNXT active green active line */
          border-radius: 99px;
        }
        .dot-badge {
          position: absolute;
          top: 6px;
          right: 2px;
          width: 6px;
          height: 6px;
          background: #ef4444;
          border-radius: 50%;
        }
        .points-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.75rem;
          background: rgba(75, 107, 50, 0.08);
          color: #4b6b32;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
          flex-shrink: 0;
          text-decoration: none;
          transition: background 0.15s;
        }
        .points-pill:hover {
          background: rgba(75, 107, 50, 0.16);
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
          background: none;
          border: none;
          font: inherit;
          cursor: pointer;
          padding: 0.25rem;
        }
        .nav-profile-trigger:focus-visible {
          outline: 2px solid var(--ios-olive);
          outline-offset: 2px;
          border-radius: 6px;
        }
        .nav-profile-trigger:hover {
          color: #191919;
        }
        .nav-avatar-placeholder {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #eef3f8;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          border: 2px solid transparent;
          transition: border-color 0.15s;
        }
        .nav-profile-trigger:hover .nav-avatar-placeholder {
          border-color: #d8e0e6;
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

        /* Below 768px, primary navigation lives in the fixed BottomNav
           instead — keep just the logo, points pill and profile trigger
           in the header so it doesn't duplicate the tab bar. */
        @media (max-width: 767px) {
          .nav-link-item {
            display: none;
          }
          .header-right {
            gap: 0.75rem;
          }
        }
      `}} />
    </header>
  );
};

export default Header;
