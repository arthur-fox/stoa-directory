'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AgoraHeader from '@/components/AgoraHeader';

const ff = 'var(--font-space-grotesk), system-ui, sans-serif';
const fd = 'var(--font-cormorant), Georgia, serif';

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
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
        <AgoraHeader />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px', width: '100%' }}>
          <div className="agora-card" style={{ height: 200, opacity: 0.5 }} />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
        <AgoraHeader />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px', width: '100%' }}>
          <Link href="/" style={{ fontFamily: ff, fontSize: 13, color: 'var(--gold)', textDecoration: 'none' }}>← Directory</Link>
          <p style={{ fontFamily: ff, fontSize: 13, color: 'var(--text-secondary)', marginTop: 32 }}>Project not found.</p>
        </div>
      </div>
    );
  }

  const isOwner = !!myMemberId && myMemberId === project.member?.id;
  const canGiveFeedback = loggedIn && !isOwner && project.seeking_feedback && !!myMemberId;

  const statusLabel = project.status === 'live' ? 'Live' : 'WIP';
  const statusColor = project.status === 'live' ? '#4ade80' : '#fbbf24';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      <AgoraHeader />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px', width: '100%' }}>

        {project.member && (
          <Link
            href={`/members/${project.member.slug}`}
            style={{ fontFamily: ff, fontSize: 12, color: 'var(--gold)', textDecoration: 'none', letterSpacing: '.3px' }}
          >
            ← {project.member.name}
          </Link>
        )}

        {/* Project card */}
        <div className="agora-card" style={{ padding: 32, marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: fd, fontSize: 26, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
                {project.title}
              </h1>
              {project.member && (
                <Link
                  href={`/members/${project.member.slug}`}
                  style={{ fontFamily: ff, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6 }}
                >
                  {project.member.avatar ? (
                    <img src={project.member.avatar} alt={project.member.name} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--avatar-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'var(--avatar-text)', fontFamily: fd }}>
                      {project.member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {project.member.name}
                </Link>
              )}
            </div>
            <span style={{
              fontFamily: ff, fontSize: 10, fontWeight: 600, letterSpacing: '.6px', textTransform: 'uppercase',
              color: statusColor, border: `1px solid ${statusColor}`, borderRadius: 20,
              padding: '3px 10px', flexShrink: 0, opacity: 0.85,
            }}>
              {statusLabel}
            </span>
          </div>

          {project.description && (
            <p style={{ fontFamily: ff, fontSize: 14, color: 'var(--text-secondary)', marginTop: 16, lineHeight: 1.7 }}>
              {project.description}
            </p>
          )}

          {project.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {project.tags.map(tag => (
                <span key={tag} style={{
                  border: '1px solid var(--border-card)', borderRadius: 20,
                  padding: '3px 10px', fontFamily: ff, fontSize: 11, color: 'var(--text-muted)',
                }}>
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
              className="agora-btn-primary"
              style={{ display: 'inline-flex', textDecoration: 'none', marginTop: 24 }}
            >
              Visit project ↗
            </a>
          )}
        </div>

        {/* Feedback form */}
        {canGiveFeedback && (
          <div className="agora-card" style={{ padding: 24, marginTop: 16 }}>
            <h2 style={{ fontFamily: fd, fontSize: 20, fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 12px' }}>
              Give feedback
            </h2>
            {project.feedback_prompt && (
              <p style={{
                fontFamily: ff, fontSize: 13, fontStyle: 'italic',
                color: 'var(--text-secondary)', lineHeight: 1.6,
                background: 'var(--bg-chip)', border: '1px solid var(--border-section)',
                borderRadius: 6, padding: '10px 14px', margin: '0 0 16px',
              }}>
                &ldquo;{project.feedback_prompt}&rdquo;
              </p>
            )}
            {submitted ? (
              <p style={{ fontFamily: ff, fontSize: 13, color: '#4ade80' }}>✓ Feedback sent — thank you!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Category
                  </label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="agora-input">
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>
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
                  className="agora-btn-primary"
                  style={{ alignSelf: 'flex-end' }}
                >
                  {submitting ? 'Sending…' : 'Send feedback'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feedback received — owner only */}
        {isOwner && receivedFeedback.length > 0 && (
          <div className="agora-card" style={{ padding: 24, marginTop: 16 }}>
            <h2 style={{ fontFamily: fd, fontSize: 20, fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 16px' }}>
              Feedback received
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {receivedFeedback.map(fb => (
                <div key={fb.id} className="agora-chip-row" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      fontFamily: ff, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px',
                      color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 20, padding: '2px 8px', opacity: 0.85,
                    }}>
                      {CATEGORY_LABELS[fb.category] ?? fb.category}
                    </span>
                    <span style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(fb.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontFamily: ff, fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                    {fb.content}
                  </p>
                  {fb.from_member && (
                    <p style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0' }}>
                      from{' '}
                      <Link href={`/members/${fb.from_member.slug}`} style={{ color: 'var(--gold)', textDecoration: 'none' }}>
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
          <div className="agora-chip-row" style={{ padding: '16px 20px', marginTop: 16, textAlign: 'center' }}>
            <p style={{ fontFamily: ff, fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              This project is seeking feedback from Stoa members.{' '}
              <Link href="/login" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 500 }}>
                Log in to give feedback →
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
