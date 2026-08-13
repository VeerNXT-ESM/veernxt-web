import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Shared modal primitive — slides up as a bottom sheet on mobile widths
 * (the native-app pattern for confirmations/menus/forms), falls back to a
 * centered dialog on desktop. Replaces the ~8 independent modal
 * implementations across the app that each hand-rolled their own
 * radius/shadow/backdrop.
 */
export default function Sheet({ open, onClose, title, children, footer, maxWidth = '480px' }) {
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="ui-sheet-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ui-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ui-sheet-grabber" />
        <div className="ui-sheet-header">
          {title && <h3 className="ui-sheet-title">{title}</h3>}
          <button type="button" className="ui-sheet-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="ui-sheet-body">{children}</div>
        {footer && <div className="ui-sheet-footer">{footer}</div>}
      </div>

      <style>{`
        .ui-sheet-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          z-index: 300;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          animation: ui-sheet-fade 0.2s ease;
        }
        .ui-sheet-panel {
          background: var(--surface);
          width: 100%;
          max-height: 88vh;
          overflow-y: auto;
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          box-shadow: var(--shadow-3);
          padding: 0.75rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom, 0px));
          animation: ui-sheet-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ui-sheet-grabber {
          width: 36px;
          height: 4px;
          border-radius: var(--radius-pill);
          background: var(--border-strong);
          margin: 0.25rem auto 0.75rem;
        }
        .ui-sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .ui-sheet-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--ios-text);
          margin: 0;
        }
        .ui-sheet-close {
          background: var(--surface-alt);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .ui-sheet-footer {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }
        @keyframes ui-sheet-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ui-sheet-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @media (min-width: 640px) {
          .ui-sheet-backdrop {
            align-items: center;
          }
          .ui-sheet-panel {
            max-height: 85vh;
            border-radius: var(--radius-lg);
            padding: 1.5rem;
            animation: ui-sheet-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .ui-sheet-grabber {
            display: none;
          }
        }
        @keyframes ui-sheet-pop-in {
          from { transform: scale(0.96) translateY(8px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
