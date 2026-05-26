'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import MemberGrid from '@/components/MemberGrid';
import Link from 'next/link';

function toMember(row: Record<string, unknown>): Member {
  const projects = ((row.projects as Record<string, unknown>[]) ?? []).map((p) => ({
    id: String(p.id),
    title: String(p.title),
    description: String(p.description ?? ''),
    url: (p.url as string) ?? null,
    type: String(p.type ?? 'app'),
    tags: (p.tags as string[]) ?? [],
    visibility: (p.visibility as 'public' | 'community') ?? 'community',
    status: (p.status as 'active' | 'shipped' | 'wip') ?? 'active',
    thumbnail: (p.thumbnail as string) ?? null,
    seekingFeedback: Boolean(p.seeking_feedback),
  }));

  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    avatar: (row.avatar as string) ?? null,
    bio: String(row.bio ?? ''),
    location: (row.location as string) ?? null,
    social: (row.social as Member['social']) ?? {},
    tags: (row.tags as string[]) ?? [],
    visibility: (row.visibility as 'public' | 'community') ?? 'public',
    projects,
  };
}

export default function Home() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function init() {
      const [{ data: { session } }, { data: membersData }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from('members').select('*, projects(*)').order('created_at'),
      ]);
      setLoggedIn(!!session);
      setMembers((membersData ?? []).map(toMember));
      setLoading(false);
    }
    init();

    // Keep nav in sync if the user signs in/out in another tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <main className="relative min-h-screen bg-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48 bg-gradient-to-b from-violet-100 to-transparent" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
              🏛️ Stoa Member Project Directory
            </h1>
            <p className="mt-2 text-zinc-600">
              Meet the people in our community and what they&apos;re building.
            </p>
          </div>
          <Link
            href={loggedIn ? '/dashboard' : '/login'}
            className="mt-1 text-sm text-zinc-400 hover:text-zinc-700"
          >
            {loggedIn ? 'Edit profile →' : 'Member login →'}
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        ) : (
          <MemberGrid members={members} />
        )}
      </div>
    </main>
  );
}
