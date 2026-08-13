import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Pencil, LifeBuoy, ShieldCheck, Scale, LogOut, X } from 'lucide-react';

/**
 * The "Me" account control — one shared markup tree for both surfaces.
 * CSS media queries alone switch it between a compact mobile bottom sheet
 * and a small anchored desktop popover; the caller just needs to mount it
 * inside a `position: relative` trigger wrapper for the desktop anchoring
 * to resolve against (Header.jsx's `.nav-profile-dropdown` already is one).
 */
export default function AccountMenu({
  open,
  onClose,
  fullName,
  avatarUrl,
  isEmployer,
  profilingCompleted,
  onLogout,
  returnFocusRef,
}) {
  const navigate = useNavigate();
  const firstItemRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const t = setTimeout(() => firstItemRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      clearTimeout(t);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open && returnFocusRef?.current) {
      returnFocusRef.current.focus();
    }
    // Only run when the menu transitions closed, not on every returnFocusRef identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const go = (to, state) => {
    onClose();
    navigate(to, state ? { state } : undefined);
  };

  const initials = (fullName || '')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const statusLabel = isEmployer
    ? 'Employer Partner'
    : (profilingCompleted ? 'Profile Complete' : 'Complete Your Profile');

  return (
    <>
      <div className="am-catcher" onClick={onClose} role="presentation" />
      <div className="am-panel" role="dialog" aria-modal="true" aria-label="Account menu">
        <div className="am-grabber" />
        <button type="button" className="am-close" onClick={onClose} aria-label="Close account menu">
          <X size={16} />
        </button>

        <div className="am-header">
          <div className="am-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : (initials || <User size={18} />)}
          </div>
          <div className="am-header-text">
            <span className="am-name">{fullName || 'Your Account'}</span>
            <span className="am-status">
              {!isEmployer && <span className={`am-dot ${profilingCompleted ? 'am-dot-ok' : 'am-dot-pending'}`} />}
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="am-group">
          <span className="am-group-label">Account</span>
          <button type="button" ref={firstItemRef} className="am-item" onClick={() => go('/dashboard')}>
            <User size={18} /> My Profile
          </button>
          <button type="button" className="am-item" onClick={() => go('/dashboard', { openEditProfile: true })}>
            <Pencil size={18} /> Edit Profile
          </button>
        </div>

        <div className="am-group">
          <span className="am-group-label">Help &amp; Information</span>
          <button type="button" className="am-item" onClick={() => go('/support')}>
            <LifeBuoy size={18} /> Support
          </button>
          <button type="button" className="am-item" onClick={() => go('/privacy')}>
            <ShieldCheck size={18} /> Privacy Policy
          </button>
          <button type="button" className="am-item" onClick={() => go('/legal')}>
            <Scale size={18} /> Legal
          </button>
        </div>

        <div className="am-group">
          <span className="am-group-label">Account Action</span>
          <button type="button" className="am-item am-danger" onClick={() => { onClose(); onLogout(); }}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>

      <style>{`
        .am-catcher {
          position: fixed;
          inset: 0;
          z-index: 300;
          background: transparent;
        }
        .am-panel {
          z-index: 301;
          background: var(--surface);
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
        }
        .am-grabber {
          width: 36px;
          height: 4px;
          border-radius: var(--radius-pill);
          background: var(--border-strong);
          margin: 0.5rem auto 0.25rem;
          flex-shrink: 0;
        }
        .am-close {
          position: absolute;
          top: 0.6rem;
          right: 0.6rem;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: var(--surface-alt);
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .am-close:hover {
          background: var(--border);
        }
        .am-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem 0.85rem;
        }
        .am-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(75, 107, 50, 0.1);
          color: var(--ios-olive);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          overflow: hidden;
          flex-shrink: 0;
        }
        .am-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .am-header-text {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          min-width: 0;
        }
        .am-name {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--ios-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .am-status {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
        }
        .am-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .am-dot-ok {
          background: var(--success, #1a9c5e);
        }
        .am-dot-pending {
          background: var(--warning, #b45309);
        }
        .am-group {
          padding: 0.3rem 0.5rem;
          border-top: 1px solid var(--border);
        }
        .am-group-label {
          display: block;
          font-size: 0.66rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: #94a3b8;
          text-transform: uppercase;
          padding: 0.5rem 0.5rem 0.3rem;
        }
        .am-item {
          width: 100%;
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0 0.5rem;
          background: none;
          border: none;
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--ios-text);
          text-align: left;
          cursor: pointer;
        }
        .am-item svg {
          color: #94a3b8;
          flex-shrink: 0;
        }
        .am-item:hover {
          background: var(--surface-alt);
          color: var(--ios-olive);
        }
        .am-item:hover svg {
          color: var(--ios-olive);
        }
        .am-item:focus-visible {
          outline: 2px solid var(--ios-olive);
          outline-offset: -2px;
          background: var(--surface-alt);
        }
        .am-item.am-danger {
          color: var(--danger);
        }
        .am-item.am-danger svg {
          color: var(--danger);
        }
        .am-item.am-danger:hover,
        .am-item.am-danger:focus-visible {
          background: var(--danger-bg);
          color: var(--danger);
        }
        .am-item.am-danger:hover svg {
          color: var(--danger);
        }
        .am-close:focus-visible {
          outline: 2px solid var(--ios-olive);
          outline-offset: 2px;
        }

        @media (max-width: 767px) {
          .am-catcher {
            background: rgba(15, 23, 42, 0.45);
            animation: am-fade 0.2s ease;
          }
          .am-panel {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
            box-shadow: var(--shadow-3);
            padding-bottom: env(safe-area-inset-bottom, 0px);
            animation: am-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }
        }
        @media (min-width: 768px) {
          .am-panel {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            width: 260px;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-2);
            animation: am-pop-in 0.15s ease;
          }
          .am-grabber,
          .am-close {
            display: none;
          }
        }
        @keyframes am-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes am-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes am-pop-in {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
