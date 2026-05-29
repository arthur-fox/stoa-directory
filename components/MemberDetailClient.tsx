'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Member, Project } from '@/lib/types';
import ProjectCard from '@/components/ProjectCard';

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

const CATEGORIES = [
  { value: 'general',          label: 'General feedback' },
  { value: 'design',           label: 'Design & UX' },
  { value: 'idea-validation',  label: 'Idea validation' },
  { value: 'growth',           label: 'Growth & traction' },
  { value: 'technical',        label: 'Technical' },
];

export default function MemberDetailClient({ slug }: { slug: string }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);

  // Feedback modal state
  const [feedbackProject, setFeedbackProject] = useState<Project | null>(null);
  const [category, setCategory] = useState('general');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function init() {
      const [{ data: { session } }, { data }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from('members').select('*, projects(*)').eq('slug', slug).maybeSingle(),
      ]);

      setLoggedIn(!!session);
      setMember(data ? toMember(data) : null);
      setLoading(false);

      if (session) {
        const { data: me } = await supabase
          .from('members')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        setMyMemberId(me?.id ?? null);
      }
    }
    init();
  }, [slug]);

  async function submitFeedback() {
    if (!feedbackProject || !content.trim() || !myMemberId) return;
    setSubmitting(true);
    const { error } = await supabase.from('feedback').insert({
      project_id: feedbackProject.id,
      from_member_id: myMemberId,
      category,
      content: content.trim(),
    });
    setSubmitting(false);
    if (!error) {
      setSubmitted(prev => new Set(prev).add(feedbackProject.id));
      setFeedbackProject(null);
      setContent('');
      setCategory('general');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="h-64 animate-pulse rounded-xl bg-zinc-100" />
        </div>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <Link href="/" className="mb-8 inline-flex text-sm text-zinc-400 hover:text-zinc-700">← Back to directory</Link>
          <p className="mt-8 text-zinc-500">Member not found.</p>
        </div>
      </main>
    );
  }

  // Logged-in users see all projects; logged-out only see public
  const visibleProjects = member.projects.filter(
    (p) => loggedIn || p.visibility === 'public'
  );
  const isOwner = !!myMemberId && myMemberId === member.id;
  const initials = member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Link href="/" className="mb-8 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700">
          ← Back to directory
        </Link>

        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-5">
            {member.avatar ? (
              <img src={member.avatar} alt={member.name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-600">
                {initials}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{member.name}</h1>
              {member.location && <p className="mt-0.5 text-sm text-zinc-400">{member.location}</p>}
              <div className="mt-2 flex flex-wrap gap-3">
                {member.social.website && (
                  <a href={member.social.website} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-zinc-900">Website</a>
                )}
                {member.social.twitter && (
                  <a href={`https://twitter.com/${member.social.twitter}`} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-zinc-900">Twitter</a>
                )}
                {member.social.linkedin && (
                  <a href={`https://linkedin.com/in/${member.social.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-zinc-900">LinkedIn</a>
                )}
              </div>
            </div>
          </div>
          {member.bio && <p className="mt-6 text-zinc-600">{member.bio}</p>}
          {member.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {member.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {visibleProjects.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Projects</h2>
            <div className="flex flex-col gap-3">
              {visibleProjects.map((project) => (
                <div key={project.id}>
                  <ProjectCard project={project} />
                  {/* Feedback CTA — only for logged-in non-owners on projects seeking feedback */}
                  {loggedIn && !isOwner && project.seekingFeedback && myMemberId && (
                    <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2">
                      {project.feedbackPrompt && (
                        <p className="mb-1.5 text-xs text-violet-700">&ldquo;{project.feedbackPrompt}&rdquo;</p>
                      )}
                      {submitted.has(project.id) ? (
                        <p className="text-xs text-green-600">✓ Feedback sent — thank you!</p>
                      ) : (
                        <button
                          onClick={() => { setFeedbackProject(project); setContent(''); setCategory('general'); }}
                          className="text-xs font-medium text-violet-600 hover:text-violet-800 hover:underline"
                        >
                          Give feedback on this project →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Feedback modal */}
      {feedbackProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-zinc-900">Give feedback</h3>
                <p className="mt-0.5 text-xs text-zinc-400">{feedbackProject.title} · {member.name}</p>
              </div>
              <button onClick={() => setFeedbackProject(null)} className="mt-0.5 text-zinc-400 hover:text-zinc-600">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              {feedbackProject.feedbackPrompt && (
                <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                  &ldquo;{feedbackProject.feedbackPrompt}&rdquo;
                </p>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Your feedback</label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your honest thoughts…"
                  className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setFeedbackProject(null)} className="text-sm text-zinc-400 hover:text-zinc-700">Cancel</button>
                <button
                  onClick={submitFeedback}
                  disabled={submitting || !content.trim()}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : 'Send feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
