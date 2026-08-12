"use client";

import { useEffect, useState } from "react";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const STATUS_STYLES = {
  completed: "bg-brand-green-light text-brand-green",
  failed: "bg-brand-red-light text-brand-red",
  rolled_back: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
  importing: "bg-yellow-100 text-yellow-800",
  ready: "bg-blue-100 text-blue-800",
};

function formatDate(value) {
  return new Date(value).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function HistoryContent() {
  const [batches, setBatches] = useState(null);
  const [rollingBackId, setRollingBackId] = useState(null);
  const [error, setError] = useState("");

  function load() {
    api.get("/import-batches/").then(setBatches);
  }

  useEffect(load, []);

  async function rollback(id) {
    if (!confirm("Roll back this import? Every question it created (that hasn't been used in a Test) will be deleted.")) return;
    setRollingBackId(id);
    setError("");
    try {
      await api.post(`/import-batches/${id}/rollback/`, {});
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRollingBackId(null);
    }
  }

  return (
    <div className="p-6">
      <a href="/questions/import" className="text-xs font-semibold text-brand-blue">
        ← Back to Import
      </a>
      <h1 className="mt-2 text-xl font-bold text-[var(--color-text)]">Import History</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Every bulk import, who ran it, and its outcome.</p>

      {error && <p className="mt-3 text-sm font-medium text-brand-red">{error}</p>}

      <div className="mt-4 hm-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Format</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Failed</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {(batches || []).map((b) => (
              <tr key={b.id}>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--color-text)]">{b.file_name}</td>
                <td className="whitespace-nowrap px-4 py-3 uppercase text-[var(--color-text-muted)]">{b.file_format}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">{b.uploaded_by_email || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">{formatDate(b.created_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-brand-green">{b.created_count}</td>
                <td className="whitespace-nowrap px-4 py-3 text-brand-red">{b.failed_count}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[b.status] || ""}`}>
                    {b.status.replace("_", " ").toUpperCase()}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {b.status === "completed" && (
                    <button
                      onClick={() => rollback(b.id)}
                      disabled={rollingBackId === b.id}
                      className="text-xs font-semibold text-brand-red"
                    >
                      {rollingBackId === b.id ? "Rolling back…" : "Rollback"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {batches !== null && batches.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No imports yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ImportHistoryPage() {
  return (
    <RequireStaff feature="question_entry">
      <Shell>
        <HistoryContent />
      </Shell>
    </RequireStaff>
  );
}
