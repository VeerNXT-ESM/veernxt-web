/**
 * Shared segmented-control / tab-switcher primitive. This app had 5
 * unrelated hand-rolled versions of this control (index.css's
 * .tab-switcher, a conflicting local override in AdminQuizEditor, plus 3
 * more bespoke ones) — this is the one implementation going forward.
 *
 * options: [{ value, label, icon? }]
 * variant: 'track' (default) — inactive segment sits on a neutral track,
 *   active segment lifts on a white chip. Good for low-stakes view toggles.
 * variant: 'filled' — active segment gets a solid brand fill with white
 *   text instead of just a lighter chip, for choices where the selected
 *   state needs to be unambiguous at a glance (e.g. an account-type gate).
 */
export default function Tabs({ options, value, onChange, fullWidth = false, variant = 'track', className = '', style }) {
  const isFilled = variant === 'filled';
  return (
    <div
      role="tablist"
      className={className}
      style={{
        display: 'inline-flex',
        gap: isFilled ? '0.5rem' : '0.25rem',
        background: isFilled ? 'transparent' : 'var(--surface-alt)',
        padding: isFilled ? 0 : '0.25rem',
        borderRadius: 'var(--radius-sm)',
        width: fullWidth ? '100%' : 'fit-content',
        ...style,
      }}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            style={{
              flex: fullWidth ? 1 : undefined,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              minHeight: '44px',
              padding: '0.5rem 1.1rem',
              borderRadius: 'calc(var(--radius-sm) - 2px)',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              fontWeight: isFilled ? 700 : 600,
              whiteSpace: 'nowrap',
              border: isFilled ? `1.5px solid ${isActive ? 'var(--ios-olive)' : 'var(--border-strong)'}` : 'none',
              background: isFilled
                ? (isActive ? 'var(--ios-olive)' : 'var(--surface)')
                : (isActive ? 'var(--surface)' : 'transparent'),
              color: isFilled
                ? (isActive ? '#ffffff' : 'var(--ios-text)')
                : (isActive ? 'var(--ios-olive)' : 'var(--text-secondary)'),
              boxShadow: !isFilled && isActive ? 'var(--shadow-1)' : 'none',
              transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
            }}
          >
            {Icon && <Icon size={15} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
