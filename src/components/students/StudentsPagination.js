"use client";

const PAGE_SIZE_OPTIONS = [20, 50];

function pageWindow(current, totalPages) {
  // Always show first, last, current, and one neighbor on each side;
  // collapse the rest into a single "…" — standard windowed pagination.
  const pages = new Set([1, totalPages, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const withGaps = [];
  let prev = null;
  for (const p of sorted) {
    if (prev !== null && p - prev > 1) withGaps.push("…");
    withGaps.push(p);
    prev = p;
  }
  return withGaps;
}

export default function StudentsPagination({ page, pageSize, count, loading, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const startRow = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(count, page * pageSize);
  const pages = pageWindow(page, totalPages);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row">
      <p className="text-xs text-[var(--color-text-muted)]">
        {count > 0 ? `Showing ${startRow} to ${endRow} of ${count} students` : "Showing 0 students"}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={loading}
            aria-label="Students per page"
            className="hm-input h-8 w-auto !py-0 text-xs"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </label>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(1)}
              aria-label="First page"
              title="First page"
              className="hm-btn-outline h-8 w-8 !p-0 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              «
            </button>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
              title="Previous page"
              className="hm-btn-outline h-8 w-8 !p-0 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              ‹
            </button>
            {pages.map((p, i) =>
              p === "…" ? (
                <span key={`gap-${i}`} className="px-1 text-xs text-[var(--color-text-muted)]">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  disabled={loading}
                  onClick={() => onPageChange(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? "page" : undefined}
                  className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${
                    p === page
                      ? "bg-brand-blue text-white"
                      : "text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
              title="Next page"
              className="hm-btn-outline h-8 w-8 !p-0 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              ›
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(totalPages)}
              aria-label="Last page"
              title="Last page"
              className="hm-btn-outline h-8 w-8 !p-0 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
