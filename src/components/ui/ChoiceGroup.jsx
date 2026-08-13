import { Check } from 'lucide-react';

/**
 * Large tappable single/multi-select choices — used in place of a dropdown
 * for small option sets in the guided-journey flows (candidate profiling,
 * employer onboarding). Reads as a conversational "pick one" rather than
 * opening a picker, and gives a much bigger touch target than a
 * radio/checkbox list would.
 */
export function ChoiceGroup({ options, value, onChange, columns = 1 }) {
  return (
    <div className="vxc-choice-group" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className="vxc-choice"
          data-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          <span className="vxc-choice-check">{value === opt.value && <Check size={14} />}</span>
          {opt.label}
        </button>
      ))}
      <ChoiceGroupStyles />
    </div>
  );
}

export function MultiChoiceGroup({ options, values, onToggle, columns = 2 }) {
  return (
    <div className="vxc-choice-group" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className="vxc-choice"
          data-selected={values.includes(opt.value)}
          onClick={() => onToggle(opt.value)}
        >
          <span className="vxc-choice-check">{values.includes(opt.value) && <Check size={14} />}</span>
          {opt.label}
        </button>
      ))}
      <ChoiceGroupStyles />
    </div>
  );
}

function ChoiceGroupStyles() {
  return (
    <style>{`
      .vxc-choice-group { display: grid; gap: 0.65rem; }
      .vxc-choice {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        min-height: 48px;
        padding: 0.75rem 1rem;
        border-radius: var(--radius-sm);
        border: 1.5px solid var(--border-strong);
        background: var(--surface);
        font-family: inherit;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--ios-text);
        cursor: pointer;
        text-align: left;
        transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
      }
      .vxc-choice:hover { border-color: var(--ios-olive); }
      .vxc-choice[data-selected="true"] { border-color: var(--ios-olive); background: rgba(75,107,50,0.08); color: var(--ios-olive); }
      .vxc-choice-check { width: 16px; display: inline-flex; color: var(--ios-olive); flex-shrink: 0; }
    `}</style>
  );
}
