import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({
  variant = 'icon',
  className = '',
  size = 18,
  showLabel = false,
  style = {},
}) {
  const { theme, isDark, toggleTheme } = useTheme();

  const title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  const label = isDark ? 'Light Mode' : 'Dark Mode';

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`theme-toggle-pill ${className}`}
        title={title}
        aria-label={title}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.4rem 0.85rem',
          borderRadius: '9999px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--ios-text)',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: 'var(--shadow-1)',
          ...style,
        }}
      >
        {isDark ? (
          <Sun size={size} className="text-amber-400" />
        ) : (
          <Moon size={size} className="text-slate-700" />
        )}
        <span>{label}</span>
      </button>
    );
  }

  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`theme-toggle-floating ${className}`}
        title={title}
        aria-label={title}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '5.5rem', // Left of AI Chatbot widget
          zIndex: 99,
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface)',
          color: 'var(--ios-text)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-3)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isDark ? (
          <Sun size={size} className="text-amber-400" />
        ) : (
          <Moon size={size} className="text-slate-700" />
        )}
      </button>
    );
  }

  // Default 'icon' button
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      title={title}
      aria-label={title}
      style={{
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-alt)',
        border: '1px solid var(--border)',
        color: 'var(--ios-text)',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: 0,
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.borderColor = 'var(--ios-olive)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {isDark ? (
        <Sun size={size} className="text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon size={size} className="text-slate-600 transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
      {showLabel && (
        <span style={{ marginLeft: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
          {label}
        </span>
      )}
    </button>
  );
}
