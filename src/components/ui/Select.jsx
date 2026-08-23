import ReactSelect from 'react-select';
import { ChevronDown } from 'lucide-react';

/**
 * Shared select/dropdown primitive — one implementation for both the
 * simple native-<select> cases scattered across the app (unstyled browser
 * default) and the searchable cases that used to reach for react-select
 * with a bespoke CSS-in-JS object (PremiumSelect.jsx). Both render on the
 * same token-driven look so a dropdown looks the same everywhere.
 *
 * options: [{ value, label }]
 */
export default function Select({ options, value, onChange, placeholder, disabled, name, searchable = false, className, style }) {
  if (searchable) {
    return (
      <ReactSelect
        value={options.find((opt) => opt.value === value) || null}
        onChange={(selected) => onChange({ target: { name, value: selected ? selected.value : '', type: 'select-one' } })}
        options={options}
        styles={reactSelectStyles}
        placeholder={placeholder || 'Select...'}
        isDisabled={disabled}
        components={{ DropdownIndicator }}
        isClearable={false}
        isSearchable
        menuPlacement="auto"
        className={className}
      />
    );
  }

  return (
    <div style={{ position: 'relative', ...style }} className={className}>
      <select
        name={name}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: '100%',
          appearance: 'none',
          WebkitAppearance: 'none',
          background: 'var(--surface-alt)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.65rem 2.25rem 0.65rem 0.85rem',
          fontSize: '0.9rem',
          fontFamily: 'inherit',
          color: value ? 'var(--ios-text)' : 'var(--text-secondary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {placeholder && <option value="" disabled hidden>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown
        size={16}
        color="#999"
        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
      />
    </div>
  );
}

const DropdownIndicator = (props) => (
  <div {...props.innerProps} style={{ padding: '0 8px', display: 'flex', alignItems: 'center' }}>
    <ChevronDown size={16} color={props.isFocused ? 'var(--ios-olive)' : '#999'} />
  </div>
);

const reactSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--surface-alt)',
    border: state.isFocused ? '1px solid var(--ios-olive)' : '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.2rem',
    boxShadow: state.isFocused ? '0 0 0 1px var(--ios-olive)' : 'none',
    '&:hover': { border: '1px solid var(--ios-olive)' },
    minHeight: '44px',
    cursor: 'pointer',
  }),
  valueContainer: (provided) => ({ ...provided, padding: '0 0.5rem' }),
  input: (provided) => ({ ...provided, margin: 0, padding: 0, color: 'var(--ios-text)', fontFamily: 'inherit', fontSize: '0.9rem' }),
  placeholder: (provided) => ({ ...provided, color: 'var(--text-secondary)', fontSize: '0.9rem' }),
  singleValue: (provided) => ({ ...provided, color: 'var(--ios-text)', fontSize: '0.9rem' }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--radius-sm)',
    marginTop: '4px',
    padding: '0.5rem',
    boxShadow: 'var(--shadow-3)',
    border: '1px solid var(--border)',
    zIndex: 9999,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 0,
    backgroundColor: 'transparent',
    '::-webkit-scrollbar': { width: '6px' },
    '::-webkit-scrollbar-track': { background: 'transparent' },
    '::-webkit-scrollbar-thumb': { background: '#ddd', borderRadius: '3px' },
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? 'var(--ios-olive)' : state.isFocused ? 'var(--ios-olive-soft)' : 'transparent',
    color: state.isSelected ? 'white' : 'var(--ios-text)',
    padding: '0.6rem 1rem',
    borderRadius: 'calc(var(--radius-sm) - 2px)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    marginBottom: '2px',
    '&:active': { backgroundColor: 'var(--ios-olive)', color: 'white' },
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (provided) => ({ ...provided, padding: '0 0.5rem', color: '#999' }),
};
