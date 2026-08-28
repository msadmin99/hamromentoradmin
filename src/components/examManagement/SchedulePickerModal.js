"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { api } from "@/lib/api";

/** "Schedule Exam Session" quick action needs a target exam first — this is
 * a thin search-and-pick step in front of the existing per-exam reschedule
 * page (/exam-management/{id}/reschedule), not a new scheduling system. */
export default function SchedulePickerModal({ onCancel }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [templates, standalone] = await Promise.all([
          api.get(`/exam-templates/browse/?search=${encodeURIComponent(query)}&page_size=10`),
          api.get(`/tests/browse/?standalone=true&search=${encodeURIComponent(query)}&page_size=10`),
        ]);
        const templateRows = (templates.results || []).map((t) => ({
          key: `template-${t.id}`,
          linkId: t.latest_session?.exam_version || null,
          title: t.title,
          exam_code: t.exam_code,
        }));
        const standaloneRows = (standalone.results || []).map((t) => ({
          key: `test-${t.id}`,
          linkId: t.id,
          title: t.title,
          exam_code: null,
        }));
        setResults([...templateRows, ...standaloneRows].filter((r) => r.linkId));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <Modal title="Schedule Exam Session" onClose={onCancel}>
      <label htmlFor="schedule-picker-search" className="sr-only">
        Search exams to schedule
      </label>
      <input
        id="schedule-picker-search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exams by title…"
        className="hm-input"
      />
      <div className="mt-3 max-h-72 overflow-y-auto">
        {loading && <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">Searching…</p>}
        {!loading && results.length === 0 && (
          <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">
            {query ? "No exams match your search." : "Start typing to find an exam to schedule."}
          </p>
        )}
        {results.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => router.push(`/exam-management/${r.linkId}/reschedule`)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
          >
            <span className="truncate">{r.title}</span>
            <span className="flex-none text-xs font-semibold text-brand-blue">Schedule →</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
