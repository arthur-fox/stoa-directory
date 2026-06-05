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
        className="w-[38px] h-[38px] rounded-full object-cover border-[1.5px] border-avatar shrink-0"
      />
    );
  }
  const ini = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="w-[38px] h-[38px] rounded-full shrink-0 border-[1.5px] border-avatar bg-avatar flex items-center justify-center font-display text-[14px] font-medium"
      style={{ color: 'var(--avatar-text)' }}
    >
      {ini}
    </div>
  );
}

export default function MemberTile({ member }: Props) {
  const visibleProjects = member.projects
    .filter((p) => p.visibility === 'public')
    .slice(0, 3);

  return (
    <div className="member-card bg-surface border border-card rounded-[6px] px-5 py-[18px] flex flex-col gap-[10px]">
      {/* Header */}
      <div className="flex gap-3 items-start">
        <Avatar name={member.name} avatar={member.avatar} />
        <div className="pt-0.5 min-w-0">
          <Link
            href={`/members/${member.slug}`}
            className="member-name-link block font-display text-[17px] font-medium text-foreground leading-tight no-underline"
          >
            {member.name}
          </Link>
          {member.location && (
            <p className="font-sans text-[10px] text-muted mt-[3px] uppercase tracking-[.7px] m-0">
              {member.location}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {member.bio && (
        <p
          className="font-sans text-[12px] text-secondary m-0 leading-[1.65] overflow-hidden"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {member.bio}
        </p>
      )}

      {/* Projects */}
      {visibleProjects.length > 0 && (
        <div className="border-t border-well pt-[10px] flex flex-col gap-[5px] mt-auto">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} compact />
          ))}
        </div>
      )}
    </div>
  );
}
