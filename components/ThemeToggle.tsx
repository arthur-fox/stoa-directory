'use client';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="agora-btn font-sans text-[11px] font-medium text-gold bg-transparent border border-card rounded px-3 py-2 cursor-pointer tracking-[.5px] uppercase flex items-center gap-1.5 shrink-0"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀ Day' : '◑ Night'}
    </button>
  );
}
