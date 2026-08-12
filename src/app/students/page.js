"use client";

import { useEffect, useState } from "react";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

function StudentsContent() {
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/courses/").then(setCourses);
  }, []);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (courseFilter) params.set("course", courseFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    Promise.all([
      api.get(`/auth/users/?${params.toString()}`),
      api.get("/enrollments/"),
    ])
      .then(([s, e]) => {
        setStudents(s);
        setEnrollments(e);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, courseFilter, dateFrom, dateTo]);

  async function toggleActive(student) {
    await api.patch(`/auth/users/${student.id}/`, { is_active: !student.is_active });
    load();
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[var(--color-text)]">Students</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Enrolled students with active accounts.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone, or ID…"
          className="hm-input w-64"
        />
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="hm-input w-52">
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          Enrolled from
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="hm-input w-40" />
          to
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="hm-input w-40" />
        </div>
      </div>

      <div className="mt-4 hm-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">Name</th>
              <th className="whitespace-nowrap px-4 py-3">Email</th>
              <th className="whitespace-nowrap px-4 py-3">Courses</th>
              <th className="whitespace-nowrap px-4 py-3">Access</th>
              <th className="whitespace-nowrap px-4 py-3">Active Devices</th>
              <th className="whitespace-nowrap px-4 py-3">Status</th>
              <th className="whitespace-nowrap px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {students.map((s) => {
              const myEnrollments = enrollments.filter((e) => e.user === s.id);
              const hasPackage = myEnrollments.some((e) => e.access_type === "package");
              return (
                <tr key={s.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--color-text)]">
                    {s.first_name} {s.last_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">{s.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {myEnrollments.map((e) => (
                        <span
                          key={e.id}
                          className="whitespace-nowrap rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text)]"
                        >
                          {e.course_prefix} <span className="text-[var(--color-text-muted)]">{e.student_code}</span>
                        </span>
                      ))}
                      {myEnrollments.length === 0 && <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                        hasPackage ? "bg-brand-blue/10 text-brand-blue" : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      {hasPackage ? `${myEnrollments.filter((e) => e.access_type === "package").length} package` : "Free"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{s.device_count}/3</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {s.is_active ? (
                      <span className="rounded-md bg-brand-green-light px-2 py-1 text-[10px] font-bold text-brand-green">All active</span>
                    ) : (
                      <span className="rounded-md bg-brand-red-light px-2 py-1 text-[10px] font-bold text-brand-red">Blocked</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button onClick={() => toggleActive(s)} className="text-xs font-semibold text-brand-blue">
                      {s.is_active ? "Block" : "Unblock"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-[var(--color-border)] px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
          {students.length} total
        </div>
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
