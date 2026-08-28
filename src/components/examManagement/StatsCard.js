"use client";

const ROWS = [
  { key: "total_exams", label: "Total Exams" },
  { key: "published_exams", label: "Published Exams" },
  { key: "draft_exams", label: "Draft Exams" },
  { key: "scheduled_exams", label: "Scheduled Exams" },
  { key: "total_questions", label: "Total Questions" },
  { key: "total_attempts", label: "Total Attempts" },
];

/** Every number here comes from GET /tests/stats/ (real aggregate queries) —
 * never hardcoded, per the spec's explicit requirement. */
export default function StatsCard({ stats, program }) {
  return (
    <div className="hm-card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        Exam Stats {program ? `(${program})` : "(All Time)"}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {ROWS.map((r) => (
          <div key={r.key} className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">{r.label}</span>
            <span className="font-bold text-[var(--color-text)]">{stats ? stats[r.key] : "…"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
