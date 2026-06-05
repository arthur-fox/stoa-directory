'use client';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

interface AgoraHeaderProps {
  right?: React.ReactNode;
}

export default function AgoraHeader({ right }: AgoraHeaderProps) {
  return (
    <header className="bg-surface border-b border-header px-6 flex items-center justify-between h-14 gap-4 shrink-0">
      <Link href="/" className="font-display text-[18px] font-medium text-foreground no-underline flex items-center gap-2 tracking-[.3px]">
        🏛 Stoa
      </Link>
      <div className="flex items-center gap-3">
        {right && (
          <span className="font-sans text-[12px]">
            {right}
          </span>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
