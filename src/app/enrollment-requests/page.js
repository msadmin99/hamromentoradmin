"use client";

import { useEffect, useState } from "react";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
];

function EnrollmentRequestsContent() {
  const [requests, setRequests] = useState([]);
  const [courses, setCourses] = useState([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/courses/").then(setCourses);
  }, []);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("status", tab);
    if (search) params.set("search", search);
    if (courseFilter) params.set("course", courseFilter);
    api
      .get(`/enrollment-requests/?${params.toString()}`)
      .then((data) => {
        const sorted = [...data].sort((a, b) =>
          sort === "newest"
            ? new Date(b.submitted_at) - new Date(a.submitted_at)
            : new Date(a.submitted_at) - new Date(b.submitted_at)
        );
        setRequests(sorted);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, courseFilter, sort]);

  async function approve(req) {
    await api.post(`/enrollment-requests/${req.id}/approve/`, {});
    load();
  }
  async function decline(req) {
    await api.post(`/enrollment-requests/${req.id}/decline/`, {});
    load();
  }
  async function remove(id) {
    if (!confirm("Delete this request?")) return;
    await api.del(`/enrollment-requests/${id}/`);
    load();
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[var(--color-text)]">Enrollment Requests</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Review and approve premium upgrade requests.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-[var(--color-border)] p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                tab === t.key ? "bg-brand-blue text-white" : "text-[var(--color-text-muted)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or student ID…"
          className="hm-input w-64"
        />
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="hm-input w-48">
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="hm-input w-36">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      <div className="mt-4 hm-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Student ID</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Package(s)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-[var(--color-text)]">{r.student_name}</td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{r.email}</td>
                <td className="px-4 py-3">
                  {r.student_code && (
                    <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs">{r.student_code}</span>
                  )}
                </td>
                <td className="px-4 py-3">{r.course_name}</td>
                <td className="px-4 py-3">
                  {r.package_name && (
                    <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs">{r.package_name}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                      r.status === "approved"
                        ? "bg-brand-green-light text-brand-green"
                        : r.status === "declined"
                        ? "bg-brand-red-light text-brand-red"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-text-muted)]">
                  {new Date(r.submitted_at).toLocaleDateString()}{" "}
                  {new Date(r.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === "pending" ? (
                    <>
                      <button onClick={() => approve(r)} className="mr-3 text-xs font-semibold text-brand-green">
                        Approve
                      </button>
                      <button onClick={() => decline(r)} className="mr-3 text-xs font-semibold text-brand-red">
                        Decline
                      </button>
                    </>
                  ) : null}
                  <button onClick={() => remove(r.id)} className="text-brand-red">
                    🗑
                  </button>
                </td>
              </tr>
            ))}
            {!loading && requests.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-[var(--color-border)] px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
          {requests.length} total
        </div>
      </div>
    </div>
  );
}

export default function EnrollmentRequestsPage() {
  return (
    <RequireStaff feature="enrollment_requests">
      <Shell>
        <EnrollmentRequestsContent />
      </Shell>
    </RequireStaff>
  );
}
