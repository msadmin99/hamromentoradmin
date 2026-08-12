"use client";

import Link from "next/link";

export default function SummaryStep({ batch, onStartOver }) {
  const failed = batch.status === "failed";

  return (
    <div className="hm-card flex flex-col items-center gap-4 p-8 text-center">
      <span className="text-3xl">{failed ? "⚠️" : "✅"}</span>
      <p className="text-lg font-bold text-[var(--color-text)]">
        {failed ? "Import finished with errors" : "Import complete"}
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-2xl font-extrabold text-[var(--color-text)]">{batch.total_rows}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Total</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-brand-green">{batch.created_count}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Imported</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-brand-red">{batch.failed_count}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Failed</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-[var(--color-text-muted)]">{batch.skipped_count}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Skipped</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onStartOver} className="hm-btn-primary">
          Import another file
        </button>
        <Link href="/questions" className="hm-btn-outline">
          Go to Question Entry
        </Link>
        <Link href="/questions/import/history" className="hm-btn-outline">
          View History
        </Link>
      </div>
    </div>
  );
}
