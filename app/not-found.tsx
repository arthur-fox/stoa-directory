'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import MemberDetailClient from '@/components/MemberDetailClient';
import ProjectDetailClient from '@/components/ProjectDetailClient';

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

// The pathname is a browser-only value. useSyncExternalStore returns the
// server snapshot (null) during prerender and hydration, then the client
// snapshot once mounted — hydration-safe, and without setting state in an
// effect. The location never changes for a given 404 render, so the
// subscribe callback is a no-op.
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
      <p className="text-5xl">🏛️</p>
      <h1 className="text-2xl font-bold text-zinc-900">Page not found</h1>
      <p className="text-sm text-zinc-400">That page doesn&apos;t exist.</p>
      <Link href="/" className="text-sm text-violet-600 hover:underline">
        ← Back to directory
      </Link>
    </main>
  );
}
