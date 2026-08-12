"use client";

import { useEffect, useState } from "react";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const STATUS_STYLES = {
  approved: "bg-brand-green-light text-brand-green",
  rejected: "bg-brand-red-light text-brand-red",
  pending: "bg-yellow-100 text-yellow-700",
  suspended: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
};

function TeacherApplicationsContent() {
  const [applications, setApplications] = useState([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("status", tab);
    if (search) params.set("search", search);
    api
      .get(`/teacher-applications/?${params.toString()}`)
      .then(setApplications)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  async function approve(app) {
    await api.post(`/teacher-applications/${app.id}/approve/`, {});
    load();
  }

  async function reject(app) {
    const reason = prompt("Reason for rejection (shown to the applicant):");
    if (reason === null) return;
    await api.post(`/teacher-applications/${app.id}/reject/`, { reason });
    load();
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[var(--color-text)]">Teacher Applications</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Review and approve independent instructors applying to sell courses on the marketplace.
      </p>

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
          placeholder="Search by name or email…"
          className="hm-input w-64"
        />
      </div>

      <div className="mt-4 hm-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Qualification</th>
              <th className="px-4 py-3">Specialization</th>
              <th className="px-4 py-3">Courses</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {applications.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium text-[var(--color-text)]">{a.name}</td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{a.email}</td>
                <td className="px-4 py-3">{a.qualification || "—"}</td>
                <td className="px-4 py-3">{a.specialization || "—"}</td>
                <td className="px-4 py-3">{a.course_count}</td>
                <td className="px-4 py-3">{a.student_count}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[a.status] || ""}`}>
                    {a.status.toUpperCase()}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-text-muted)]">
                  {new Date(a.submitted_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {a.status === "pending" && (
                    <>
                      <button onClick={() => approve(a)} className="mr-3 text-xs font-semibold text-brand-green">
                        Approve
                      </button>
                      <button onClick={() => reject(a)} className="text-xs font-semibold text-brand-red">
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!loading && applications.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No applications found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-[var(--color-border)] px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
          {applications.length} total
        </div>
      </div>
    </div>
  );
}

export default function TeacherApplicationsPage() {
  return (
    <RequireStaff feature="teacher_applications">
      <Shell>
        <TeacherApplicationsContent />
      </Shell>
    </RequireStaff>
  );
}
