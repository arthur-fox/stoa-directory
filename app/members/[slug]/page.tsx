import { notFound } from 'next/navigation';
import Link from 'next/link';
import membersData from '@/data/members.json';
import { Member } from '@/lib/types';
import ProjectCard from '@/components/ProjectCard';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return (membersData as Member[]).map((m) => ({ slug: m.slug }));
}

export default async function MemberPage({ params }: Props) {
  const { slug } = await params;
  const member = (membersData as Member[]).find((m) => m.slug === slug);

  if (!member || member.visibility !== 'public') notFound();

  const publicProjects = member.projects.filter((p) => p.visibility === 'public');

  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700"
        >
          ← Back to directory
        </Link>

        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-5">
            {member.avatar ? (
              <img
                src={member.avatar}
                alt={member.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-600">
                {initials}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{member.name}</h1>
              {member.location && (
                <p className="mt-0.5 text-sm text-zinc-400">{member.location}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-3">
                {member.social.website && (
                  <a
                    href={member.social.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-500 hover:text-zinc-900"
                  >
                    Website
                  </a>
                )}
                {member.social.twitter && (
                  <a
                    href={`https://twitter.com/${member.social.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-500 hover:text-zinc-900"
                  >
                    Twitter
                  </a>
                )}
                {member.social.linkedin && (
                  <a
                    href={`https://linkedin.com/in/${member.social.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-500 hover:text-zinc-900"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          <p className="mt-6 text-zinc-600">{member.bio}</p>

          {member.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {member.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {publicProjects.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Projects</h2>
            <div className="flex flex-col gap-3">
              {publicProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
