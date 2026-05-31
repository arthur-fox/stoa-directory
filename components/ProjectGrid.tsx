import Link from 'next/link';
import { Member, Project } from '@/lib/types';

export interface ProjectListItem {
  project: Project;
  member: Pick<Member, 'name' | 'slug'>;
}

interface Props {
  items: ProjectListItem[];
}

const statusStyles: Record<string, string> = {
  live: 'bg-emerald-50 text-emerald-700',
  wip: 'bg-amber-50 text-amber-700',
};

const statusLabel: Record<string, string> = {
  live: 'Live',
  wip: 'Work in progress',
};

function getStatusLabel(status: string) {
  return statusLabel[status] ?? status.replaceAll('-', ' ');
}

export default function ProjectGrid({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-24 text-center text-zinc-400">No projects to display.</p>
    );
  }

  const shouldScroll = items.length > 8;

  return (
    <div className={shouldScroll ? 'max-h-[40rem] overflow-y-auto pr-6' : undefined}>
      {items.map(({ project, member }) => (
        <div
          key={`${member.slug}-${project.id}`}
          className="border-b border-zinc-100 py-3 last:border-b-0"
        >
          <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-[minmax(0,1fr)_18rem_9rem] md:items-start">
            <Link
              href={`/projects/${project.id}`}
              className="min-w-0 truncate text-base font-semibold text-zinc-950 hover:underline"
            >
              {project.title}
            </Link>

            <div className="flex min-w-0 items-center justify-end gap-3 md:col-start-2 md:row-start-1">
              <div className="flex w-32 justify-end">
                {project.seekingFeedback && (
                  <Link
                    href={`/projects/${project.id}#feedback`}
                    className="group/feedback relative inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600 hover:bg-violet-100 hover:text-violet-700"
                  >
                    Feedback wanted
                    <span className="pointer-events-none invisible absolute right-full top-1/2 z-30 mr-3 w-80 -translate-y-1/2 rounded-md border border-violet-100 bg-white p-3 text-left text-xs font-normal leading-5 text-zinc-600 opacity-0 shadow-lg transition-opacity group-hover/feedback:visible group-hover/feedback:opacity-100">
                      {project.feedbackPrompt || 'No specific feedback prompt provided.'}
                    </span>
                  </Link>
                )}
              </div>

              <div className="flex w-28 justify-end">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[project.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                  {getStatusLabel(project.status)}
                </span>
              </div>

              <div className="flex w-5 justify-end">
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-5 w-5 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-700"
                    title={`Open ${project.title}`}
                  >
                    ↗
                  </a>
                )}
              </div>
            </div>

            <Link
              href={`/members/${member.slug}`}
              className="min-w-0 truncate text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:underline md:col-start-3 md:row-start-1 md:text-right"
            >
              {member.name}
            </Link>

            {project.description && (
              <p
                className="min-w-0 truncate text-sm leading-5 text-zinc-500 md:col-start-1 md:row-start-2"
                title={project.description}
              >
                {project.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
