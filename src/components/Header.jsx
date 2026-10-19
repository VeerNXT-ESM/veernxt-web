import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, User, Landmark, Briefcase,
  Home, Users, MessageSquare, Target, Search, Trophy, Scale, UserCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAccountSummary } from '../lib/useAccountSummary';
import AccountMenu from './ui/AccountMenu';
import ThemeToggle from './ui/ThemeToggle';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Phone-width navigation drawer (the horizontal nav links are hidden < 768px)
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { isEmployer, fullName, avatarUrl, profilingCompleted, pointsBalance } = useAccountSummary();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const profileTriggerRef = useRef(null);
  const navToggleRef = useRef(null);
  const drawerRef = useRef(null);

  const handleLogout = async () => {
    localStorage.removeItem('employer_session');
    await supabase.auth.signOut();
    navigate('/');
  };

  // One list drives both the desktop nav row and the phone drawer.
  const navItems = [
    { to: '/dashboard', label: 'Home', title: 'Home', icon: Home },
    { to: '/network', label: 'Network', title: 'My Network', icon: Users },
    !isEmployer && { to: '/learning-center', label: 'Learning', title: 'Learning', icon: Target },
    !isEmployer && { to: '/jobs', label: 'Jobs', title: 'Jobs', icon: Briefcase, badge: '#ef4444' },
    isEmployer && { to: '/find-candidates', label: 'Find', title: 'Find Candidates', icon: Search },
    { to: '/messaging', label: 'Messages', title: 'Messages', icon: MessageSquare, badge: '#fbbf24' },
    !isEmployer && { to: '/financial-guidance', label: 'Finance', title: 'Finance', icon: Landmark },
    !isEmployer && { to: '/legal-aid', label: 'Legal Aid', title: 'Legal Aid Cell', icon: Scale },
    !isEmployer && { to: '/private-sector', label: 'Private Sector', title: 'Private Sector', icon: UserCheck, prefix: true },
  ].filter(Boolean);
  const isActive = (item) => (item.prefix ? pathname.startsWith(item.to) : pathname === item.to);

  // Close the drawer on navigation.
  useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);

  // While open: Escape closes it (focus back to the toggle), the first link gets
  // focus, and growing past the phone breakpoint closes it.
  useEffect(() => {
    if (!isNavOpen) return undefined;
    drawerRef.current?.querySelector('a, button')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setIsNavOpen(false);
        navToggleRef.current?.focus();
      }
    };
    const mq = window.matchMedia('(min-width: 768px)');
    const onResize = () => { if (mq.matches) setIsNavOpen(false); };
    document.addEventListener('keydown', onKey);
    mq.addEventListener?.('change', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener?.('change', onResize);
    };
  }, [isNavOpen]);

  return (
    <header className={`linkedin-header${isEmployer ? ' is-employer' : ''}`}>
      <div className="header-container">
        {/* Left Side: Logo */}
        <div className="header-left">
          <Link to="/dashboard" className="logo-link">
            <img src="/logo.png" alt="VeerNXT" className="logo-img" />
          </Link>
        </div>

        {/* Right Side: Navigation links */}
        <div className="header-right">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className={`nav-link-item ${isActive(item) ? 'active' : ''}`} title={item.title}>
                <Icon size={22} />
                {item.badge && <span className="dot-badge" style={{ backgroundColor: item.badge }}></span>}
                <span className="nav-link-label">{item.label}</span>
              </Link>
            );
          })}

          {!isEmployer && pointsBalance != null && (
            <Link to="/rewards" className="points-pill" title="VeerNXT Points — Rewards Center">
              <Trophy size={14} />
              <span>{pointsBalance.toLocaleString()}</span>
            </Link>
          )}

          {/* Theme Mode Toggle (moves into the drawer on phones) */}
          <div className="header-theme-toggle-wrap">
            <ThemeToggle />
          </div>

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

          {/* Phone-only menu button */}
          <button
            type="button"
            ref={navToggleRef}
            className="header-menu-btn"
            onClick={() => setIsNavOpen((v) => !v)}
            aria-expanded={isNavOpen}
            aria-controls="header-mobile-nav"
            aria-label={isNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {isNavOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Phone navigation drawer — slides down under the header */}
      {isNavOpen && <div className="header-drawer-backdrop" onClick={() => setIsNavOpen(false)} aria-hidden="true" />}
      <nav
        id="header-mobile-nav"
        ref={drawerRef}
        className={`header-drawer ${isNavOpen ? 'is-open' : ''}`}
        aria-label="Main navigation"
        hidden={!isNavOpen}
      >
        <ul className="header-drawer-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`header-drawer-link ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setIsNavOpen(false)}
                >
                  <span className="header-drawer-icon">
                    <Icon size={20} />
                    {item.badge && <span className="dot-badge" style={{ backgroundColor: item.badge }} aria-hidden="true"></span>}
                  </span>
                  <span>{item.label}</span>
                  {item.badge && <span className="sr-only"> (new activity)</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="header-drawer-footer">
          {!isEmployer && pointsBalance != null && (
            <Link to="/rewards" className="points-pill" onClick={() => setIsNavOpen(false)}>
              <Trophy size={14} />
              <span>{pointsBalance.toLocaleString()} points</span>
            </Link>
          )}
          <div className="header-drawer-theme">
            <span>Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        .linkedin-header {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          font-family: -apple-system, system-ui, BlinkMacSystemFont, sans-serif;
          padding: calc(0.75rem + env(safe-area-inset-top, 0px)) 0 0.75rem;
          display: flex;
          align-items: center;
          box-shadow: var(--shadow-1);
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }
        .header-container {
          width: 100%;
          padding: 0 14px;
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
          height: 60px;
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
          gap: 0.25rem;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 0.5rem 0.4rem;
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
          color: var(--ios-text);
        }
        .nav-link-item.active {
          color: var(--ios-olive);
        }
        .nav-link-item.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 10%;
          right: 10%;
          height: 3px;
          background: var(--ios-olive-fill, var(--ios-olive));
          border-radius: 99px;
        }
        .dot-badge {
          position: absolute;
          top: 6px;
          right: 3px;
          width: 7px;
          height: 7px;
          min-width: 7px;
          min-height: 7px;
          aspect-ratio: 1 / 1;
          background: #ef4444;
          border-radius: 50% !important;
          display: block;
          box-sizing: border-box;
          box-shadow: 0 0 0 1.5px #ffffff;
        }
        .points-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.75rem;
          background: rgba(75, 107, 50, 0.08);
          color: var(--c-green, #4b6b32);
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
          color: var(--text-secondary);
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
          color: var(--ios-text);
        }
        .nav-avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--surface-alt);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          border: 1px solid var(--border);
          transition: border-color 0.15s;
        }
        .nav-profile-trigger:hover .nav-avatar-placeholder {
          border-color: var(--ios-olive);
        }
        .vertical-divider {
          width: 1px;
          height: 28px;
          background: var(--border);
          align-self: center;
          margin: 0 0.25rem;
        }
        .premium-mock {
          opacity: 0.85;
        }
        .premium-mock:hover {
          opacity: 1;
        }

        /* ── Phone navigation drawer ── */
        .header-menu-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          padding: 0;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--surface);
          color: var(--ios-text);
          cursor: pointer;
          flex-shrink: 0;
        }
        .header-menu-btn:focus-visible,
        .header-drawer-link:focus-visible {
          outline: 2px solid var(--ios-olive);
          outline-offset: 2px;
        }
        .header-drawer {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 2;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          box-shadow: var(--shadow-3);
          padding: 0.75rem 12px calc(0.85rem + env(safe-area-inset-bottom, 0px));
          max-height: calc(100dvh - 72px);
          overflow-y: auto;
          overscroll-behavior: contain;
          animation: headerDrawerIn 0.2s ease-out;
        }
        .header-drawer[hidden] {
          display: none;
        }
        @keyframes headerDrawerIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .header-drawer-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1;
          background: rgba(15, 23, 42, 0.35);
        }
        .header-container {
          position: relative;
          z-index: 3;
        }
        .header-drawer-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.4rem;
        }
        .header-drawer-link {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          min-height: 48px;
          padding: 0.55rem 0.75rem;
          border-radius: 10px;
          color: var(--ios-text);
          text-decoration: none;
          font-size: 0.95rem;
          font-weight: 600;
          background: var(--surface-alt);
          border: 1px solid transparent;
        }
        .header-drawer-link.active {
          color: var(--ios-olive);
          border-color: var(--ios-olive);
          background: rgba(75, 107, 50, 0.08);
        }
        .header-drawer-icon {
          position: relative;
          display: inline-flex;
          flex-shrink: 0;
        }
        .header-drawer-icon .dot-badge {
          top: -3px;
          right: -4px;
        }
        .header-drawer-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 0.85rem;
          padding-top: 0.85rem;
          border-top: 1px solid var(--border);
        }
        .header-drawer-theme {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-left: auto;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .header-drawer { animation: none; }
        }

        /* Tablet: icon-only nav so the full row fits without horizontal scroll */
        @media (min-width: 768px) and (max-width: 1100px) {
          .header-right {
            gap: 0.55rem;
          }
          .nav-link-label {
            display: none;
          }
          .nav-link-item {
            padding: 0.55rem;
          }
          .logo-img {
            height: 50px;
          }
        }

        @media (max-width: 767px) {
          .linkedin-header {
            padding: calc(0.5rem + env(safe-area-inset-top, 0px)) 0 0.5rem;
          }
          .nav-link-item,
          .header-right > .points-pill,
          .header-theme-toggle-wrap {
            display: none;
          }
          .header-menu-btn {
            display: inline-flex;
          }
          /* Recruiters: Home / Network / Find / Messages live in the bottom bar on phones */
          .linkedin-header.is-employer .header-menu-btn,
          .linkedin-header.is-employer .header-drawer,
          .linkedin-header.is-employer .header-drawer-backdrop {
            display: none !important;
          }
          .header-right {
            gap: 0.5rem;
          }
          .logo-img {
            height: 44px;
          }
          .header-container {
            padding: 0 12px;
          }
        }
      `}} />
    </header>
  );
};

export default Header;
