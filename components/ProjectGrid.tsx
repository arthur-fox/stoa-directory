import Link from 'next/link';
import { Member, Project } from '@/lib/types';
import { safeUrl } from '@/lib/utils';

export interface ProjectListItem {
  project: Project;
  member: Pick<Member, 'name' | 'slug'>;
}

interface Props {
  items: ProjectListItem[];
}

// Status dot colors — same convention as ProjectCard
const statusDot: Record<string, string> = {
  live: 'var(--status-live)',
  wip:  'var(--status-wip)',
};

const statusLabel: Record<string, string> = {
  live: 'Live',
  wip:  'Work in progress',
};

function getStatusLabel(status: string) {
  return statusLabel[status] ?? status.replaceAll('-', ' ');
}

export default function ProjectGrid({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-24 text-center font-sans text-[13px] text-muted">
        No projects to display.
      </p>
    );
  }

  const shouldScroll = items.length > 8;

  return (
    <div className={shouldScroll ? 'max-h-[40rem] overflow-y-auto pr-2' : undefined}>
      {items.map(({ project, member }) => (
        <div
          key={`${member.slug}-${project.id}`}
          className="border-b border-section py-3 last:border-b-0"
        >
          <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-[minmax(0,1fr)_18rem_9rem] md:items-start">

            {/* Title */}
            <Link
              href={`/projects/${project.id}`}
              className="min-w-0 truncate font-sans text-[14px] font-medium text-foreground no-underline hover:text-gold transition-colors"
            >
              {project.title}
            </Link>

            {/* Right-side chips: feedback + status + external link */}
            <div className="flex min-w-0 items-center justify-end gap-3 md:col-start-2 md:row-start-1">

              {/* Feedback wanted chip with hover tooltip */}
              <div className="flex w-32 justify-end">
                {project.seekingFeedback && (
                  <Link
                    href={`/projects/${project.id}#feedback`}
                    className="group/feedback relative inline-flex rounded-full bg-well border border-gold px-2 py-0.5 font-sans text-[11px] font-medium text-gold no-underline hover:bg-gold hover:text-background transition-colors"
                  >
                    Feedback wanted
                    <span className="pointer-events-none invisible absolute right-full top-1/2 z-30 mr-3 w-72 -translate-y-1/2 rounded-[6px] border border-card bg-surface p-3 text-left font-sans text-[12px] font-normal leading-[1.5] text-secondary opacity-0 shadow-lg transition-opacity group-hover/feedback:visible group-hover/feedback:opacity-100">
                      {project.feedbackPrompt || 'No specific feedback prompt provided.'}
                    </span>
                  </Link>
                )}
              </div>

              {/* Status badge */}
              <div className="flex w-28 justify-end">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-sans text-[11px] font-medium"
                  style={{
                    color: statusDot[project.status] ?? 'var(--text-muted)',
                    borderColor: statusDot[project.status] ?? 'var(--border-card)',
                  }}
                >
                  {getStatusLabel(project.status)}
                </span>
              </div>

              {/* External link */}
              <div className="flex w-5 justify-end">
                {project.url && (
                  <a
                    href={safeUrl(project.url!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-5 w-5 items-center justify-center text-muted hover:text-foreground transition-colors"
                    title={`Open ${project.title}`}
                  >
                    ↗
                  </a>
                )}
              </div>
            </div>

            {/* Member name */}
            <Link
              href={`/members/${member.slug}`}
              className="min-w-0 truncate font-sans text-[12px] text-secondary no-underline hover:text-foreground hover:underline transition-colors md:col-start-3 md:row-start-1 md:text-right"
            >
              {member.name}
            </Link>

            {/* Description */}
            {project.description && (
              <p
                className="min-w-0 truncate font-sans text-[12px] leading-[1.5] text-muted m-0 md:col-start-1 md:row-start-2"
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
