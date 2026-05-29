'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MemberDetailClient from '@/components/MemberDetailClient';

/**
 * GitHub Pages serves this 404.html for any path without a pre-built file.
 * If the path looks like /stoa-directory/members/[slug], render the member
 * detail page client-side — this covers members who joined after the last deploy.
 */
export default function NotFound() {
  const [slug, setSlug] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const match = window.location.pathname.match(/\/members\/([^/]+)\/?$/);
    setSlug(match ? match[1] : null);
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (slug) {
    return <MemberDetailClient slug={slug} />;
  }

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
