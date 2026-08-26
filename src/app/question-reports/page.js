"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { stripHtml } from "@/lib/richtext";

const TABS = [
  { key: "open", label: "Open" },
  { key: "reviewed", label: "Reviewed" },
  { key: "dismissed", label: "Dismissed" },
  { key: "", label: "All" },
];

const REASON_LABELS = {
  incorrect_answer: "Incorrect answer",
  incorrect_explanation: "Incorrect explanation",
  ambiguous: "Ambiguous question",
  typo: "Typographical error",
  outdated: "Outdated information",
  poor_image: "Poor image",
  other: "Other",
};

function QuestionReportsContent() {
  const [reports, setReports] = useState([]);
  const [tab, setTab] = useState("open");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab) params.set("status", tab);
    api
      .get(`/question-reports/?${params.toString()}`)
      .then(setReports)
      .finally(() => setLoading(false));
  }

  useEffect(load, [tab]);

  async function setStatus(report, status) {
    await api.patch(`/question-reports/${report.id}/`, { status });
    load();
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[var(--color-text)]">Question Reports</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Problems flagged by students while practicing — never shows who reported it, only what and why.
      </p>

      <div className="mt-4 flex rounded-lg border border-[var(--color-border)] p-0.5" style={{ width: "fit-content" }}>
        {TABS.map((t) => (
          <button
            key={t.key || "all"}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              tab === t.key ? "bg-brand-blue text-white" : "text-[var(--color-text-muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 hm-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Comment</th>
              <th className="px-4 py-3">Reported</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="max-w-xs px-4 py-3">
                  <Link href={`/questions?edit=${r.question}`} className="font-medium text-brand-blue hover:underline">
                    {r.question_public_id ? `${r.question_public_id} — ` : ""}
                    {stripHtml(r.question_text).slice(0, 80)}
                  </Link>
                </td>
                <td className="px-4 py-3">{REASON_LABELS[r.reason] || r.reason}</td>
                <td className="max-w-xs px-4 py-3 text-[var(--color-text-muted)]">{r.comment || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-text-muted)]">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                      r.status === "reviewed"
                        ? "bg-brand-green-light text-brand-green"
                        : r.status === "dismissed"
                        ? "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {r.status}
                  </span>
                  {r.reviewed_by_name && (
                    <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">by {r.reviewed_by_name}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === "open" && (
                    <>
                      <button onClick={() => setStatus(r, "reviewed")} className="mr-3 text-xs font-semibold text-brand-green">
                        Mark Reviewed
                      </button>
                      <button onClick={() => setStatus(r, "dismissed")} className="text-xs font-semibold text-[var(--color-text-muted)]">
                        Dismiss
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!loading && reports.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No reports found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-[var(--color-border)] px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
          {reports.length} total
        </div>
      </div>
    </div>
  );
}

export default function QuestionReportsPage() {
  return (
    <RequireStaff feature="question_reports">
      <Shell>
        <QuestionReportsContent />
      </Shell>
    </RequireStaff>
  );
}
