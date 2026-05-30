'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import ProjectCard from '@/components/ProjectCard';

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
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
