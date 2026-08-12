"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const ROMAN_NUMERALS = [
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
  "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx",
];

function unitLetter(index) {
  return String.fromCharCode(65 + (index % 26));
}

function chapterNumeral(index) {
  return ROMAN_NUMERALS[index] || `${index + 1}`;
}

function ExpandedSubject({ detail, loading }) {
  if (loading && !detail) {
    return <p className="px-6 py-3 text-xs text-[var(--color-text-muted)]">Loading units…</p>;
  }
  if (!detail) return null;
  if (detail.chapters.length === 0) {
    return <p className="px-6 py-3 text-xs text-[var(--color-text-muted)]">No units yet.</p>;
  }
  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]">
      {detail.chapters.map((unit, ui) => (
        <div key={unit.id}>
          <div className="flex items-center gap-2 border-t border-[var(--color-border)] py-2 pl-10 pr-4 first:border-t-0">
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-blue/10 text-[10px] font-bold text-brand-blue">
              {unitLetter(ui)}
            </span>
            <span className="text-sm font-semibold text-[var(--color-text)]">{unit.name}</span>
            <span className="ml-auto text-[10px] font-medium text-[var(--color-text-muted)]">
              {unit.mcq_count} question{unit.mcq_count === 1 ? "" : "s"}
            </span>
          </div>
          {unit.topics.map((ch, ci) => (
            <div key={ch.id} className="flex items-center gap-2 border-t border-[var(--color-border)] py-1.5 pl-20 pr-4">
              <span className="font-mono text-xs text-[var(--color-text-muted)]">{chapterNumeral(ci)}.</span>
              <span className="text-sm text-[var(--color-text)]">{ch.name}</span>
              <span className="ml-auto text-[10px] font-medium text-[var(--color-text-muted)]">
                {ch.question_count} question{ch.question_count === 1 ? "" : "s"}
              </span>
            </div>
          ))}
          {unit.topics.length === 0 && (
            <p className="border-t border-[var(--color-border)] py-1.5 pl-20 pr-4 text-xs italic text-[var(--color-text-muted)]">
              No chapters yet.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function SummaryContent() {
  const [subjects, setSubjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expandedSlugs, setExpandedSlugs] = useState(new Set());
  const [detailBySlug, setDetailBySlug] = useState({});
  const [expandLoading, setExpandLoading] = useState(new Set());

  useEffect(() => {
    api.get("/subjects/").then(setSubjects);
    api.get("/questions/summary/").then(setSummary);
  }, []);

  async function toggleExpand(slug) {
    setExpandedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    if (!detailBySlug[slug]) {
      setExpandLoading((prev) => new Set(prev).add(slug));
      try {
        const detail = await api.get(`/subjects/${slug}/`);
        setDetailBySlug((prev) => ({ ...prev, [slug]: detail }));
      } finally {
        setExpandLoading((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      }
    }
  }

  const maxCourseCount = Math.max(1, ...(summary?.by_course || []).map((c) => c.question_count));

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[var(--color-text)]">Question Bank Summary</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Full breakdown of question bank content — by course, subject, unit, and chapter.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="hm-card flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-xl">❓</span>
          <div>
            <p className="text-2xl font-extrabold text-[var(--color-text)]">{summary?.total_questions ?? "…"}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Total questions</p>
          </div>
        </div>
        <div className="hm-card flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-xl">📘</span>
          <div>
            <p className="text-2xl font-extrabold text-[var(--color-text)]">{subjects.length}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Subjects</p>
          </div>
        </div>
      </div>

      <p className="mb-2 mt-6 text-sm font-bold text-[var(--color-text)]">By course</p>
      <div className="hm-card p-5">
        {!summary && <p className="text-xs text-[var(--color-text-muted)]">Loading…</p>}
        <div className="flex flex-col gap-3">
          {(summary?.by_course || []).map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text)]">{c.name}</span>
                <span className="font-semibold text-[var(--color-text)]">{c.question_count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                <div
                  className="h-full rounded-full bg-brand-blue"
                  style={{ width: `${(c.question_count / maxCourseCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-bold text-[var(--color-text)]">By subject, unit &amp; chapter</p>
        <Link href="/subjects" className="text-xs font-semibold text-brand-blue">
          Manage subjects →
        </Link>
      </div>
      <div className="mt-2 hm-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Prefix</th>
              <th className="px-4 py-3">Units</th>
              <th className="px-4 py-3">Questions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {subjects.map((s) => {
              const isOpen = expandedSlugs.has(s.slug);
              return (
                <Fragment key={s.id}>
                  <tr className="cursor-pointer hover:bg-[var(--color-surface-muted)]" onClick={() => toggleExpand(s.slug)}>
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block flex-none text-[var(--color-text-muted)] transition-transform ${isOpen ? "rotate-90" : ""}`}>
                          ▸
                        </span>
                        {s.name.toUpperCase()}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)]">{s.prefix}</td>
                    <td className="px-4 py-3">{s.module_count}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--color-text)]">{s.question_count}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={4} className="p-0">
                        <ExpandedSubject detail={detailBySlug[s.slug]} loading={expandLoading.has(s.slug)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {subjects.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No subjects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function QuestionBankSummaryPage() {
  return (
    <RequireStaff feature="question_bank">
      <Shell>
        <SummaryContent />
      </Shell>
    </RequireStaff>
  );
}
