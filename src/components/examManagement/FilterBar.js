"use client";

import { useEffect, useRef, useState } from "react";
import { EXAM_TYPES, STATUS_OPTIONS } from "./constants";

const ACCESS_OPTIONS = [
  { key: "", label: "All Access" },
  { key: "free", label: "Free" },
  { key: "pro", label: "Pro" },
];

/** Every control here is wired to a real GET /tests/ query param — no
 * decorative filters. Search is debounced 300ms (same pattern already used
 * in QuestionPicker/StudentPicker) so it doesn't fire a request per
 * keystroke against a 100k+ question / 10k+ exam dataset. */
export default function FilterBar({ programs, subjects, filters, onChange, onReset }) {
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [showMore, setShowMore] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  function handleSearchInput(value) {
    setSearchDraft(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange({ search: value }), 300);
  }

  const activeCount = ["subject", "status", "access"].filter((k) => filters[k]).length;

  return (
    <div className="hm-card mt-4 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label htmlFor="exam-search" className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
            Search exams
          </label>
          <div className="relative">
            <input
              id="exam-search"
              value={searchDraft}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search exams…"
              className="hm-input pr-8"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" aria-hidden>
              🔍
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="filter-program" className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
            Program
          </label>
          <select
            id="filter-program"
            value={filters.program}
            onChange={(e) => onChange({ program: e.target.value })}
            className="hm-input"
          >
            <option value="">All Programs</option>
            {programs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-subject" className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
            Specialty / Subject
          </label>
          <select
            id="filter-subject"
            value={filters.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            className="hm-input"
          >
            <option value="">All</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-exam-type" className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
            Exam Type
          </label>
          <select
            id="filter-exam-type"
            value={filters.examType}
            onChange={(e) => onChange({ examType: e.target.value })}
            className="hm-input"
          >
            <option value="">All Types</option>
            {EXAM_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-status" className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
            Status
          </label>
          <select
            id="filter-status"
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value })}
            className="hm-input"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className="hm-btn-outline text-xs"
        >
          🧰 More Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        <button type="button" onClick={onReset} className="text-xs font-semibold text-[var(--color-text-muted)]">
          ↺ Reset
        </button>
      </div>

      {showMore && (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-[var(--color-border)] pt-3 sm:grid-cols-3">
          <div>
            <label htmlFor="filter-access" className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
              Access
            </label>
            <select
              id="filter-access"
              value={filters.access}
              onChange={(e) => onChange({ access: e.target.value })}
              className="hm-input"
            >
              {ACCESS_OPTIONS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
