"use client";

import Link from "next/link";
import RowActionsMenu from "@/components/examManagement/RowActionsMenu";

const SKELETON_COLS = 8;

function initialsOf(student) {
  const letter = student.first_name?.[0] || student.email?.[0] || "?";
  return letter.toUpperCase();
}

function fullName(student) {
  const name = `${student.first_name || ""} ${student.last_name || ""}`.trim();
  return name || "(no name on file)";
}

function formatDateTime(value) {
  if (!value) return { date: "—", time: "" };
  const d = new Date(value);
  return {
    date: d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

function Avatar({ student }) {
  return (
    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
      {initialsOf(student)}
    </div>
  );
}

function StatusBadge({ isActive }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-light px-2.5 py-1 text-[11px] font-bold text-brand-green">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> All active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-red-light px-2.5 py-1 text-[11px] font-bold text-brand-red">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-red" /> Blocked
    </span>
  );
}

function AccessBadge({ enrollments }) {
  const packageCount = enrollments.filter((e) => e.access_type === "package").length;
  if (packageCount === 0) {
    return (
      <span className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-text-muted)]">
        Free
      </span>
    );
  }
  return (
    <span className="rounded-full bg-brand-blue/10 px-2.5 py-1 text-[11px] font-bold text-brand-blue">
      {packageCount} Package{packageCount > 1 ? "s" : ""}
    </span>
  );
}

function CourseBadges({ enrollments }) {
  if (enrollments.length === 0) {
    return <span className="text-xs text-[var(--color-text-muted)]">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {enrollments.map((e) => (
        <span
          key={e.id}
          className="whitespace-nowrap rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text)]"
          title={`${e.course_prefix} — ${e.student_code}`}
        >
          {e.course_prefix} <span className="text-[var(--color-text-muted)]">{e.student_code}</span>
        </span>
      ))}
    </div>
  );
}

function DeviceCount({ count }) {
  const full = count >= 3;
  return (
    <span className={`text-xs font-semibold ${full ? "text-brand-red" : "text-[var(--color-text)]"}`}>{count}/3</span>
  );
}

function ActionButtons({ student, onToggleActive, toggling }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/students/${student.id}`}
        prefetch={false}
        title="View student"
        aria-label={`View ${fullName(student)}`}
        className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </Link>
      <Link
        href={`/students/${student.id}`}
        prefetch={false}
        title="Edit student"
        aria-label={`Edit ${fullName(student)}`}
        className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </Link>
      <RowActionsMenu
        items={[
          {
            label: student.is_active ? "🚫 Block" : "✅ Unblock",
            onClick: () => onToggleActive(student),
            disabled: toggling,
          },
        ]}
      />
    </div>
  );
}

function SkeletonRows({ count = 8 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={`sk-${i}`} aria-hidden>
      {Array.from({ length: SKELETON_COLS }).map((__, j) => (
        <td key={j} className="px-4 py-3.5">
          <div className="h-3 w-full animate-pulse rounded bg-[var(--color-surface-muted)]" />
        </td>
      ))}
    </tr>
  ));
}

export default function StudentsTable({ students, loading, error, onRetry, onToggleActive, togglingId }) {
  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--color-surface-muted)] text-left text-xs font-semibold text-[var(--color-text-muted)]">
            <tr>
              <th scope="col" className="px-4 py-3">Student</th>
              <th scope="col" className="px-4 py-3">Contact</th>
              <th scope="col" className="px-4 py-3">Courses</th>
              <th scope="col" className="px-4 py-3">Access</th>
              <th scope="col" className="px-4 py-3">Active Devices</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Joined</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading && <SkeletonRows />}
            {!loading && !error &&
              students.map((s) => {
                const joined = formatDateTime(s.date_joined);
                return (
                  <tr key={s.id} className="transition-colors hover:bg-[var(--color-surface-muted)]/60">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar student={s} />
                        <div className="min-w-0">
                          <Link href={`/students/${s.id}`} prefetch={false} className="block truncate font-semibold text-[var(--color-text)] hover:text-brand-blue">
                            {fullName(s)}
                          </Link>
                          <p className="text-[11px] text-[var(--color-text-muted)]">ID {s.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[220px] px-4 py-3.5">
                      <p className="truncate text-[var(--color-text)]" title={s.email}>{s.email}</p>
                      {s.phone && <p className="text-[11px] text-[var(--color-text-muted)]">{s.phone}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <CourseBadges enrollments={s.enrollments || []} />
                    </td>
                    <td className="px-4 py-3.5">
                      <AccessBadge enrollments={s.enrollments || []} />
                    </td>
                    <td className="px-4 py-3.5">
                      <DeviceCount count={s.device_count} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge isActive={s.is_active} />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[var(--color-text)]">{joined.date}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{joined.time}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <ActionButtons student={s} onToggleActive={onToggleActive} toggling={togglingId === s.id} />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {!loading && !error && students.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-3xl">🔍</p>
            <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">No students found</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Try adjusting your search or filters.</p>
          </div>
        )}
        {error && (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-brand-red">Couldn&apos;t load students</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{error}</p>
            <button onClick={onRetry} className="hm-btn-outline mt-3 px-4 py-1.5 text-xs">
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Mobile card list — Student / Courses / Access / Status / Actions only, per spec */}
      <div className="divide-y divide-[var(--color-border)] md:hidden">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`m-sk-${i}`} className="h-24 animate-pulse bg-[var(--color-surface-muted)]" aria-hidden />
          ))}
        {!loading && !error &&
          students.map((s) => (
            <div key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar student={s} />
                  <div className="min-w-0">
                    <Link href={`/students/${s.id}`} prefetch={false} className="block truncate font-semibold text-[var(--color-text)]">
                      {fullName(s)}
                    </Link>
                    <p className="truncate text-[11px] text-[var(--color-text-muted)]">{s.email}</p>
                  </div>
                </div>
                <ActionButtons student={s} onToggleActive={onToggleActive} toggling={togglingId === s.id} />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <CourseBadges enrollments={s.enrollments || []} />
                <AccessBadge enrollments={s.enrollments || []} />
                <StatusBadge isActive={s.is_active} />
              </div>
            </div>
          ))}
        {!loading && !error && students.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[var(--color-text)]">No students found</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Try adjusting your search or filters.</p>
          </div>
        )}
        {error && (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-brand-red">Couldn&apos;t load students</p>
            <button onClick={onRetry} className="hm-btn-outline mt-3 px-4 py-1.5 text-xs">
              Retry
            </button>
          </div>
        )}
      </div>
    </>
  );
}
