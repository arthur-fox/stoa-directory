'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AgoraHeader from '@/components/AgoraHeader';

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

const CATEGORIES = [
  { value: 'general',          label: 'General feedback' },
  { value: 'design',           label: 'Design & UX' },
  { value: 'idea-validation',  label: 'Idea validation' },
  { value: 'growth',           label: 'Growth & traction' },
  { value: 'technical',        label: 'Technical' },
];
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.label])
);

export default function ProjectDetailClient({ id }: { id: string }) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);

  const [category, setCategory] = useState('general');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

        if (myId && (data as unknown as ProjectDetail).member?.id === myId) {
          const { data: fbData } = await supabase
            .from('feedback')
            .select('id, category, content, created_at, read_at, from_member:from_member_id(name, slug)')
            .eq('project_id', id)
            .order('created_at', { ascending: false });
          setReceivedFeedback((fbData ?? []) as unknown as FeedbackRow[]);

          const unreadIds = (fbData ?? [])
            .filter((fb: { read_at: string | null }) => !fb.read_at)
            .map((fb: { id: string }) => fb.id);
          if (unreadIds.length > 0) {
            await supabase.from('feedback').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
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
      <div className="min-h-screen bg-background flex flex-col">
        <AgoraHeader />
        <div className="max-w-[640px] mx-auto px-6 py-12 w-full">
          <div className="agora-card h-[200px] opacity-50" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AgoraHeader />
        <div className="max-w-[640px] mx-auto px-6 py-12 w-full">
          <Link href="/" className="font-sans text-[13px] text-gold no-underline">← Directory</Link>
          <p className="font-sans text-[13px] text-secondary mt-8">Project not found.</p>
        </div>
      </div>
    );
  }

  const isOwner = !!myMemberId && myMemberId === project.member?.id;
  const canGiveFeedback = loggedIn && !isOwner && project.seeking_feedback && !!myMemberId;

  const statusColor = project.status === 'live' ? '#4ade80' : '#fbbf24';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AgoraHeader />
      <div className="max-w-[640px] mx-auto px-6 py-10 w-full">

        {project.member && (
          <Link
            href={`/members/${project.member.slug}`}
            className="font-sans text-[12px] text-gold no-underline tracking-[.3px]"
          >
            ← {project.member.name}
          </Link>
        )}

        {/* Project card */}
        <div className="agora-card p-8 mt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-[26px] font-normal text-foreground m-0">
                {project.title}
              </h1>
              {project.member && (
                <Link
                  href={`/members/${project.member.slug}`}
                  className="font-sans text-[12px] text-muted no-underline inline-flex items-center gap-1.5 mt-1.5"
                >
                  {project.member.avatar ? (
                    <img src={project.member.avatar} alt={project.member.name} className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-avatar flex items-center justify-center text-[8px] font-display" style={{ color: 'var(--avatar-text)' }}>
                      {project.member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {project.member.name}
                </Link>
              )}
            </div>
            <span
              className="font-sans text-[10px] font-semibold tracking-[.6px] uppercase rounded-full px-[10px] py-[3px] shrink-0"
              style={{ color: statusColor, border: `1px solid ${statusColor}`, opacity: 0.85 }}
            >
              {project.status === 'live' ? 'Live' : 'WIP'}
            </span>
          </div>

          {project.description && (
            <p className="font-sans text-[14px] text-secondary mt-4 leading-[1.7]">
              {project.description}
            </p>
          )}

          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-[14px]">
              {project.tags.map(tag => (
                <span key={tag} className="border border-card rounded-full px-[10px] py-[3px] font-sans text-[11px] text-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="agora-btn-primary inline-flex no-underline mt-6"
            >
              Visit project ↗
            </a>
          )}
        </div>

        {/* Feedback form */}
        {canGiveFeedback && (
          <div id="feedback" className="agora-card p-6 mt-4">
            <h2 className="font-display text-[20px] font-normal text-foreground m-0 mb-3">
              Give feedback
            </h2>
            {project.feedback_prompt && (
              <p className="font-sans text-[13px] italic text-secondary leading-[1.6] bg-well border border-section rounded-[6px] px-[14px] py-[10px] m-0 mb-4">
                &ldquo;{project.feedback_prompt}&rdquo;
              </p>
            )}
            {submitted ? (
              <p className="font-sans text-[13px]" style={{ color: '#4ade80' }}>✓ Feedback sent — thank you!</p>
            ) : (
              <div className="flex flex-col gap-[10px]">
                <div>
                  <label className="font-sans text-[11px] text-muted block mb-1 uppercase tracking-[.5px]">
                    Category
                  </label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="agora-input">
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-sans text-[11px] text-muted block mb-1 uppercase tracking-[.5px]">
                    Your feedback
                  </label>
                  <textarea
                    rows={5}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Share your honest thoughts…"
                    className="agora-input"
                    style={{ resize: 'none' }}
                  />
                </div>
                <button
                  onClick={submitFeedback}
                  disabled={submitting || !content.trim()}
                  className="agora-btn-primary self-end"
                >
                  {submitting ? 'Sending…' : 'Send feedback'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feedback received — owner only */}
        {isOwner && receivedFeedback.length > 0 && (
          <div className="agora-card p-6 mt-4">
            <h2 className="font-display text-[20px] font-normal text-foreground m-0 mb-4">
              Feedback received
            </h2>
            <div className="flex flex-col gap-[10px]">
              {receivedFeedback.map(fb => (
                <div key={fb.id} className="agora-chip-row px-[14px] py-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-sans text-[10px] font-semibold uppercase tracking-[.5px] text-gold border border-gold rounded-full px-2 py-[2px] opacity-85">
                      {CATEGORY_LABELS[fb.category] ?? fb.category}
                    </span>
                    <span className="font-sans text-[11px] text-muted">
                      {new Date(fb.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-sans text-[13px] text-secondary m-0 leading-[1.6]">
                    {fb.content}
                  </p>
                  {fb.from_member && (
                    <p className="font-sans text-[11px] text-muted mt-2 m-0">
                      from{' '}
                      <Link href={`/members/${fb.from_member.slug}`} className="text-gold no-underline">
                        {fb.from_member.name}
                      </Link>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logged-out prompt */}
        {!loggedIn && project.seeking_feedback && (
          <div className="agora-chip-row px-5 py-4 mt-4 text-center">
            <p className="font-sans text-[13px] text-secondary m-0">
              This project is seeking feedback from Stoa members.{' '}
              <Link href="/login" className="text-gold no-underline font-medium">
                Log in to give feedback →
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
