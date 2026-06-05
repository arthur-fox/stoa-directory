'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import MemberGrid from '@/components/MemberGrid';
import ProjectGrid from '@/components/ProjectGrid';
import type { ProjectListItem } from '@/components/ProjectGrid';
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
import ThemeToggle from '@/components/ThemeToggle';
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
  if (typeof window === 'undefined') return 'members';
  const params = new URLSearchParams(window.location.search);
  return params.get('view') === 'projects' ? 'projects' : 'members';
}

/** Greek column SVG silhouette — purely decorative */
const Column = () => (
  <svg width="28" height="110" viewBox="0 0 28 110" aria-hidden="true">
    <rect x="0"  y="0"  width="28" height="5"  rx="1" className="agora-col" />
    <rect x="3"  y="5"  width="22" height="3"  rx="1" className="agora-col" />
    <rect x="5"  y="8"  width="6"  height="82" rx="2" className="agora-col" />
    <rect x="11" y="8"  width="6"  height="82" rx="2" className="agora-col" style={{ opacity: 'calc(var(--col-opacity) * 0.7)' }} />
    <rect x="17" y="8"  width="6"  height="82" rx="2" className="agora-col" />
    <rect x="3"  y="90" width="22" height="3"  rx="1" className="agora-col" />
    <rect x="0"  y="93" width="28" height="5"  rx="1" className="agora-col" />
    <rect x="0"  y="98" width="28" height="6"        className="agora-col" />
  </svg>
);

/** Initials from a full name */
function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

/** Small avatar used in feedback cards */
function FbAvatar({ name, avatar, size = 28 }: { name: string; avatar?: string | null; size?: number }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="rounded-full object-cover border-[1.5px] border-avatar shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full shrink-0 border-[1.5px] border-avatar bg-avatar flex items-center justify-center font-display font-medium"
      style={{ width: size, height: size, fontSize: size * 0.38, color: 'var(--avatar-text)' }}
    >
      {initials(name)}
    </div>
  );
}

