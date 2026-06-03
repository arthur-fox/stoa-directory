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
        style={{
          width: 38, height: 38, borderRadius: '50%', objectFit: 'cover',
          border: '1.5px solid var(--avatar-border)', flexShrink: 0,
        }}
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
    <div style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      border: '1.5px solid var(--avatar-border)',
      background: 'var(--avatar-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-cormorant), Georgia, serif',
      fontSize: 14, fontWeight: 500,
      color: 'var(--avatar-text)',
    }}>
      {ini}
    </div>
  );
}

export default function MemberTile({ member }: Props) {
  const ff = 'var(--font-space-grotesk), system-ui, sans-serif';
  const fd = 'var(--font-cormorant), Georgia, serif';

  const visibleProjects = member.projects
    .filter((p) => p.visibility === 'public')
    .slice(0, 3);

  return (
    <div
      className="member-card"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: 6, padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar name={member.name} avatar={member.avatar} />
        <div style={{ paddingTop: 2, minWidth: 0 }}>
          <Link
            href={`/members/${member.slug}`}
            style={{
              display: 'block',
              fontFamily: fd, fontSize: 17, fontWeight: 500,
              color: 'var(--text-primary)', lineHeight: 1.2,
              textDecoration: 'none',
            }}
            className="member-name-link"
          >
            {member.name}
          </Link>
          {member.location && (
            <p style={{
              fontFamily: ff, fontSize: 10,
              color: 'var(--text-muted)', marginTop: 3,
              textTransform: 'uppercase', letterSpacing: '.7px',
              margin: '3px 0 0',
            }}>
              {member.location}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {member.bio && (
        <p style={{
          fontFamily: ff, fontSize: 12,
          color: 'var(--text-secondary)',
          margin: 0, lineHeight: 1.65,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {member.bio}
        </p>
      )}

      {/* Projects */}
      {visibleProjects.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--bg-chip)',
          paddingTop: 10,
          display: 'flex', flexDirection: 'column', gap: 5,
          marginTop: 'auto',
        }}>
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} compact />
          ))}
        </div>
      )}
    </div>
  );
}
