import { Member } from '@/lib/types';

/**
 * Client-side directory filters. All filtering runs over the already-fetched
 * members array — no Supabase queries, no new dependencies.
 *
 * Matching rule: a member tile stays visible only when EVERY active filter is
 * satisfied (AND across the four filter types). An individual filter is
 * satisfied when the member OR at least one of their loaded projects matches
 * it. Within the multi-select tag facet, selecting more tags broadens the
 * result (OR — a member matches if it carries any of the selected tags).
 */
export interface Filters {
  /** Case-insensitive substring against member name AND project titles. */
  search: string;
  /** Selected project.type, or null for "all types". */
  type: string | null;
  /** Selected project.status, or null for "all statuses". */
  status: string | null;
  /** Selected tags (member tags + project tags), OR-combined within the facet. */
  tags: string[];
  /** Only members with at least one loaded project seeking feedback. */
  needsFeedback: boolean;
}

export const emptyFilters: Filters = {
  search: '',
  type: null,
  status: null,
  tags: [],
  needsFeedback: false,
};

export function isFilterActive(f: Filters): boolean {
  return (
    f.search.trim() !== '' ||
    f.type !== null ||
    f.status !== null ||
    f.tags.length > 0 ||
    f.needsFeedback
  );
}

export interface FilterOptions {
  types: string[];
  statuses: string[];
  tags: string[];
}

/** Build dropdown/pill options dynamically from the loaded data — nothing hardcoded. */
export function deriveFilterOptions(members: Member[]): FilterOptions {
  const types = new Set<string>();
  const statuses = new Set<string>();
  const tags = new Set<string>();

  for (const m of members) {
    for (const t of m.tags) tags.add(t);
    for (const p of m.projects) {
      if (p.type) types.add(p.type);
      if (p.status) statuses.add(p.status);
      for (const t of p.tags) tags.add(t);
    }
  }

  return {
    types: [...types].sort((a, b) => a.localeCompare(b)),
    statuses: [...statuses].sort((a, b) => a.localeCompare(b)),
    tags: [...tags].sort((a, b) => a.localeCompare(b)),
  };
}

export function filterMembers(members: Member[], f: Filters): Member[] {
  const q = f.search.trim().toLowerCase();

  return members.filter((m) => {
    const projects = m.projects;

    // 1. Name search — member name OR any project title.
    if (q) {
      const hit =
        m.name.toLowerCase().includes(q) ||
        projects.some((p) => p.title.toLowerCase().includes(q));
      if (!hit) return false;
    }

    // 2. Project type — at least one loaded project of the selected type.
    if (f.type && !projects.some((p) => p.type === f.type)) return false;

    // 2b. Project status — at least one loaded project of the selected status.
    if (f.status && !projects.some((p) => p.status === f.status)) return false;

    // 3. Tags — member matches if it carries ANY selected tag, on the member
    //    itself or on one of its projects.
    if (
      f.tags.length > 0 &&
      !f.tags.some(
        (tag) =>
          m.tags.includes(tag) || projects.some((p) => p.tags.includes(tag)),
      )
    ) {
      return false;
    }

    // 4. Needs feedback — at least one loaded project seeking feedback.
    if (f.needsFeedback && !projects.some((p) => p.seekingFeedback)) return false;

    return true;
  });
}

/**
 * Sort options, applied after filtering. Sorting is independent of the filters.
 * "newest" preserves the fetched order (the homepage query already orders by
 * listed_at desc), so it is intentionally a no-op.
 */
export type SortKey = 'newest' | 'name' | 'project';

export const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest listed',
  name: 'Name A–Z',
  project: 'Project A–Z',
};

export const defaultSort: SortKey = 'newest';

const byName = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: 'base' });

/** Alphabetically-first project title for a member, or null when it has none. */
function firstProjectTitle(m: Member): string | null {
  if (m.projects.length === 0) return null;
  return m.projects.map((p) => p.title).sort(byName)[0];
}

export function sortMembers(members: Member[], sort: SortKey): Member[] {
  // Preserve the incoming (newest-listed) order without re-sorting.
  if (sort === 'newest') return members;

  if (sort === 'name') {
    return [...members].sort((a, b) => byName(a.name, b.name));
  }

  // 'project' — by alphabetically-first project title; projectless members last.
  return [...members].sort((a, b) => {
    const ta = firstProjectTitle(a);
    const tb = firstProjectTitle(b);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return byName(ta, tb);
  });
}
