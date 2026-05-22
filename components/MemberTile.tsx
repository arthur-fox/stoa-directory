import Link from 'next/link';
import { Member } from '@/lib/types';
import ProjectCard from './ProjectCard';

interface Props {
  member: Member;
}

function Avatar({ name, avatar }: { name: string; avatar?: string | null }) {
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
    <Link
      href={`/members/${member.slug}`}
      className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Avatar name={member.name} avatar={member.avatar} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">{member.name}</p>
          {member.location && (
            <p className="truncate text-xs text-zinc-400">{member.location}</p>
          )}
        </div>
      </div>

      {/* Bio — always 2 lines reserved so all tiles stay aligned */}
      <p className="mt-2.5 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-zinc-500">
        {member.bio}
      </p>

      {/* Projects pinned to bottom */}
      {visibleProjects.length > 0 && (
        <div className="mt-auto pt-3 flex flex-col gap-1.5">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} compact />
          ))}
        </div>
      )}
    </Link>
  );
}
