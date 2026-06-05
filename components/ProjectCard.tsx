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
      <div className="flex items-center justify-between bg-well border border-transparent rounded-[3px] px-[9px] py-1 transition-colors gap-1.5">
        {/* Status dot + title */}
        <div className="flex items-center gap-[5px] min-w-0 flex-1">
          <span
            className="w-[5px] h-[5px] rounded-full shrink-0"
            style={{ background: dotColor }}
          />
          <Link
            href={`/projects/${project.id}`}
            className="font-sans text-[11px] no-underline overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ color: chipTextColor }}
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
            className="shrink-0 text-[11px] text-muted no-underline leading-none transition-colors"
          >
            ↗
          </a>
        )}
      </div>
    );
  }

  // ── Full card ───────────────────────────────────────────────
  return (
    <div className="bg-well border border-card rounded-[6px] px-[14px] py-3 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5"
            style={{ background: dotColor }}
          />
          <Link
            href={`/projects/${project.id}`}
            className="font-sans text-[13px] font-medium text-foreground no-underline"
          >
            {project.title}
          </Link>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {project.seekingFeedback && (
            <Link
              href={`/projects/${project.id}#feedback`}
              className="font-sans text-[10px] font-medium text-gold bg-transparent border border-gold rounded-[3px] px-[7px] py-[2px] tracking-[.4px] no-underline"
            >
              Feedback
            </Link>
          )}
          <span
            className="font-sans text-[10px] bg-surface border border-card rounded-[3px] px-[7px] py-[2px]"
            style={{ color: chipTextColor }}
          >
            {statusLabel[project.status] ?? project.status}
          </span>
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open ${project.title}`}
              className="text-[12px] text-muted no-underline transition-colors"
            >
              ↗
            </a>
          )}
        </div>
      </div>
      {project.description && (
        <p
          className="font-sans text-[12px] text-secondary mt-2 m-0 leading-[1.6] overflow-hidden"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {project.description}
        </p>
      )}
      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="font-sans text-[10px] text-muted bg-surface border border-card rounded-[3px] px-[7px] py-[2px]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
