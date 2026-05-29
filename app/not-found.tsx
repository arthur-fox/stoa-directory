'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MemberDetailClient from '@/components/MemberDetailClient';
import ProjectDetailClient from '@/components/ProjectDetailClient';

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
