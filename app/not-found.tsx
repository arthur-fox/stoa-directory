'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import MemberDetailClient from '@/components/MemberDetailClient';
import ProjectDetailClient from '@/components/ProjectDetailClient';

const ff = 'var(--font-space-grotesk), system-ui, sans-serif';
const fd = 'var(--font-cormorant), Georgia, serif';

type Route =
  | { type: 'member'; slug: string }
  | { type: 'project'; id: string }
  | null;

function matchRoute(path: string): Route {
  const memberMatch = path.match(/\/members\/([^/]+)\/?$/);
  if (memberMatch) return { type: 'member', slug: memberMatch[1] };

  const projectMatch = path.match(/\/projects\/([^/]+)\/?$/);
  if (projectMatch) return { type: 'project', id: projectMatch[1] };

  return null;
}

const subscribe = () => () => {};
const getClientPath = () => window.location.pathname;
const getServerPath = () => null;

/**
 * GitHub Pages serves this 404.html for any path without a pre-built file.
 * Intercepts /members/[slug] and /projects/[id] so new members and projects
 * work immediately after being added, without waiting for the next deploy.
 */
export default function NotFound() {
  const path = useSyncExternalStore(subscribe, getClientPath, getServerPath);

  // Pre-hydration (server snapshot) — render nothing until the client path is known.
  if (path === null) return null;

  const route = matchRoute(path);

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
