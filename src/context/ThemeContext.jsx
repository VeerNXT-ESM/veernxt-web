import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = 'theme';

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      // Check stored preference; default is explicitly 'light'
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('admin_theme');
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  const applyTheme = (nextTheme) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', nextTheme);
    if (nextTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
      // Keep admin_theme synced as well
      localStorage.setItem('admin_theme', nextTheme);
    } catch {
      // ignore
    }

    // Update theme-color meta tag if present
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', nextTheme === 'dark' ? '#0d1117' : '#ffffff');
    }
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (val) => {
    if (val === 'dark' || val === 'light') {
      setThemeState(val);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
