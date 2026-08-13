import React from 'react';

const PADDING = {
  none: '0',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
};

/**
 * Shared card/panel primitive. Replaces .ios-card / .glass-panel plus the
 * scattered inline style={{borderRadius, boxShadow}} overrides that let
 * sibling cards drift to different radii (e.g. 20px vs 24px on the same
 * page). Radius/elevation always come from the token scale.
 */
const Card = React.forwardRef(function Card(
  { as: Tag = 'div', padding = 'md', elevated = true, interactive = false, className = '', style, children, ...rest },
  ref
) {
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: elevated ? 'var(--shadow-2)' : 'var(--shadow-1)',
        padding: PADDING[padding] ?? PADDING.md,
        cursor: interactive ? 'pointer' : undefined,
        transition: interactive ? 'transform 0.15s ease, box-shadow 0.15s ease' : undefined,
        ...style,
      }}
      onMouseEnter={interactive ? (e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-3)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      } : undefined}
      onMouseLeave={interactive ? (e) => {
        e.currentTarget.style.boxShadow = elevated ? 'var(--shadow-2)' : 'var(--shadow-1)';
        e.currentTarget.style.transform = 'translateY(0)';
      } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export default Card;
