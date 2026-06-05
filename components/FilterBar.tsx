'use client';

import { useMemo } from 'react';
import { Member } from '@/lib/types';
import {
  Filters,
  SortKey,
  SORT_LABELS,
  deriveFilterOptions,
  isFilterActive,
} from '@/lib/filterMembers';

interface Props {
  /** Full loaded list — used to derive the available type/status/tag options. */
  members: Member[];
  filters: Filters;
  onChange: (next: Filters) => void;
  /** Sort key, applied after filtering. Independent of the filters. */
  sort: SortKey;
  onSortChange: (next: SortKey) => void;
  /** Total loaded members (denominator for the result count). */
  total: number;
  /** Members remaining after filtering (numerator). */
  resultCount: number;
  /** Reset every filter back to its empty state (leaves sort alone). */
  onClear: () => void;
}

const pillBase =
  'rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer';
const pillOn = 'bg-violet-600 text-white';
const pillOff = 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200';

// Friendly labels for the raw project.status values; falls back to the raw value.
const STATUS_LABELS: Record<string, string> = { live: 'Live', wip: 'WIP' };

export default function FilterBar({
  members,
  filters,
  onChange,
  sort,
  onSortChange,
  total,
  resultCount,
  onClear,
}: Props) {
  const { types, statuses, tags } = useMemo(
    () => deriveFilterOptions(members),
    [members],
  );
  const active = isFilterActive(filters);

  function toggleTag(tag: string) {
    const next = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onChange({ ...filters, tags: next });
  }

  return (
    <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {/* Search */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          ⌕
        </span>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search members or projects…"
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
      </div>

      {/* Needs-feedback toggle + sort — its own line under the search.
          Sort sits opposite the toggle and is always visible. */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() =>
            onChange({ ...filters, needsFeedback: !filters.needsFeedback })
          }
          aria-pressed={filters.needsFeedback}
          className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            filters.needsFeedback
              ? 'border-violet-600 bg-violet-600 text-white'
              : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          Needs feedback
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <label htmlFor="sort" className="text-xs font-medium text-zinc-400">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="rounded-lg border border-zinc-200 bg-white py-1.5 pl-2.5 pr-7 text-sm text-zinc-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project-type pills — only when there's a real choice (2+ types) */}
      {types.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-zinc-400">Type</span>
          <button
            type="button"
            onClick={() => onChange({ ...filters, type: null })}
            className={`${pillBase} ${filters.type === null ? pillOn : pillOff}`}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...filters, type: t })}
              className={`${pillBase} ${filters.type === t ? pillOn : pillOff}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Project-status pills — only when there's a real choice (2+ statuses) */}
      {statuses.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-zinc-400">Status</span>
          <button
            type="button"
            onClick={() => onChange({ ...filters, status: null })}
            className={`${pillBase} ${filters.status === null ? pillOn : pillOff}`}
          >
            All
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ ...filters, status: s })}
              className={`${pillBase} ${filters.status === s ? pillOn : pillOff}`}
            >
              {STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      )}

      {/* Tag pills — built from member + project tags in the loaded data */}
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-zinc-400">Tags</span>
          {tags.map((tag) => {
            const on = filters.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={on}
                className={`${pillBase} ${on ? pillOn : pillOff}`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Result count + clear action — only while a filter is active */}
      {active && (
        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
          <p className="text-sm text-zinc-500">
            Showing{' '}
            <span className="font-semibold text-zinc-900">{resultCount}</span> of{' '}
            {total} {total === 1 ? 'member' : 'members'}
          </p>
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-medium text-violet-600 hover:text-violet-700 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
