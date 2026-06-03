'use client';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="agora-btn"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--gold)',
        background: 'none',
        border: '1px solid var(--border-card)',
        borderRadius: 4,
        padding: '8px 12px',
        cursor: 'pointer',
        letterSpacing: '.5px',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all .2s',
        flexShrink: 0,
      }}
    >
      {theme === 'dark' ? '☀ Day' : '◑ Night'}
    </button>
  );
}
