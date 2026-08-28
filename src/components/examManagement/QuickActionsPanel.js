"use client";

import Link from "next/link";
import { hasFeature } from "./constants";

/** Every action here routes to something that already exists — Create Exam
 * reuses the same wizard/API as the main "+ Create Exam" button (just
 * pre-selecting a type), Import Questions CSV reuses the existing
 * /questions/import bulk-importer, Schedule Exam Session reuses the
 * existing per-exam reschedule flow via a small exam picker. Nothing here
 * is a new subsystem. */
export default function QuickActionsPanel({ user, onCreateExam, onScheduleClick }) {
  const canSchedule = hasFeature(user, "exam_schedule");

  return (
    <div className="hm-card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Quick Actions</p>
      <div className="mt-3 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onCreateExam("mock")}
          className="flex items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
        >
          <span>➕ Create Exam</span>
          <span aria-hidden>›</span>
        </button>
        <button
          type="button"
          onClick={() => onCreateExam("qbank")}
          className="flex items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
        >
          <span>📚 Create Question Bank</span>
          <span aria-hidden>›</span>
        </button>
        {canSchedule && (
          <button
            type="button"
            onClick={onScheduleClick}
            className="flex items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
          >
            <span>🗓️ Schedule Exam Session</span>
            <span aria-hidden>›</span>
          </button>
        )}
        <Link
          href="/questions/import"
          className="flex items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
        >
          <span>⬆️ Import Questions (CSV)</span>
          <span aria-hidden>›</span>
        </Link>
      </div>
    </div>
  );
}
