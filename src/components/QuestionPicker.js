"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { stripHtml } from "@/lib/richtext";

const PAGE_SIZES = [5, 10, 25, 50, 100];

export default function QuestionPicker({ subjects, initialQuestions = [], onCancel, onInsert }) {
  const [subjectFilter, setSubjectFilter] = useState("");
  const [search, setSearch] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Map(initialQuestions.map((q) => [q.id, q])));
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (subjectFilter) params.set("subject", subjectFilter);
    if (search) params.set("search", search);
    api
      .get(`/questions/?${params.toString()}`)
      .then(setQuestions)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter, search]);

  const totalPages = Math.max(1, Math.ceil(questions.length / pageSize));
  const pageItems = useMemo(
    () => questions.slice((page - 1) * pageSize, page * pageSize),
    [questions, page, pageSize],
  );

  function toggle(q) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.set(q.id, q);
      return next;
    });
  }

  function selectAllOnPage() {
    setSelected((prev) => {
      const next = new Map(prev);
      pageItems.forEach((q) => next.set(q.id, q));
      return next;
    });
  }

  function insert() {
    onInsert(Array.from(selected.values()));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="hm-card flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-bold text-[var(--color-text)]">Insert questions</h2>
          <button onClick={onCancel} className="text-[var(--color-text-muted)]">
            ✕
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-5 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="hm-input w-64"
          />
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="hm-input w-56">
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          <button onClick={selectAllOnPage} className="hm-btn-outline ml-auto text-xs">
            Select all on page
          </button>
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">{selected.size} selected</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
              <tr>
                <th className="w-10 px-4 py-2.5"></th>
                <th className="px-4 py-2.5">Question</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Marks</th>
                <th className="px-4 py-2.5">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {pageItems.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => toggle(q)}
                  className={`cursor-pointer ${selected.has(q.id) ? "bg-blue-50" : ""}`}
                >
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggle(q)} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td className="max-w-md truncate px-4 py-2.5 text-[var(--color-text)]">{stripHtml(q.text)}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-brand-blue">{q.subject_name}</span>
                  </td>
                  <td className="px-4 py-2.5">{q.marks}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-[var(--color-text-muted)]">{q.public_id}</td>
                </tr>
              ))}
              {!loading && pageItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                    No questions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            Show
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="hm-input w-20 py-1">
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            entries · {questions.length} items
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="hm-btn-outline px-2.5 py-1 disabled:opacity-40">
              ‹ Prev
            </button>
            <span className="px-2 font-semibold text-[var(--color-text)]">
              {page} of {totalPages}
            </span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="hm-btn-outline px-2.5 py-1 disabled:opacity-40">
              Next ›
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">
          <button onClick={onCancel} className="hm-btn-outline">
            Cancel
          </button>
          <button onClick={insert} className="hm-btn-primary">
            Insert questions ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}
