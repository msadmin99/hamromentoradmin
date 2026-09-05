"use client";

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function StudentsFilterCard({
  search,
  onSearchChange,
  courseFilter,
  onCourseFilterChange,
  courses,
  accessFilter,
  onAccessFilterChange,
  statusFilter,
  onStatusFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClear,
}) {
  const hasActiveFilters = Boolean(search || courseFilter || accessFilter || statusFilter || dateFrom || dateTo);

  return (
    <div className="hm-card p-4 shadow-sm">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
          <SearchIcon />
        </span>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search students by name, email, phone, or ID…"
          aria-label="Search students"
          className="hm-input pl-9"
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <select
          value={courseFilter}
          onChange={(e) => onCourseFilterChange(e.target.value)}
          aria-label="Filter by course"
          className="hm-input"
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={accessFilter}
          onChange={(e) => onAccessFilterChange(e.target.value)}
          aria-label="Filter by access"
          className={`hm-input ${accessFilter ? "border-brand-blue text-brand-blue font-semibold" : ""}`}
        >
          <option value="">All Access</option>
          <option value="free">Free</option>
          <option value="package">Package</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          aria-label="Filter by status"
          className={`hm-input ${statusFilter ? "border-brand-blue text-brand-blue font-semibold" : ""}`}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span className="font-medium">Enrolled from</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            aria-label="Enrolled from date"
            className="hm-input w-40"
          />
          <span>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            aria-label="Enrolled to date"
            className="hm-input w-40"
          />
        </div>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
          className="hm-btn-outline px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
