'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import ProjectCard from '@/components/ProjectCard';
import AgoraHeader from '@/components/AgoraHeader';

const ff = 'var(--font-space-grotesk), system-ui, sans-serif';
const fd = 'var(--font-cormorant), Georgia, serif';

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

export default function MemberDetailClient({ slug }: { slug: string }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function init() {
      const [{ data: { session } }, { data }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from('members').select('*, projects(*)').eq('slug', slug).maybeSingle(),
      ]);
      setLoggedIn(!!session);
      setMember(data ? toMember(data) : null);
      setLoading(false);
    }
    init();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
        <AgoraHeader />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', width: '100%' }}>
          <div className="agora-card" style={{ height: 200, opacity: 0.5 }} />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
        <AgoraHeader />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', width: '100%' }}>
          <Link href="/" style={{ fontFamily: ff, fontSize: 13, color: 'var(--gold)', textDecoration: 'none' }}>
            ← Back to directory
          </Link>
          <p style={{ fontFamily: ff, fontSize: 13, color: 'var(--text-secondary)', marginTop: 32 }}>
            Member not found.
          </p>
        </div>
      </div>
    );
  }

  const visibleProjects = member.projects.filter(
    (p) => loggedIn || p.visibility === 'public'
  );
  const initials = member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      <AgoraHeader />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px', width: '100%' }}>

        <Link href="/" style={{ fontFamily: ff, fontSize: 12, color: 'var(--gold)', textDecoration: 'none', letterSpacing: '.3px' }}>
          ← Directory
        </Link>

        {/* Profile card */}
        <div className="agora-card" style={{ padding: 32, marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            {member.avatar ? (
              <img
                src={member.avatar}
                alt={member.name}
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--avatar-border)', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                background: 'var(--avatar-bg)', border: '1.5px solid var(--avatar-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: fd, fontSize: 22, fontWeight: 500, color: 'var(--avatar-text)',
              }}>
                {initials}
              </div>
            )}
            <div>
              <h1 style={{ fontFamily: fd, fontSize: 26, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
                {member.name}
              </h1>
              {member.location && (
                <p style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '.6px' }}>
                  {member.location}
                </p>
              )}
              {(member.social.website || member.social.twitter || member.social.linkedin) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                  {member.social.website && (
                    <a href={member.social.website} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: ff, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                      Website ↗
                    </a>
                  )}
                  {member.social.twitter && (
                    <a href={`https://twitter.com/${member.social.twitter}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: ff, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                      Twitter ↗
                    </a>
                  )}
                  {member.social.linkedin && (
                    <a href={`https://linkedin.com/in/${member.social.linkedin}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: ff, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                      LinkedIn ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {member.bio && (
            <p style={{ fontFamily: ff, fontSize: 14, color: 'var(--text-secondary)', marginTop: 20, lineHeight: 1.7 }}>
              {member.bio}
            </p>
          )}

          {member.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {member.tags.map((tag) => (
                <span key={tag} style={{
                  border: '1px solid var(--border-card)',
                  borderRadius: 20,
                  padding: '3px 10px',
                  fontFamily: ff, fontSize: 11,
                  color: 'var(--text-muted)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        {visibleProjects.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h2 style={{ fontFamily: fd, fontSize: 20, fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 14px' }}>
              Projects
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
