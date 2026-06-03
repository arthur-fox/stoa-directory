'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MemberDetailClient from '@/components/MemberDetailClient';
import ProjectDetailClient from '@/components/ProjectDetailClient';

const ff = 'var(--font-space-grotesk), system-ui, sans-serif';
const fd = 'var(--font-cormorant), Georgia, serif';

/**
 * GitHub Pages serves this 404.html for any path without a pre-built file.
 * Intercepts /members/[slug] and /projects/[id] so new members and projects
 * work immediately after being added, without waiting for the next deploy.
 */
export default function NotFound() {
  const [route, setRoute] = useState<{ type: 'member'; slug: string } | { type: 'project'; id: string } | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const memberMatch = path.match(/\/members\/([^/]+)\/?$/);
    const projectMatch = path.match(/\/projects\/([^/]+)\/?$/);

    if (memberMatch) setRoute({ type: 'member', slug: memberMatch[1] });
    else if (projectMatch) setRoute({ type: 'project', id: projectMatch[1] });

    setChecked(true);
  }, []);

  if (!checked) return null;

  if (route?.type === 'member') return <MemberDetailClient slug={route.slug} />;
  if (route?.type === 'project') return <ProjectDetailClient id={route.id} />;

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    }}>
      <p style={{ fontSize: 48, margin: 0 }}>🏛️</p>
      <h1 style={{ fontFamily: fd, fontSize: 28, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
        Page not found
      </h1>
      <p style={{ fontFamily: ff, fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
        That page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        style={{ fontFamily: ff, fontSize: 12, color: 'var(--gold)', textDecoration: 'none', letterSpacing: '.3px' }}
      >
        ← Back to directory
      </Link>
    </main>
  );
}
