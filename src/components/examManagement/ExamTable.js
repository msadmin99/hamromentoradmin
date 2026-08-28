"use client";

import Link from "next/link";
import { EXAM_TYPE_LABELS, STATUS_BADGE, hasFeature } from "./constants";
import RowActionsMenu from "./RowActionsMenu";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_LABEL = { published: "Published", draft: "Draft", scheduled: "Scheduled" };

function StatusBadge({ status }) {
  return (
    <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${STATUS_BADGE[status] || STATUS_BADGE.draft}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function TypeBadge({ examType }) {
  return (
    <span className="rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-[10px] font-bold text-[var(--color-text)]">
      {EXAM_TYPE_LABELS[examType] || examType}
    </span>
  );
}

function ProgramPath({ row }) {
  const courses = row.courses_detail || [];
  if (courses.length === 0) return <span className="text-[var(--color-text-muted)]">Unassigned</span>;
  const programs = [...new Set(courses.map((c) => c.program_group).filter(Boolean))];
  return (
    <div>
      <p className="text-[var(--color-text)]">{programs.join(", ") || "—"}</p>
      <p className="text-[11px] text-[var(--color-text-muted)]">{courses.map((c) => c.name).join(", ")}</p>
    </div>
  );
}

function rowActions({ row, user, onSchedule, onViewSessions, onEdit, onDuplicate, onArchiveToggle, onDelete, busy }) {
  const canSchedule = hasFeature(user, "exam_schedule");
  const canArchive = hasFeature(user, "exam_archive");
  const canDelete = hasFeature(user, "exam_delete");
  return [
    canSchedule && { label: row.hasHistory ? "🔄 Reschedule" : "🗓️ Schedule", onClick: () => onSchedule(row) },
    !row.hasHistory && row.raw && { label: "✏️ Edit", onClick: () => onEdit(row.raw) },
    { label: "🧬 Duplicate", onClick: () => onDuplicate(row), disabled: busy },
    row.hasHistory && { label: "📋 View Sessions & Participants", onClick: () => onViewSessions(row) },
    canArchive && {
      label: row.status === "draft" ? "📤 Publish" : "📥 Archive (Unpublish)",
      onClick: () => onArchiveToggle(row),
    },
    canDelete && { label: "🗑️ Delete", onClick: () => onDelete(row), danger: true },
  ];
}

export default function ExamTable({
  rows,
  loading,
  emptyReason,
  count,
  page,
  pageSize,
  onPageChange,
  user,
  onSchedule,
  onViewSessions,
  onEdit,
  onDuplicate,
  onArchiveToggle,
  onDelete,
  busyKey,
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const startRow = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(count, page * pageSize);

  return (
    <div className="hm-card mt-4 overflow-hidden">
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Exam Name</th>
              <th className="px-4 py-3">Program &amp; Academic Area</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Questions</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Participants</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skeleton-${i}`} aria-hidden>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 w-full animate-pulse rounded bg-[var(--color-surface-muted)]" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              rows.map((row) => (
                <tr key={row.key}>
                  <td className="px-4 py-3">
                    <Link href={`/exam-management/${row.linkId}`} className="font-medium text-[var(--color-text)] hover:text-brand-blue">
                      {row.title}
                    </Link>
                    {row.exam_code && <p className="text-[11px] text-[var(--color-text-muted)]">{row.exam_code}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <ProgramPath row={row} />
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge examType={row.exam_type} />
                  </td>
                  <td className="px-4 py-3">{row.question_count}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.duration_minutes ? `${row.duration_minutes} min` : "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">{row.participant_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/exam-management/${row.linkId}`} aria-label={`View ${row.title}`} className="text-xs font-semibold text-brand-blue">
                        View
                      </Link>
                      <RowActionsMenu
                        items={rowActions({
                          row,
                          user,
                          onSchedule,
                          onViewSessions,
                          onEdit,
                          onDuplicate,
                          onArchiveToggle,
                          onDelete,
                          busy: busyKey === row.key,
                        })}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center">
                  <p className="text-sm font-semibold text-[var(--color-text)]">No exams found</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{emptyReason}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="divide-y divide-[var(--color-border)] md:hidden">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`m-skeleton-${i}`} className="h-24 animate-pulse bg-[var(--color-surface-muted)]" aria-hidden />
          ))}
        {!loading &&
          rows.map((row) => (
            <div key={row.key} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/exam-management/${row.linkId}`} className="font-medium text-[var(--color-text)]">
                  {row.title}
                </Link>
                <RowActionsMenu
                  items={rowActions({
                    row,
                    user,
                    onSchedule,
                    onViewSessions,
                    onEdit,
                    onDuplicate,
                    onArchiveToggle,
                    onDelete,
                    busy: busyKey === row.key,
                  })}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TypeBadge examType={row.exam_type} />
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {row.question_count} questions · {row.duration_minutes ? `${row.duration_minutes} min` : "no timer"} ·{" "}
                {row.participant_count} participants
              </p>
            </div>
          ))}
        {!loading && rows.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-[var(--color-text)]">No exams found</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{emptyReason}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-between gap-2 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row">
        <p className="text-xs text-[var(--color-text-muted)]">
          {count > 0 ? `Showing ${startRow} to ${endRow} of ${count} exams` : "Showing 0 exams"}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="hm-btn-outline h-8 w-8 !p-0 text-xs disabled:opacity-40"
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="px-2 text-xs font-semibold text-[var(--color-text)]">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="hm-btn-outline h-8 w-8 !p-0 text-xs disabled:opacity-40"
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
