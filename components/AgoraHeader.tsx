'use client';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

interface AgoraHeaderProps {
  right?: React.ReactNode;
}

const ff = 'var(--font-space-grotesk), system-ui, sans-serif';
const fd = 'var(--font-cormorant), Georgia, serif';

export default function AgoraHeader({ right }: AgoraHeaderProps) {
  return (
    <header style={{
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-header)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      gap: 16,
      flexShrink: 0,
    }}>
      <Link href="/" style={{
        fontFamily: fd,
        fontSize: 18,
        fontWeight: 500,
        color: 'var(--text-primary)',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        letterSpacing: '.3px',
      }}>
        🏛 Stoa
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {right && (
          <span style={{ fontFamily: ff, fontSize: 12 }}>
            {right}
          </span>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
