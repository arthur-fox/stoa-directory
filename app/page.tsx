'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import MemberGrid from '@/components/MemberGrid';
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
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Small avatar used in feedback cards */
function FbAvatar({ name, avatar, size = 28 }: { name: string; avatar?: string | null; size?: number }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          border: '1.5px solid var(--avatar-border)', flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: '1.5px solid var(--avatar-border)',
      background: 'var(--avatar-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-cormorant), Georgia, serif',
      fontSize: size * 0.38, fontWeight: 500,
      color: 'var(--avatar-text)',
    }}>
      {initials(name)}
    </div>
  );
}

export default function Home() {
  const [members, setMembers]               = useState<Member[]>([]);
  const [loading, setLoading]               = useState(true);
  const [loggedIn, setLoggedIn]             = useState(false);
  const [feedbackProjects, setFeedbackProjects] = useState<FeedbackProject[]>([]);

  useEffect(() => {
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
    return () => subscription.unsubscribe();
  }, []);

  const ff = 'var(--font-space-grotesk), system-ui, sans-serif';
  const fd = 'var(--font-cormorant), Georgia, serif';

  return (
    <main style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>

      {/* ══ Header ══════════════════════════════════════════════════ */}
      <header style={{
        position: 'relative',
        padding: '32px 40px 24px',
        borderBottom: '1px solid var(--border-header)',
        overflow: 'hidden',
      }}>
        {/* Top accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'var(--bar-gradient)',
        }} />

        {/* Column silhouettes */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '0 24px', pointerEvents: 'none',
        }}>
          {Array.from({ length: 10 }, (_, i) => <Column key={i} />)}
        </div>

        {/* Content */}
        <div style={{ position: 'relative', maxWidth: 1020, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>🏛️</span>
                <h1 style={{
                  fontFamily: fd, fontSize: 30, fontWeight: 400,
                  color: 'var(--text-primary)', margin: 0, letterSpacing: '.3px',
                }}>
                  Stoa Member Project Directory
                </h1>
              </div>
              <p style={{ fontFamily: ff, fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Meet the people in our community and what they&apos;re building.
              </p>
            </div>

            {/* Header buttons */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <ThemeToggle />
              <Link
                href={loggedIn ? '/dashboard' : '/login'}
                className="agora-btn"
                style={{
                  fontFamily: ff, fontSize: 11, fontWeight: 500,
                  color: 'var(--gold)',
                  background: 'none',
                  border: '1px solid var(--border-card)',
                  borderRadius: 4, padding: '8px 14px',
                  letterSpacing: '.5px', textTransform: 'uppercase',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  display: 'inline-block',
                }}
              >
                {loggedIn ? 'Edit profile →' : 'Member login →'}
              </Link>
            </div>
          </div>

          {/* Gold rule */}
          <div style={{ marginTop: 20, height: 1, background: 'var(--rule-gradient)' }} />
        </div>
      </header>

      {/* ══ Body ═════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1020, margin: '0 auto', padding: '28px 40px 56px' }}>

        {/* Members section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{
            fontFamily: ff, fontSize: 10, fontWeight: 600,
            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2,
            whiteSpace: 'nowrap',
          }}>
            Members
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-section)' }} />
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                height: 160, borderRadius: 6,
                background: 'var(--skeleton-bg)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : (
          <MemberGrid members={members} />
        )}

        {/* Seeking Feedback — community-only */}
        {loggedIn && feedbackProjects.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{
                fontFamily: ff, fontSize: 10, fontWeight: 600,
                color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 2,
                whiteSpace: 'nowrap',
              }}>
                Seeking Feedback
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-section)' }} />
            </div>
            <p style={{ fontFamily: ff, fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              These members are looking for input from the community.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {feedbackProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/members/${project.member.slug}`}
                  className="feedback-card"
                  style={{
                    display: 'block',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 6, padding: 20,
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 10 }}>
                    <FbAvatar name={project.member.name} avatar={project.member.avatar} />
                    <div>
                      <div style={{
                        fontFamily: ff, fontSize: 10,
                        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5,
                      }}>
                        {project.member.name}
                      </div>
                      <div style={{
                        fontFamily: fd, fontSize: 16, fontWeight: 500,
                        color: 'var(--text-primary)',
                      }}>
                        {project.title}
                      </div>
                    </div>
                  </div>
                  <p style={{
                    fontFamily: ff, fontSize: 12,
                    color: 'var(--text-secondary)',
                    margin: 0, lineHeight: 1.65,
                  }}>
                    {project.feedback_prompt || project.description}
                  </p>
                  <span
                    className="agora-btn"
                    style={{
                      display: 'inline-block', marginTop: 14,
                      fontFamily: ff, fontSize: 11, fontWeight: 500,
                      color: 'var(--gold)', background: 'none',
                      border: '1px solid var(--border-card)',
                      borderRadius: 4, padding: '6px 14px',
                      letterSpacing: '.5px', textTransform: 'uppercase',
                    }}
                  >
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
