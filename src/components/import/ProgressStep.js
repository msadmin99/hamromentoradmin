"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

function formatSeconds(s) {
  if (s == null) return "calculating…";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function ProgressStep({ batchId, onFinished }) {
  const [status, setStatus] = useState(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    function poll() {
      api.get(`/import-batches/${batchId}/status/`).then((data) => {
        if (cancelled) return;
        setStatus(data);
        if (["completed", "failed", "rolled_back"].includes(data.status)) {
          if (!finishedRef.current) {
            finishedRef.current = true;
            onFinished(data);
          }
          return;
        }
        setTimeout(poll, 1200);
      });
    }
    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  if (!status) {
    return <p className="text-sm text-[var(--color-text-muted)]">Starting import…</p>;
  }

  return (
    <div className="hm-card flex flex-col items-center gap-4 p-8 text-center">
      <p className="text-sm font-bold text-[var(--color-text)]">Importing {status.total_rows} question(s)…</p>
      <div className="h-3 w-full max-w-md overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
        <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${status.progress_percent}%` }} />
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        {status.progress_percent}% complete · Est. remaining: {formatSeconds(status.estimated_remaining_seconds)}
      </p>
      <div className="flex gap-4 text-xs">
        <span className="text-brand-green">✓ {status.created_count} created</span>
        <span className="text-brand-red">✗ {status.failed_count} failed</span>
        <span className="text-[var(--color-text-muted)]">⤼ {status.skipped_count} skipped</span>
      </div>
    </div>
  );
}
