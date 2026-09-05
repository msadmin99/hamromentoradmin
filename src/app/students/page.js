"use client";

import { useEffect, useRef, useState } from "react";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import StudentsFilterCard from "@/components/students/StudentsFilterCard";
import StudentsPagination from "@/components/students/StudentsPagination";
import StudentsTable from "@/components/students/StudentsTable";
import { api } from "@/lib/api";

const DEFAULT_PAGE_SIZE = 20;

function StudentsContent() {
  const [students, setStudents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [accessFilter, setAccessFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    api.get("/courses/").then(setCourses).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (courseFilter) params.set("course", courseFilter);
    if (accessFilter) params.set("access", accessFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    api
      .get(`/auth/users/browse/?${params.toString()}`)
      .then((data) => {
        setStudents(data.results || []);
        setTotalCount(data.count || 0);
      })
      .catch((err) => setError(err.message || "Something went wrong."))
      .finally(() => setLoading(false));
  }

  // Filters materially changing should always land back on page 1. Skipped
  // on first mount (mountedFilters ref) so mount fires exactly one fetch
  // (from the [page, pageSize] effect below), not two.
  const mountedFilters = useRef(false);
  useEffect(() => {
    if (!mountedFilters.current) {
      mountedFilters.current = true;
      return undefined;
    }
    const t = setTimeout(() => {
      if (page !== 1) setPage(1);
      else load();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, courseFilter, accessFilter, statusFilter, dateFrom, dateTo]);

  useEffect(load, [page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearFilters() {
    setSearch("");
    setCourseFilter("");
    setAccessFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  }

  async function toggleActive(student) {
    setTogglingId(student.id);
    try {
      await api.patch(`/auth/users/${student.id}/`, { is_active: !student.is_active });
      load();
    } finally {
      setTogglingId(null);
    }
  }

  function changePageSize(next) {
    setPageSize(next);
    setPage(1);
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-blue/10 text-xl">
            🧑‍🎓
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text)]">Students</h1>
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
              Manage and view all enrolled students with active accounts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Adding students directly isn't available yet — students register themselves"
            className="hm-btn-outline cursor-not-allowed px-3 py-2 text-xs opacity-50"
          >
            + Add Student
          </button>
          <button
            type="button"
            disabled
            title="Export isn't available yet"
            className="hm-btn-outline cursor-not-allowed px-3 py-2 text-xs opacity-50"
          >
            ⬇ Export
          </button>
        </div>
      </div>

      <div className="mt-4">
        <StudentsFilterCard
          search={search}
          onSearchChange={setSearch}
          courseFilter={courseFilter}
          onCourseFilterChange={setCourseFilter}
          courses={courses}
          accessFilter={accessFilter}
          onAccessFilterChange={setAccessFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          onClear={clearFilters}
        />
      </div>

      <div className="mt-4 hm-card overflow-hidden shadow-sm">
        <StudentsTable
          students={students}
          loading={loading}
          error={error}
          onRetry={load}
          onToggleActive={toggleActive}
          togglingId={togglingId}
        />
        {!error && (
          <StudentsPagination
            page={page}
            pageSize={pageSize}
            count={totalCount}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={changePageSize}
          />
        )}
      </div>
    </div>
  );
}

export default function StudentsPage() {
  return (
    <RequireStaff feature="students">
      <Shell>
        <StudentsContent />
      </Shell>
    </RequireStaff>
  );
}
