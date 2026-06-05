'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface ProjectDetail {
  id: string;
  title: string;
  description: string;
  url: string | null;
  status: 'wip' | 'live';
  visibility: 'public' | 'community';
  seeking_feedback: boolean;
  feedback_prompt: string;
  tags: string[];
  member: {
    id: string;
    name: string;
    slug: string;
    avatar: string | null;
  };
}

interface FeedbackRow {
  id: string;
  category: string;
  content: string;
  created_at: string;
  read_at: string | null;
  from_member: { name: string; slug: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  live: 'bg-emerald-50 text-emerald-700',
  wip:  'bg-amber-50 text-amber-700',
};
const STATUS_LABELS: Record<string, string> = {
  live: 'Live', wip: 'WIP',
};
const CATEGORIES = [
  { value: 'general',         label: 'General feedback' },
  { value: 'design',          label: 'Design & UX' },
  { value: 'idea-validation', label: 'Idea validation' },
  { value: 'growth',          label: 'Growth & traction' },
  { value: 'technical',       label: 'Technical' },
];
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.label])
);

export default function ProjectDetailClient({ id }: { id: string }) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);

  // Feedback form
  const [category, setCategory] = useState('general');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Feedback received (project owner only)
  const [receivedFeedback, setReceivedFeedback] = useState<FeedbackRow[]>([]);

  useEffect(() => {
    async function init() {
      const [{ data: { session } }, { data }] = await Promise.all([
        supabase.auth.getSession(),
        supabase
          .from('projects')
          .select('*, member:member_id(id, name, slug, avatar)')
          .eq('id', id)
          .maybeSingle(),
      ]);

      setLoggedIn(!!session);
      setProject(data as unknown as ProjectDetail ?? null);
      setLoading(false);

      if (session && data) {
        const { data: me } = await supabase
          .from('members')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        const myId = me?.id ?? null;
        setMyMemberId(myId);

        // If owner, fetch feedback for this project
        if (myId && (data as unknown as ProjectDetail).member?.id === myId) {
          const { data: fbData } = await supabase
            .from('feedback')
            .select('id, category, content, created_at, read_at, from_member:from_member_id(name, slug)')
            .eq('project_id', id)
            .order('created_at', { ascending: false });
          setReceivedFeedback((fbData ?? []) as unknown as FeedbackRow[]);

          // Mark all unread as read
          const unreadIds = (fbData ?? [])
            .filter((fb: { read_at: string | null }) => !fb.read_at)
            .map((fb: { id: string }) => fb.id);
          if (unreadIds.length > 0) {
            await supabase
              .from('feedback')
              .update({ read_at: new Date().toISOString() })
              .in('id', unreadIds);
          }
        }
      }
    }
    init();
  }, [id]);

  async function submitFeedback() {
    if (!project || !content.trim() || !myMemberId) return;
    setSubmitting(true);
    const { error } = await supabase.from('feedback').insert({
      project_id: project.id,
      from_member_id: myMemberId,
      category,
      content: content.trim(),
    });
    setSubmitting(false);
    if (!error) {
      setSubmitted(true);
      setContent('');
      setCategory('general');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <div className="h-64 animate-pulse rounded-xl bg-zinc-100" />
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-700">← Directory</Link>
          <p className="mt-8 text-zinc-500">Project not found.</p>
        </div>
      </main>
    );
  }

  const isOwner = !!myMemberId && myMemberId === project.member?.id;
  const canGiveFeedback = loggedIn && !isOwner && project.seeking_feedback && !!myMemberId;

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">

        {/* Back link */}
        <Link
          href={`/members/${project.member?.slug}`}
          className="mb-8 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700"
        >
          ← {project.member?.name}
        </Link>

        {/* Project card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-zinc-900">{project.title}</h1>
              {project.member && (
                <Link
                  href={`/members/${project.member.slug}`}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700"
                >
                  {project.member.avatar ? (
                    <img src={project.member.avatar} alt={project.member.name} className="h-4 w-4 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-[9px] font-semibold text-zinc-600">
                      {project.member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {project.member.name}
                </Link>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[project.status]}`}>
                {STATUS_LABELS[project.status]}
              </span>
            </div>
          </div>

          {project.description && (
            <p className="mt-4 text-zinc-600">{project.description}</p>
          )}

          {project.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {project.tags.map(tag => (
                <span key={tag} className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500">{tag}</span>
              ))}
            </div>
          )}

          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Visit project ↗
            </a>
          )}
        </div>

        {/* Feedback form — for non-owners when seeking_feedback is true */}
        {canGiveFeedback && (
          <section id="feedback" className="mt-6 rounded-xl border border-violet-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-zinc-900">Give feedback</h2>
            {project.feedback_prompt && (
              <p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-sm italic text-violet-700">
                &ldquo;{project.feedback_prompt}&rdquo;
              </p>
            )}
            {submitted ? (
              <p className="mt-4 text-sm text-green-600">✓ Feedback sent — thank you!</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Your feedback</label>
                  <textarea
                    rows={5}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Share your honest thoughts…"
                    className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  />
                </div>
                <button
                  onClick={submitFeedback}
                  disabled={submitting || !content.trim()}
                  className="self-end rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : 'Send feedback'}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Feedback received — owner only */}
        {isOwner && receivedFeedback.length > 0 && (
          <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-zinc-900">Feedback received</h2>
            <div className="flex flex-col gap-3">
              {receivedFeedback.map(fb => (
                <div key={fb.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">
                      {CATEGORY_LABELS[fb.category] ?? fb.category}
                    </span>
                    <span className="text-xs text-zinc-300">
                      {new Date(fb.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700">{fb.content}</p>
                  {fb.from_member && (
                    <p className="mt-2 text-xs text-zinc-400">
                      from{' '}
                      <Link href={`/members/${fb.from_member.slug}`} className="hover:text-zinc-700 hover:underline">
                        {fb.from_member.name}
                      </Link>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Logged-out prompt to give feedback */}
        {!loggedIn && project.seeking_feedback && (
          <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50 p-5 text-center">
            <p className="text-sm text-violet-700">
              This project is seeking feedback from Stoa members.{' '}
              <Link href="/login" className="font-medium underline hover:text-violet-900">
                Log in to give feedback →
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
