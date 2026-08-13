import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Target, Briefcase, Search, MessageSquare, Landmark } from 'lucide-react';
import { useAccountSummary } from '../../lib/useAccountSummary';

/**
 * Fixed bottom tab bar shown at mobile widths — the native-app navigation
 * pattern this app was missing entirely (it previously only had a shrunk
 * desktop icon row in the header). Desktop keeps the top header nav;
 * this only renders below the sm breakpoint via CSS.
 *
 * Account access ("Me") lives only in the Header's avatar trigger, which
 * stays visible at every width — it isn't duplicated here.
 */
export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isEmployer } = useAccountSummary();

  const items = [
    { key: 'home', label: 'Home', icon: Home, to: '/dashboard' },
    !isEmployer && { key: 'learning', label: 'Learning', icon: Target, to: '/learning-center' },
    isEmployer
      ? { key: 'find', label: 'Find', icon: Search, to: '/find-candidates' }
      : { key: 'jobs', label: 'Jobs', icon: Briefcase, to: '/jobs' },
    { key: 'messages', label: 'Messages', icon: MessageSquare, to: '/messaging' },
    !isEmployer && { key: 'finance', label: 'Finance', icon: Landmark, to: '/financial-guidance' },
  ].filter(Boolean);

  return (
    <>
      <nav className="ui-bottom-nav">
        {items.map((item) => {
          const isActive = item.to && location.pathname === item.to;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className={`ui-bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.to)}
            >
              <span className="ui-bottom-nav-icon-wrap">
                <Icon size={22} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <style>{`
        .ui-bottom-nav {
          display: none;
        }
        @media (max-width: 767px) {
          .ui-bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 90;
            display: flex;
            background: var(--surface);
            border-top: 1px solid var(--border);
            box-shadow: var(--shadow-3);
            padding: 0.4rem 0.25rem calc(0.4rem + env(safe-area-inset-bottom, 0px));
          }
          /* Give routed page content room so it doesn't sit under the bar */
          body {
            padding-bottom: 64px;
          }
        }
        .ui-bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
          background: none;
          border: none;
          padding: 0.35rem 0;
          font-size: 0.65rem;
          font-weight: 600;
          font-family: inherit;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .ui-bottom-nav-item.active {
          color: var(--ios-olive);
        }
        .ui-bottom-nav-icon-wrap {
          position: relative;
        }
      `}</style>
    </>
  );
}
