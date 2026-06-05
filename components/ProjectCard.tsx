import Link from 'next/link';
import { Project } from '@/lib/types';

const statusStyles: Record<string, string> = {
  live: 'bg-emerald-50 text-emerald-700',
  wip:  'bg-amber-50 text-amber-700',
};

// Compact dot colours — used in tile cards where space is tight
const statusDot: Record<string, string> = {
  live: 'bg-emerald-400',
  wip:  'bg-amber-400',
};

const statusLabel: Record<string, string> = {
  live: 'Live', wip: 'WIP',
};

interface Props {
  project: Project;
  compact?: boolean;
}

export default function ProjectCard({ project, compact = false }: Props) {
  if (compact) {
    // Compact: title → project detail page  |  ↗ button → external URL
    return (
      <div className="flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50 px-2.5 py-1.5 transition-colors hover:border-zinc-200 hover:bg-white">
        <Link
          href={`/projects/${project.id}`}
          className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-700 hover:text-black hover:underline"
        >
          {project.title}
        </Link>
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          {project.seekingFeedback && (
            <Link
              href={`/projects/${project.id}#feedback`}
              className="rounded-full bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-600 hover:bg-violet-100"
            >
              Feedback
            </Link>
          )}
          {/* Status as a coloured dot to save space — hover shows the label */}
          <span
            className={`h-2 w-2 rounded-full ${statusDot[project.status]}`}
            title={statusLabel[project.status]}
          />
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-5 w-5 items-center justify-center rounded text-zinc-300 transition-colors hover:bg-zinc-200 hover:text-zinc-600"
              title={`Open ${project.title}`}
            >
              ↗
            </a>
          )}
        </div>
      </div>
    );
  }

  // Full card: title → project detail page  |  ↗ button → external URL
  return (
    <div className="group rounded-lg border border-zinc-100 bg-zinc-50 p-3 transition-colors hover:border-zinc-200 hover:bg-white">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm font-medium text-zinc-800 hover:text-black hover:underline"
        >
          {project.title}
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          {project.seekingFeedback && (
            <Link
              href={`/projects/${project.id}#feedback`}
              className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600 hover:bg-violet-100"
            >
              Feedback wanted
            </Link>
          )}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[project.status]}`}>
            {statusLabel[project.status]}
          </span>
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600"
              title={`Open ${project.title}`}
            >
              ↗
            </a>
          )}
        </div>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{project.description}</p>
      {project.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {project.tags.map(tag => (
            <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
