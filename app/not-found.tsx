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
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <p className="text-[48px] m-0">🏛️</p>
      <h1 className="font-display text-[28px] font-normal text-foreground m-0">
        Page not found
      </h1>
      <p className="font-sans text-[13px] text-secondary m-0">
        That page doesn&apos;t exist.
      </p>
      <Link href="/" className="font-sans text-[12px] text-gold no-underline tracking-[.3px]">
        ← Back to directory
      </Link>
    </main>
  );
}
