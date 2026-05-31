import Link from 'next/link';
import { Member, Project } from '@/lib/types';

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

function getStatusLabel(status: string) {
  return statusLabel[status] ?? status.replaceAll('-', ' ');
}

interface Props {
  project: Project;
  compact?: boolean;
  owner?: Pick<Member, 'name' | 'slug'>;
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-600">
      {initials}
    </div>
  );
}

export default function ProjectCard({ project, compact = false, owner }: Props) {
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
            <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-600">
              Feedback
            </span>
          )}
          {/* Status as a coloured dot to save space — hover shows the label */}
          <span
            className={`h-2 w-2 rounded-full ${statusDot[project.status] ?? 'bg-zinc-300'}`}
            title={getStatusLabel(project.status)}
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
      {owner && (
        <Link
          href={`/members/${owner.slug}`}
          className="mb-2 flex min-w-0 items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:underline"
        >
          <Avatar name={owner.name} />
          <span className="truncate">{owner.name}</span>
        </Link>
      )}
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm font-medium text-zinc-800 hover:text-black hover:underline"
        >
          {project.title}
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          {project.seekingFeedback && (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
              Feedback wanted
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[project.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
            {getStatusLabel(project.status)}
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
