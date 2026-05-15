import Link from 'next/link';
import { Member } from '@/lib/types';
import ProjectCard from './ProjectCard';

interface Props {
  member: Member;
}

function Avatar({ name, avatar }: { name: string; avatar?: string }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
      {initials}
    </div>
  );
}

export default function MemberTile({ member }: Props) {
  const visibleProjects = member.projects
    .filter((p) => p.visibility === 'public')
    .slice(0, 3);

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2">
        <Avatar name={member.name} avatar={member.avatar} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/members/${member.slug}`}
            className="text-sm font-semibold text-zinc-900 hover:underline"
          >
            {member.name}
          </Link>
          {member.location && (
            <p className="text-xs text-zinc-400">{member.location}</p>
          )}
        </div>
      </div>

      {member.bio && (
        <p className="mt-2.5 text-xs text-zinc-500 line-clamp-1">{member.bio}</p>
      )}

      {visibleProjects.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} compact />
          ))}
        </div>
      )}

      {(member.social.website || member.social.twitter || member.social.linkedin) && (
        <div className="mt-3 flex items-center gap-2.5 border-t border-zinc-100 pt-2.5">
          {member.social.website && (
            <a
              href={member.social.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-zinc-700"
            >
              Website
            </a>
          )}
          {member.social.twitter && (
            <a
              href={`https://twitter.com/${member.social.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-zinc-700"
            >
              Twitter
            </a>
          )}
          {member.social.linkedin && (
            <a
              href={`https://linkedin.com/in/${member.social.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-zinc-700"
            >
              LinkedIn
            </a>
          )}
        </div>
      )}
    </div>
  );
}
