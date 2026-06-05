'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import MemberGrid from '@/components/MemberGrid';
import FilterBar from '@/components/FilterBar';
import {
  Filters,
  SortKey,
  defaultSort,
  emptyFilters,
  filterMembers,
  sortMembers,
  isFilterActive,
} from '@/lib/filterMembers';
import Link from 'next/link';

function toMember(row: Record<string, unknown>): Member {
  const projects = ((row.projects as Record<string, unknown>[]) ?? [])
    .sort((a, b) => ((a.position as number) ?? 0) - ((b.position as number) ?? 0))
    .map((p) => ({
    id: String(p.id),
    title: String(p.title),
    description: String(p.description ?? ''),
    url: (p.url as string) ?? null,
    type: String(p.type ?? 'app'),
    tags: (p.tags as string[]) ?? [],
    visibility: (p.visibility as 'public' | 'community') ?? 'community',
    status: (p.status as 'wip' | 'live') ?? 'live',
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

interface FeedbackProject {
  id: string;
  title: string;
  description: string;
  feedback_prompt: string;
  status: string;
  member: { name: string; slug: string; avatar: string | null };
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  design: 'Design & UX',
  'idea-validation': 'Idea validation',
  growth: 'Growth',
  technical: 'Technical',
};

export default function Home() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [feedbackProjects, setFeedbackProjects] = useState<FeedbackProject[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState<SortKey>(defaultSort);

  const filteredMembers = useMemo(
    () => sortMembers(filterMembers(members, filters), sort),
    [members, filters, sort],
  );
  const filtersActive = isFilterActive(filters);

  useEffect(() => {
    async function init() {
      const [{ data: { session } }, { data: membersData }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from('members').select('*, projects(*)').order('listed_at', { ascending: false }).order('name', { ascending: true }),
      ]);
      const isLoggedIn = !!session;
      setLoggedIn(isLoggedIn);
      const allMembers = (membersData ?? []).map(toMember);
      setMembers(allMembers.filter(m => m.bio.trim() || m.projects.length > 0));
      setLoading(false);

      if (isLoggedIn) {
        const { data } = await supabase
          .from('projects')
          .select('id, title, description, feedback_prompt, status, member:member_id(name, slug, avatar)')
          .eq('seeking_feedback', true)
          .order('created_at', { ascending: false });
        setFeedbackProjects((data ?? []) as unknown as FeedbackProject[]);
      }
    }
    init();

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
          <>
            {members.length > 0 && (
              <FilterBar
                members={members}
                filters={filters}
                onChange={setFilters}
                sort={sort}
                onSortChange={setSort}
                onClear={() => setFilters(emptyFilters)}
                total={members.length}
                resultCount={filteredMembers.length}
              />
            )}
            {filtersActive && filteredMembers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 py-20 text-center">
                <p className="text-sm font-medium text-zinc-600">
                  No members match these filters.
                </p>
                <button
                  type="button"
                  onClick={() => setFilters(emptyFilters)}
                  className="mt-2 text-sm font-medium text-violet-600 hover:text-violet-700 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <MemberGrid members={filteredMembers} />
            )}
          </>
        )}

        {/* Seeking feedback — community-only section */}
        {loggedIn && feedbackProjects.length > 0 && (
          <div className="mt-20">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Seeking feedback</h2>
              <p className="mt-1 text-sm text-zinc-500">
                These members are looking for input from the community.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {feedbackProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/members/${project.member.slug}`}
                  className="flex flex-col gap-2 rounded-xl border border-violet-100 bg-violet-50/50 p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    {project.member.avatar ? (
                      <img src={project.member.avatar} alt={project.member.name} className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-200 text-xs font-semibold text-violet-700">
                        {project.member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-medium text-violet-700">{project.member.name}</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">{project.title}</p>
                  {project.feedback_prompt ? (
                    <p className="line-clamp-2 text-xs italic text-violet-600">&ldquo;{project.feedback_prompt}&rdquo;</p>
                  ) : project.description ? (
                    <p className="line-clamp-2 text-xs text-zinc-500">{project.description}</p>
                  ) : null}
                  <span className="mt-auto self-start rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">
                    Give feedback →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