export default function Home() {
  const [members, setMembers]           = useState<Member[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loggedIn, setLoggedIn]         = useState(false);
  const [feedbackProjects, setFeedbackProjects] = useState<FeedbackProject[]>([]);

  // ── View toggle (members / projects) ──
  const [viewMode, setViewMode]         = useState<ViewMode>(() => getViewModeFromUrl());

  // ── Project view filters ──
  const [feedbackOnly, setFeedbackOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [projectSearch, setProjectSearch] = useState('');

  // ── Member view filters (FilterBar) ──
  const [filters, setFilters]           = useState<Filters>(emptyFilters);
  const [sort, setSort]                 = useState<SortKey>(defaultSort);
  const [filtersOpen, setFiltersOpen]   = useState(false);

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

  // ── Project view derived lists ──
  const projectItems = useMemo<ProjectListItem[]>(() => {
    return members
      .flatMap((member) =>
        member.projects.map((project) => ({ project, member: { name: member.name, slug: member.slug } }))
      )
      .sort((a, b) => {
        const byTitle = a.project.title.localeCompare(b.project.title, undefined, { sensitivity: 'base' });
        if (byTitle !== 0) return byTitle;
        const byMember = a.member.name.localeCompare(b.member.name, undefined, { sensitivity: 'base' });
        if (byMember !== 0) return byMember;
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
      if (feedbackOnly && !project.seekingFeedback) return false;
      if (statusFilter !== 'all' && project.status !== statusFilter) return false;
      if (query) {
        const text = [
          project.title, project.description, project.feedbackPrompt,
          project.seekingFeedback ? 'feedback wanted' : '',
          project.status, formatStatusLabel(project.status),
          project.tags.join(' '), project.type, member.name,
        ].join(' ').toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [feedbackOnly, projectItems, projectSearch, statusFilter]);

  // ── Member view derived list ──
  const filteredMembers = useMemo(
    () => sortMembers(filterMembers(members, filters), sort),
    [members, filters, sort],
  );
  const filtersActive = isFilterActive(filters);

  useEffect(() => {
    function handlePopState() {
      setViewMode(getViewModeFromUrl());
    }
    window.addEventListener('popstate', handlePopState);

    async function init() {
      const [{ data: { session } }, { data: membersData }] = await Promise.all([
        supabase.auth.getSession(),
        supabase
          .from('members')
          .select('*, projects(*)')
          .order('listed_at', { ascending: false })
          .order('name', { ascending: true }),
      ]);
      const isLoggedIn = !!session;
      setLoggedIn(isLoggedIn);
      const allMembers = (membersData ?? []).map(toMember);
      setMembers(allMembers.filter((m) => m.bio.trim() || m.projects.length > 0));
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
    <main className="bg-background min-h-screen">

      {/* ══ Header ══════════════════════════════════════════════════ */}
      <header className="relative px-10 pt-8 pb-6 border-b border-header overflow-hidden">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'var(--bar-gradient)' }} />

        {/* Column silhouettes — masked out in the centre so they don't overlap the text */}
        <div
          className="absolute top-0 left-0 right-0 bottom-0 flex justify-between items-start px-6 pointer-events-none"
          style={{
            maskImage: 'linear-gradient(to right, black 0%, black 18%, transparent 32%, transparent 68%, black 82%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 0%, black 18%, transparent 32%, transparent 68%, black 82%, black 100%)',
          }}
        >
          {Array.from({ length: 10 }, (_, i) => <Column key={i} />)}
        </div>

        {/* Content */}
        <div className="relative max-w-[1280px] mx-auto">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-[10px] mb-2">
                <span className="text-[22px]">🏛️</span>
                <h1 className="font-display text-[30px] font-normal text-foreground m-0 tracking-[.3px]">
                  Stoa Directory
                </h1>
              </div>
              <p className="font-sans text-[13px] text-muted m-0">
                Meet the people in our community and what they&apos;re building.
              </p>
            </div>

            {/* Header buttons */}
            <div className="flex gap-2 items-center shrink-0">
              <ThemeToggle />
              <Link
                href={loggedIn ? '/dashboard' : '/login'}
                className="agora-btn font-sans text-[11px] font-medium text-gold bg-transparent border border-card rounded px-[14px] py-2 tracking-[.5px] uppercase no-underline whitespace-nowrap inline-block"
              >
                {loggedIn ? 'Edit profile →' : 'Member login →'}
              </Link>
            </div>
          </div>

          {/* Gold rule */}
          <div className="mt-5 h-[1px]" style={{ background: 'var(--rule-gradient)' }} />
        </div>
      </header>

      {/* ══ Body ═════════════════════════════════════════════════════ */}
      <div className="max-w-[1280px] mx-auto px-10 pt-7 pb-14">

        {/* Section label + view toggle */}
        <div className="flex items-center gap-[10px] mb-5">
          <span className="font-sans text-[10px] font-semibold text-muted uppercase tracking-[2px] whitespace-nowrap">
            {viewMode === 'members' ? 'Members' : 'Projects'}
          </span>
          <div className="flex-1 h-[1px] bg-section" />

          {/* Members / Projects toggle */}
          <div className="inline-flex rounded-[6px] border border-card bg-well p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => updateViewMode('members')}
              className={`rounded-[4px] px-3 py-1 font-sans text-[11px] font-medium transition-colors ${
                viewMode === 'members'
                  ? 'bg-surface text-foreground'
                  : 'text-muted hover:text-foreground bg-transparent'
              }`}
            >
              Members
            </button>
            <button
              type="button"
              onClick={() => updateViewMode('projects')}
              className={`rounded-[4px] px-3 py-1 font-sans text-[11px] font-medium transition-colors ${
                viewMode === 'projects'
                  ? 'bg-surface text-foreground'
                  : 'text-muted hover:text-foreground bg-transparent'
              }`}
            >
              Projects
            </button>
          </div>
        </div>

        {/* Project view inline filters */}
        {!loading && viewMode === 'projects' && (
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="agora-input"
              style={{ width: 'auto' }}
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{formatStatusLabel(status)}</option>
              ))}
            </select>
            <input
              type="search"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              placeholder="Search projects…"
              className="agora-input"
              style={{ width: 224 }}
            />
            <label className="flex items-center gap-2 font-sans text-[12px] text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={feedbackOnly}
                onChange={(e) => setFeedbackOnly(e.target.checked)}
                className="h-4 w-4 rounded border-card"
              />
              Feedback wanted
            </label>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-40 rounded-[6px] bg-skeleton animate-pulse" />
            ))}
          </div>
        ) : viewMode === 'projects' ? (
          <ProjectGrid items={filteredProjectItems} />
        ) : (
          <>
            {/* Search & filter toggle */}
            {!loading && members.length > 0 && (
              <div className="flex items-center justify-between mb-4">
                <span className="font-sans text-[12px] text-muted">
                  {filtersActive
                    ? `Showing ${filteredMembers.length} of ${members.length} members`
                    : `${members.length} members`}
                </span>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(o => !o)}
                  className={`font-sans text-[11px] font-medium flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${
                    filtersOpen || filtersActive
                      ? 'border-gold text-gold bg-transparent'
                      : 'border-card text-muted bg-transparent hover:border-gold hover:text-gold'
                  }`}
                >
                  {filtersOpen ? '✕ Hide filters' : '⌕ Search & filter'}
                  {!filtersOpen && filtersActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  )}
                </button>
              </div>
            )}

            {/* Collapsible FilterBar */}
            {filtersOpen && (
              <FilterBar
                members={members}
                filters={filters}
                onChange={setFilters}
                sort={sort}
                onSortChange={setSort}
                onClear={() => { setFilters(emptyFilters); }}
                total={members.length}
                resultCount={filteredMembers.length}
              />
            )}

            {filtersActive && filteredMembers.length === 0 ? (
              <div className="rounded-[6px] border border-dashed border-section py-20 text-center">
                <p className="font-sans text-[13px] text-secondary">
                  No members match these filters.
                </p>
                <button
                  type="button"
                  onClick={() => setFilters(emptyFilters)}
                  className="mt-2 font-sans text-[12px] text-gold bg-transparent border-none cursor-pointer hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <MemberGrid members={filteredMembers} />
            )}
          </>
        )}

        {/* Seeking Feedback — community-only, member view only */}
        {viewMode === 'members' && loggedIn && feedbackProjects.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-[10px] mb-3">
              <span className="font-sans text-[10px] font-semibold text-gold uppercase tracking-[2px] whitespace-nowrap">
                Seeking Feedback
              </span>
              <div className="flex-1 h-[1px] bg-section" />
            </div>
            <p className="font-sans text-[12px] text-muted mb-4">
              These members are looking for input from the community.
            </p>

            <div className="grid grid-cols-4 gap-3">
              {feedbackProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}#feedback`}
                  className="feedback-card block bg-surface border border-card rounded-[6px] p-5 no-underline"
                >
                  <div className="flex gap-[9px] items-center mb-[10px]">
                    <FbAvatar name={project.member.name} avatar={project.member.avatar} />
                    <div>
                      <div className="font-sans text-[10px] text-muted uppercase tracking-[.5px]">
                        {project.member.name}
                      </div>
                      <div className="font-display text-[16px] font-medium text-foreground">
                        {project.title}
                      </div>
                    </div>
                  </div>
                  <p className="font-sans text-[12px] text-secondary m-0 leading-[1.65]">
                    {project.feedback_prompt || project.description}
                  </p>
                  <span className="agora-btn inline-block mt-[14px] font-sans text-[11px] font-medium text-gold bg-transparent border border-card rounded px-[14px] py-1.5 tracking-[.5px] uppercase">
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
