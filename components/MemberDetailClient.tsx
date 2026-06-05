'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import ProjectCard from '@/components/ProjectCard';
import AgoraHeader from '@/components/AgoraHeader';

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
      <div className="min-h-screen bg-background flex flex-col">
        <AgoraHeader />
        <div className="max-w-[720px] mx-auto px-6 py-12 w-full">
          <div className="agora-card h-[200px] opacity-50" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AgoraHeader />
        <div className="max-w-[720px] mx-auto px-6 py-12 w-full">
          <Link href="/" className="font-sans text-[13px] text-gold no-underline">
            ← Back to directory
          </Link>
          <p className="font-sans text-[13px] text-secondary mt-8">
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
    <div className="min-h-screen bg-background flex flex-col">
      <AgoraHeader />
      <div className="max-w-[720px] mx-auto px-6 py-10 w-full">

        <Link href="/" className="font-sans text-[12px] text-gold no-underline tracking-[.3px]">
          ← Directory
        </Link>

        {/* Profile card */}
        <div className="agora-card p-8 mt-5">
          <div className="flex items-start gap-5">
            {member.avatar ? (
              <img
                src={member.avatar}
                alt={member.name}
                className="w-16 h-16 rounded-full object-cover border-[1.5px] border-avatar shrink-0"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full shrink-0 bg-avatar border-[1.5px] border-avatar flex items-center justify-center font-display text-[22px] font-medium"
                style={{ color: 'var(--avatar-text)' }}
              >
                {initials}
              </div>
            )}
            <div>
              <h1 className="font-display text-[26px] font-normal text-foreground m-0">
                {member.name}
              </h1>
              {member.location && (
                <p className="font-sans text-[11px] text-muted mt-1 m-0 uppercase tracking-[.6px]">
                  {member.location}
                </p>
              )}
              {(member.social.website || member.social.twitter || member.social.linkedin) && (
                <div className="flex flex-wrap gap-3 mt-[10px]">
                  {member.social.website && (
                    <a href={member.social.website} target="_blank" rel="noopener noreferrer"
                      className="font-sans text-[12px] text-secondary no-underline">
                      Website ↗
                    </a>
                  )}
                  {member.social.twitter && (
                    <a href={`https://twitter.com/${member.social.twitter}`} target="_blank" rel="noopener noreferrer"
                      className="font-sans text-[12px] text-secondary no-underline">
                      Twitter ↗
                    </a>
                  )}
                  {member.social.linkedin && (
                    <a href={`https://linkedin.com/in/${member.social.linkedin}`} target="_blank" rel="noopener noreferrer"
                      className="font-sans text-[12px] text-secondary no-underline">
                      LinkedIn ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {member.bio && (
            <p className="font-sans text-[14px] text-secondary mt-5 leading-[1.7]">
              {member.bio}
            </p>
          )}

          {member.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-[14px]">
              {member.tags.map((tag) => (
                <span key={tag} className="border border-card rounded-full px-[10px] py-[3px] font-sans text-[11px] text-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        {visibleProjects.length > 0 && (
          <div className="mt-7">
            <h2 className="font-display text-[20px] font-normal text-foreground m-0 mb-[14px]">
              Projects
            </h2>
            <div className="flex flex-col gap-[10px]">
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
