import { useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, User, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAccountSummary } from '../lib/useAccountSummary';
import AccountMenu from '../components/ui/AccountMenu';
import { V2_SECTIONS } from './sections';
import './v2.css';

/**
 * Shared chrome for every /v2 screen: slim header (logo -> universal landing,
 * four section links, chat icon, avatar) plus a mobile bottom nav. The avatar
 * menu is the only way into the student dashboard (/v2/me).
 */
export default function V2Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { fullName, avatarUrl, profilingCompleted, isEmployer } = useAccountSummary();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const triggerRef = useRef(null);

  const handleLogout = async () => {
    localStorage.removeItem('employer_session');
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (s) => pathname.startsWith(s.to);

  return (
    <div className="v2-shell">
      <header className="v2-header">
        <div className="v2-header-inner">
          <Link to="/v2" className="v2-logo" aria-label="VeerNXT home">
            <img src="/logo.png" alt="VeerNXT" />
          </Link>

          <nav className="v2-nav" aria-label="Sections">
            {V2_SECTIONS.map((s) => (
              <Link key={s.key} to={s.to} className={`v2-nav-link ${isActive(s) ? 'active' : ''}`}>
                {s.label}
              </Link>
            ))}
          </nav>

          <div className="v2-header-right">
            <Link to="/v2/messages" className={`v2-icon-btn ${pathname === '/v2/messages' ? 'active' : ''}`} aria-label="Messages" title="Messages">
              <MessageSquare size={22} />
            </Link>
            <div className="v2-avatar-wrap">
              <button
                type="button"
                ref={triggerRef}
                className="v2-avatar-btn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-label="Account menu"
              >
                {avatarUrl ? <img src={avatarUrl} alt="" /> : <User size={20} />}
              </button>
              <AccountMenu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                fullName={fullName}
                avatarUrl={avatarUrl}
                isEmployer={isEmployer}
                profilingCompleted={profilingCompleted}
                onLogout={handleLogout}
                returnFocusRef={triggerRef}
                profilePath="/v2/me"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="v2-main">
        <Outlet />
      </main>

      <nav className="v2-bottom-nav" aria-label="Sections">
        <Link to="/v2" className={`v2-bottom-item ${pathname === '/v2' ? 'active' : ''}`}>
          <Home size={22} /><span>Home</span>
        </Link>
        {V2_SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.key} to={s.to} className={`v2-bottom-item ${isActive(s) ? 'active' : ''}`}>
              <Icon size={22} /><span>{s.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
