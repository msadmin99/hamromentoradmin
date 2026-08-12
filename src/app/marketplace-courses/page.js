"use client";

import { useEffect, useState } from "react";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const TABS = [
  { key: "", label: "All" },
  { key: "pending_review", label: "Pending Review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "draft", label: "Draft" },
];

const STATUS_STYLES = {
  approved: "bg-brand-green-light text-brand-green",
  rejected: "bg-brand-red-light text-brand-red",
  pending_review: "bg-yellow-100 text-yellow-700",
  draft: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
  archived: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
};

function MarketplaceCoursesContent() {
  const [courses, setCourses] = useState([]);
  const [tab, setTab] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab) params.set("status", tab);
    api
      .get(`/teacher-courses/?${params.toString()}`)
      .then(setCourses)
      .finally(() => setLoading(false));
  }

  useEffect(load, [tab]);

  async function approve(course) {
    await api.post(`/teacher-courses/${course.id}/approve/`, {});
    load();
  }

  async function reject(course) {
    const reason = prompt("Reason for rejection (shown to the teacher):");
    if (reason === null) return;
    await api.post(`/teacher-courses/${course.id}/reject/`, { reason });
    load();
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[var(--color-text)]">Marketplace Courses</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Every course across every teacher — review submissions and moderate published content.
      </p>

      <div className="mt-4 flex rounded-lg border border-[var(--color-border)] p-0.5" style={{ width: "fit-content" }}>
        {TABS.map((t) => (
          <button
            key={t.key || "all"}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              tab === t.key ? "bg-brand-blue text-white" : "text-[var(--color-text-muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 hm-card overflow-hidden">
        {loading && <p className="p-4 text-sm text-[var(--color-text-muted)]">Loading…</p>}
        {!loading &&
          courses.map((c) => (
            <div key={c.id} className="border-b border-[var(--color-border)] last:border-0">
              <button
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="flex-1 truncate text-sm font-medium text-[var(--color-text)]">{c.title}</span>
                <span className="flex-none text-xs text-[var(--color-text-muted)]">by {c.teacher_name}</span>
                <span className="flex-none text-xs text-[var(--color-text-muted)]">
                  {c.section_count} section{c.section_count === 1 ? "" : "s"} · {c.lesson_count} lesson{c.lesson_count === 1 ? "" : "s"}
                </span>
                <span className={`flex-none rounded-md px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[c.status] || ""}`}>
                  {c.status.replace("_", " ").toUpperCase()}
                </span>
                {c.status === "pending_review" && (
                  <span className="flex-none">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        approve(c);
                      }}
                      className="mr-3 text-xs font-semibold text-brand-green"
                    >
                      Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        reject(c);
                      }}
                      className="text-xs font-semibold text-brand-red"
                    >
                      Reject
                    </button>
                  </span>
                )}
              </button>
              {expandedId === c.id && (
                <div className="bg-[var(--color-surface-muted)] px-4 py-3 text-xs text-[var(--color-text-muted)]">
                  <p>{c.short_description || "No description."}</p>
                  <p className="mt-1">
                    Price: {c.is_free ? "Free" : `Rs. ${c.price}`} · Level: {c.level || "—"} · Access:{" "}
                    {c.access_duration_type.replace("_", " ")}
                  </p>
                  {c.rejection_reason && <p className="mt-1 text-brand-red">Rejection reason: {c.rejection_reason}</p>}
                  {c.sections.map((s) => (
                    <div key={s.id} className="mt-2">
                      <p className="font-semibold text-[var(--color-text)]">{s.title}</p>
                      <ul className="ml-4 list-disc">
                        {s.lessons.map((l) => (
                          <li key={l.id}>
                            [{l.lesson_type}] {l.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        {!loading && courses.length === 0 && <p className="p-4 text-center text-sm text-[var(--color-text-muted)]">No courses found.</p>}
      </div>
    </div>
  );
}

export default function MarketplaceCoursesPage() {
  return (
    <RequireStaff feature="marketplace_courses">
      <Shell>
        <MarketplaceCoursesContent />
      </Shell>
    </RequireStaff>
  );
}
