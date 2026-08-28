"use client";

import { useMemo, useRef } from "react";

/** Program cards — computed by grouping Course.program_group (a free-text
 * field, not a separate Program table) rather than any new model. Counts
 * come from the real /tests/stats_by_program/ aggregate, never hardcoded. */
export default function ProgramBar({ courses, statsByProgram, selectedProgram, onSelect }) {
  const scrollRef = useRef(null);

  const programs = useMemo(() => {
    const byGroup = {};
    courses.forEach((c) => {
      const key = c.program_group || "Other";
      if (!byGroup[key]) byGroup[key] = { program: key, courses: [], icon: c.icon, color: c.color };
      byGroup[key].courses.push(c);
    });
    return Object.values(byGroup).sort((a, b) => a.program.localeCompare(b.program));
  }, [courses]);

  function scrollBy(delta) {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  if (programs.length === 0) return null;

  return (
    <div className="mt-4 flex items-center gap-2">
      <div ref={scrollRef} className="flex flex-1 gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Programs">
        <button
          role="tab"
          aria-selected={!selectedProgram}
          onClick={() => onSelect("")}
          className={`hm-card flex-none rounded-2xl border-2 p-4 text-left transition ${
            !selectedProgram ? "border-brand-blue" : "border-transparent"
          }`}
          style={{ minWidth: 180 }}
        >
          <p className="text-sm font-bold text-[var(--color-text)]">All Programs</p>
          <p className="text-xs text-[var(--color-text-muted)]">Every course, unfiltered</p>
        </button>
        {programs.map((p) => {
          const stats = statsByProgram?.[p.program];
          const active = selectedProgram === p.program;
          return (
            <button
              key={p.program}
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(active ? "" : p.program)}
              className={`hm-card flex-none rounded-2xl border-2 p-4 text-left transition ${
                active ? "border-brand-blue" : "border-transparent"
              }`}
              style={{ minWidth: 220 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none" style={{ color: p.color }}>
                  {p.icon || "🎓"}
                </span>
                <div>
                  <p className="text-sm font-bold text-[var(--color-text)]">{p.program}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {p.courses.length} course{p.courses.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs">
                <div>
                  <p className="font-bold text-[var(--color-text)]">{stats ? stats.total_exams : "…"}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Exams</p>
                </div>
                <div>
                  <p className="font-bold text-[var(--color-text)]">{stats ? stats.total_questions : "…"}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Questions</p>
                </div>
                <div>
                  <p className="font-bold text-[var(--color-text)]">{stats ? stats.total_attempts : "…"}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Attempts</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-none gap-1">
        <button
          type="button"
          aria-label="Scroll programs left"
          onClick={() => scrollBy(-260)}
          className="hm-btn-outline h-9 w-9 !p-0"
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Scroll programs right"
          onClick={() => scrollBy(260)}
          className="hm-btn-outline h-9 w-9 !p-0"
        >
          →
        </button>
      </div>
    </div>
  );
}
