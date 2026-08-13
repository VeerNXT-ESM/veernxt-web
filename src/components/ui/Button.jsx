import React from 'react';

const VARIANT_STYLES = {
  primary: {
    background: 'var(--ios-olive)',
    color: '#ffffff',
    border: '1px solid transparent',
    boxShadow: 'var(--shadow-1)',
  },
  secondary: {
    background: 'var(--surface)',
    color: 'var(--ios-olive)',
    border: '1px solid var(--border)',
    boxShadow: 'none',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ios-text)',
    border: '1px solid transparent',
    boxShadow: 'none',
  },
  danger: {
    background: 'var(--danger)',
    color: '#ffffff',
    border: '1px solid transparent',
    boxShadow: 'var(--shadow-1)',
  },
};

const SIZE_STYLES = {
  sm: { padding: '0.4rem 0.85rem', fontSize: '0.8rem' },
  md: { padding: '0.65rem 1.25rem', fontSize: '0.9rem' },
  lg: { padding: '0.85rem 1.75rem', fontSize: '1rem' },
};

/**
 * Shared button primitive — radius/elevation come from the design tokens
 * in index.css, not per-instance inline styles, so every button in the
 * app stays visually consistent.
 */
const Button = React.forwardRef(function Button(
  { variant = 'primary', size = 'md', icon: Icon, fullWidth = false, disabled = false, className = '', style, children, ...rest },
  ref
) {
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        width: fullWidth ? '100%' : undefined,
        borderRadius: 'var(--radius-sm)',
        fontFamily: '"Quicksand", sans-serif',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        ...variantStyle,
        ...sizeStyle,
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      {...rest}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
      {children}
    </button>
  );
});

export default Button;
