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

// Pill base + on/off variants using Agora theme tokens
const pillBase = 'rounded-full px-3 py-1 font-sans text-[11px] font-medium tracking-[.3px] transition-colors cursor-pointer border';
const pillOn  = 'bg-gold text-background border-gold';
const pillOff = 'bg-well text-secondary border-card hover:border-gold hover:text-foreground';

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
    <div className="agora-card p-4 mb-6">
      {/* Search */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[14px]">
          ⌕
        </span>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search members or projects…"
          className="agora-input pl-9"
        />
      </div>

      {/* Needs-feedback toggle + sort */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onChange({ ...filters, needsFeedback: !filters.needsFeedback })}
          aria-pressed={filters.needsFeedback}
          className={`shrink-0 rounded-[6px] border px-3 py-[7px] font-sans text-[12px] font-medium transition-colors ${
            filters.needsFeedback
              ? 'border-gold bg-gold text-background'
              : 'border-card bg-well text-secondary hover:border-gold'
          }`}
        >
          Needs feedback
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <label htmlFor="sort" className="font-sans text-[11px] text-muted uppercase tracking-[.5px]">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="agora-input"
            style={{ width: 'auto' }}
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
          <span className="mr-1 font-sans text-[10px] font-semibold text-muted uppercase tracking-[.5px]">Type</span>
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
          <span className="mr-1 font-sans text-[10px] font-semibold text-muted uppercase tracking-[.5px]">Status</span>
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
          <span className="mr-1 font-sans text-[10px] font-semibold text-muted uppercase tracking-[.5px]">Tags</span>
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
        <div className="mt-3 flex items-center justify-between border-t border-section pt-3">
          <p className="font-sans text-[12px] text-secondary m-0">
            Showing{' '}
            <span className="font-semibold text-foreground">{resultCount}</span> of{' '}
            {total} {total === 1 ? 'member' : 'members'}
          </p>
          <button
            type="button"
            onClick={onClear}
            className="font-sans text-[11px] text-gold bg-transparent border-none cursor-pointer hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
