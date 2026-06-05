import Link from 'next/link';
import { Project } from '@/lib/types';

interface Props {
  project: Project;
  compact?: boolean;
}

const statusLabel: Record<string, string> = {
  live: 'Live',
  wip: 'WIP',
};

export default function ProjectCard({ project, compact = false }: Props) {
  const ff = 'var(--font-space-grotesk), system-ui, sans-serif';

  // Dot and text color: feedback overrides, otherwise status-based
  const dotColor = project.seekingFeedback
    ? 'var(--gold)'
    : project.status === 'live'
    ? '#22c55e'
    : '#f59e0b';

  const chipTextColor = project.seekingFeedback
    ? 'var(--gold)'
    : project.status === 'live'
    ? 'var(--chip-active)'
    : 'var(--text-secondary)';

  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-chip)',
        border: '1px solid transparent',
        borderRadius: 3, padding: '4px 9px',
        transition: 'border-color 0.15s',
        gap: 6,
      }}>
        {/* Status dot + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, flex: 1 }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: dotColor, flexShrink: 0,
          }} />
          <Link
            href={`/projects/${project.id}`}
            style={{
              fontFamily: ff, fontSize: 11,
              color: chipTextColor,
              textDecoration: 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {project.title}
          </Link>
        </div>

        {/* External link */}
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Open ${project.title}`}
            style={{
              flexShrink: 0, fontSize: 11,
              color: 'var(--text-muted)',
              textDecoration: 'none', lineHeight: 1,
              transition: 'color 0.15s',
            }}
          >
            ↗
          </a>
        )}
      </div>
    );
  }

  // ── Full card ───────────────────────────────────────────────
  return (
    <div style={{
      background: 'var(--bg-chip)',
      border: '1px solid var(--border-card)',
      borderRadius: 6, padding: '12px 14px',
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: dotColor, flexShrink: 0, marginTop: 2,
          }} />
          <Link
            href={`/projects/${project.id}`}
            style={{
              fontFamily: ff, fontSize: 13, fontWeight: 500,
              color: 'var(--text-primary)',
              textDecoration: 'none',
            }}
          >
            {project.title}
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {project.seekingFeedback && (
            <Link
              href={`/projects/${project.id}#feedback`}
              style={{
                fontFamily: ff, fontSize: 10, fontWeight: 500,
                color: 'var(--gold)',
                background: 'none',
                border: '1px solid var(--gold)',
                borderRadius: 3, padding: '2px 7px',
                letterSpacing: '.4px',
                textDecoration: 'none',
              }}
            >
              Feedback
            </Link>
          )}
          <span style={{
            fontFamily: ff, fontSize: 10,
            color: chipTextColor,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 3, padding: '2px 7px',
          }}>
            {statusLabel[project.status] ?? project.status}
          </span>
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open ${project.title}`}
              style={{
                fontSize: 12, color: 'var(--text-muted)',
                textDecoration: 'none', transition: 'color 0.15s',
              }}
            >
              ↗
            </a>
          )}
        </div>
      </div>
      {project.description && (
        <p style={{
          fontFamily: ff, fontSize: 12,
          color: 'var(--text-secondary)',
          margin: '8px 0 0', lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {project.description}
        </p>
      )}
      {project.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {project.tags.map((tag) => (
            <span key={tag} style={{
              fontFamily: ff, fontSize: 10,
              color: 'var(--text-muted)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 3, padding: '2px 7px',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
