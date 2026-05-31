'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import MemberGrid from '@/components/MemberGrid';
import ProjectGrid from '@/components/ProjectGrid';
import type { ProjectListItem } from '@/components/ProjectGrid';
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
    feedbackPrompt: String(p.feedback_prompt ?? ''),
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

type ViewMode = 'members' | 'projects';
type StatusFilter = 'all' | string;

const STATUS_LABELS: Record<string, string> = {
  live: 'Live',
  wip: 'Work in progress',
};

function formatStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status.replaceAll('-', ' ');
}

function getViewModeFromUrl(): ViewMode {
  if (typeof window === 'undefined') {
    return 'members';
  }

  const params = new URLSearchParams(window.location.search);
  return params.get('view') === 'projects' ? 'projects' : 'members';
}

export default function Home() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [feedbackProjects, setFeedbackProjects] = useState<FeedbackProject[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(() => getViewModeFromUrl());
  const [feedbackOnly, setFeedbackOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [projectSearch, setProjectSearch] = useState('');

  function updateViewMode(mode: ViewMode) {
    setViewMode(mode);

    const url = new URL(window.location.href);
    if (mode === 'projects') {
      url.searchParams.set('view', 'projects');
    } else {
      url.searchParams.delete('view');
    }

    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  const projectItems = useMemo<ProjectListItem[]>(() => {
    return members
      .flatMap((member) =>
        member.projects.map((project) => ({
          project,
          member: {
            name: member.name,
            slug: member.slug,
          },
        }))
      )
      .sort((a, b) => {
        const byTitle = a.project.title.localeCompare(b.project.title, undefined, { sensitivity: 'base' });

        if (byTitle !== 0) {
          return byTitle;
        }

        const byMember = a.member.name.localeCompare(b.member.name, undefined, { sensitivity: 'base' });

        if (byMember !== 0) {
          return byMember;
        }

        return a.project.id.localeCompare(b.project.id);
      });
  }, [members]);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(projectItems.map(({ project }) => project.status))).sort((a, b) =>
      formatStatusLabel(a).localeCompare(formatStatusLabel(b), undefined, { sensitivity: 'base' })
    );
  }, [projectItems]);

  const filteredProjectItems = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();

    return projectItems.filter(({ project, member }) => {
      if (feedbackOnly && !project.seekingFeedback) {
        return false;
      }

      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false;
      }

      if (query) {
        const searchableText = [
          project.title,
          project.description,
          project.feedbackPrompt,
          project.seekingFeedback ? 'feedback wanted' : '',
          project.status,
          formatStatusLabel(project.status),
          project.tags.join(' '),
          project.type,
          member.name,
        ]
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [feedbackOnly, projectItems, projectSearch, statusFilter]);

  useEffect(() => {
    function handlePopState() {
      setViewMode(getViewModeFromUrl());
    }

    window.addEventListener('popstate', handlePopState);

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
    return () => {
      window.removeEventListener('popstate', handlePopState);
      subscription.unsubscribe();
    };
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

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            <button
              type="button"
              onClick={() => updateViewMode('members')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'members'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Member View
            </button>
            <button
              type="button"
              onClick={() => updateViewMode('projects')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'projects'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Project View
            </button>
          </div>

          {viewMode === 'projects' && (
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-8 border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700"
              >
                <option value="all">Show all</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>

              <input
                type="search"
                value={projectSearch}
                onChange={(event) => setProjectSearch(event.target.value)}
                placeholder="Default Search"
                className="h-8 w-56 border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 placeholder:text-zinc-400"
              />

              <label className="flex h-9 items-center gap-2 px-1 text-sm font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={feedbackOnly}
                  onChange={(event) => setFeedbackOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 accent-violet-600"
                />
                Feedback Wanted
              </label>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        ) : viewMode === 'projects' ? (
          <ProjectGrid items={filteredProjectItems} />
        ) : (
          <MemberGrid members={members} />
        )}

        {/* Seeking feedback — community-only section */}
        {viewMode === 'members' && loggedIn && feedbackProjects.length > 0 && (
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
