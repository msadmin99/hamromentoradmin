"use client";

import { useEffect, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Modal from "@/components/Modal";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function emptyCourseForm() {
  return { name: "", prefix: "", program_group: "", order: 0, icon: "📘", color: "#0b5fd9", description: "", is_active: true };
}
function emptyPackageForm() {
  return { name: "", price: 0, duration_days: "" };
}

function CoursesContent() {
  const { user } = useAuth();
  const isSuperAdmin = user?.is_superuser || !user?.admin_role || user.admin_role === "super_admin";

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [courseForm, setCourseForm] = useState(emptyCourseForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [packageCourse, setPackageCourse] = useState(null);
  const [packageForm, setPackageForm] = useState(emptyPackageForm());
  const [packageError, setPackageError] = useState("");
  const [deleteCourseTarget, setDeleteCourseTarget] = useState(null);
  const [deletePackageTarget, setDeletePackageTarget] = useState(null);

  function load() {
    setLoading(true);
    api
      .get("/courses/")
      .then(setCourses)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditingId(null);
    setCourseForm(emptyCourseForm());
    setError("");
    setShowCourseForm(true);
  }

  function openEdit(c) {
    setEditingId(c.id);
    setCourseForm({
      name: c.name,
      prefix: c.prefix,
      program_group: c.program_group || "",
      order: c.order,
      icon: c.icon,
      color: c.color,
      description: c.description || "",
      is_active: c.is_active,
    });
    setError("");
    setShowCourseForm(true);
  }

  async function saveCourse(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/courses/${editingId}/`, courseForm);
      } else {
        await api.post("/courses/", courseForm);
      }
      setShowCourseForm(false);
      setCourseForm(emptyCourseForm());
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function deleteCourse(course) {
    setDeleteCourseTarget(course);
  }

  async function runDeleteCourse(id) {
    await api.del(`/courses/${id}/`);
    load();
  }

  async function addPackage(e) {
    e.preventDefault();
    setPackageError("");
    try {
      await api.post("/course-packages/", {
        ...packageForm,
        course: packageCourse.id,
        duration_days: packageForm.duration_days || null,
      });
      setPackageForm(emptyPackageForm());
      load();
      const updated = await api.get(`/courses/${packageCourse.id}/`).catch(() => null);
      if (updated) setPackageCourse(updated);
    } catch (err) {
      setPackageError(err.message);
    }
  }

  function deletePackage(pkg) {
    setDeletePackageTarget(pkg);
  }

  async function runDeletePackage(id) {
    await api.del(`/course-packages/${id}/`);
    load();
    const updated = await api.get(`/courses/${packageCourse.id}/`).catch(() => null);
    if (updated) setPackageCourse(updated);
  }

  const grouped = courses.reduce((acc, c) => {
    const group = c.program_group || "Other";
    (acc[group] = acc[group] || []).push(c);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Courses</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Program tracks students can enroll in.</p>
        </div>
        <button onClick={openCreate} className="hm-btn-primary">
          + Add course
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">
        Active courses appear automatically as cards in the homepage&apos;s &quot;Choose your course&quot; section.
      </p>

      {loading && <p className="mt-6 text-sm text-[var(--color-text-muted)]">Loading…</p>}

      {Object.entries(grouped).map(([group, list]) => (
        <div key={group} className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{group}</p>
          <div className="hm-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Prefix</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3">Packages</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {list.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                      <span className="mr-1.5">{c.icon}</span>
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{c.prefix}</td>
                    <td className="px-4 py-3">{c.student_count}</td>
                    <td className="px-4 py-3">{c.question_count}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setPackageCourse(c)} className="text-xs font-semibold text-brand-blue">
                        {c.packages.length} package{c.packages.length === 1 ? "" : "s"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {c.is_active ? (
                        <span className="rounded-md bg-brand-green-light px-2 py-1 text-[10px] font-bold text-brand-green">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-[10px] font-bold text-[var(--color-text-muted)]">
                          HIDDEN
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(c)} className="mr-3 text-xs font-semibold text-brand-blue">
                        Edit
                      </button>
                      <button onClick={() => deleteCourse(c)} className="text-xs font-semibold text-brand-red">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {showCourseForm && (
        <Modal title={editingId ? "Edit course" : "Add course"} onClose={() => setShowCourseForm(false)} wide>
          <form onSubmit={saveCourse} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Name</label>
                <input
                  required
                  value={courseForm.name}
                  onChange={(e) => setCourseForm((f) => ({ ...f, name: e.target.value }))}
                  className="hm-input"
                  placeholder="e.g. CEE-MD Ayurveda"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                  Prefix (matches Excel &quot;Course Prefix&quot; column)
                </label>
                <input
                  required
                  value={courseForm.prefix}
                  onChange={(e) => setCourseForm((f) => ({ ...f, prefix: e.target.value.toUpperCase() }))}
                  className="hm-input"
                  placeholder="e.g. AYU"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                  Program group
                </label>
                <input
                  value={courseForm.program_group}
                  onChange={(e) => setCourseForm((f) => ({ ...f, program_group: e.target.value }))}
                  className="hm-input"
                  placeholder="e.g. CEE-PG, CEE-UG, NMCLE"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Order</label>
                <input
                  type="number"
                  value={courseForm.order}
                  onChange={(e) => setCourseForm((f) => ({ ...f, order: Number(e.target.value) }))}
                  className="hm-input"
                />
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] p-3">
              <p className="mb-2 text-xs font-bold text-[var(--color-text)]">Homepage course card</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Icon (emoji)</label>
                  <input
                    value={courseForm.icon}
                    onChange={(e) => setCourseForm((f) => ({ ...f, icon: e.target.value }))}
                    className="hm-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Accent color (hex)</label>
                  <input
                    value={courseForm.color}
                    onChange={(e) => setCourseForm((f) => ({ ...f, color: e.target.value }))}
                    className="hm-input"
                    placeholder="#0b5fd9"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Description</label>
                <textarea
                  rows={2}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))}
                  className="hm-input"
                />
              </div>
              <label className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] p-3 text-sm">
                <span>
                  <span className="font-semibold text-[var(--color-text)]">Show on homepage</span>
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    Off hides this course&apos;s card from &quot;Choose your course&quot; without deleting it.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={courseForm.is_active}
                  onChange={(e) => setCourseForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
              </label>
            </div>

            {error && <p className="text-xs font-medium text-brand-red">{error}</p>}
            <button type="submit" disabled={saving} className="hm-btn-primary mt-2">
              {saving ? "Saving…" : editingId ? "Save changes" : "Create course"}
            </button>
          </form>
        </Modal>
      )}

      {packageCourse && (
        <Modal title={`Packages — ${packageCourse.name}`} onClose={() => setPackageCourse(null)}>
          <div className="flex flex-col gap-2">
            {packageCourse.packages.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-[var(--color-text)]">{p.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Rs. {p.price} · {p.duration_days ? `${p.duration_days} days` : "Lifetime"}
                  </p>
                </div>
                {isSuperAdmin && (
                  <button onClick={() => deletePackage(p)} className="text-xs font-semibold text-brand-red">
                    Delete
                  </button>
                )}
              </div>
            ))}
            {packageCourse.packages.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)]">No packages yet.</p>
            )}
          </div>

          {isSuperAdmin ? (
            <form onSubmit={addPackage} className="mt-4 flex flex-col gap-2 border-t border-[var(--color-border)] pt-4">
              <p className="text-xs font-semibold text-[var(--color-text-muted)]">Add a package (Super Admin only)</p>
              <input
                required
                value={packageForm.name}
                onChange={(e) => setPackageForm((f) => ({ ...f, name: e.target.value }))}
                className="hm-input"
                placeholder="e.g. Full Access Package (3 Months)"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  required
                  value={packageForm.price}
                  onChange={(e) => setPackageForm((f) => ({ ...f, price: e.target.value }))}
                  className="hm-input"
                  placeholder="Price (Rs.)"
                />
                <input
                  type="number"
                  value={packageForm.duration_days}
                  onChange={(e) => setPackageForm((f) => ({ ...f, duration_days: e.target.value }))}
                  className="hm-input"
                  placeholder="Duration days (blank = lifetime)"
                />
              </div>
              {packageError && <p className="text-xs font-medium text-brand-red">{packageError}</p>}
              <button type="submit" className="hm-btn-outline">
                + Add package
              </button>
            </form>
          ) : (
            <p className="mt-4 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-text-muted)]">
              Only Super Admin accounts can create or edit packages.
            </p>
          )}
        </Modal>
      )}

      {deleteCourseTarget && (
        <ConfirmDeleteModal
          itemLabel={deleteCourseTarget.name}
          requireTyped
          consequences={[
            "Removes the course itself along with its packages.",
            "Blocked automatically if any student is enrolled or subscribed to it.",
          ]}
          onCancel={() => setDeleteCourseTarget(null)}
          onConfirm={async () => {
            await runDeleteCourse(deleteCourseTarget.id);
            setDeleteCourseTarget(null);
          }}
        />
      )}

      {deletePackageTarget && (
        <ConfirmDeleteModal
          itemLabel={deletePackageTarget.name}
          consequences={["Students already on this package keep their access; only new purchases are affected."]}
          onCancel={() => setDeletePackageTarget(null)}
          onConfirm={async () => {
            await runDeletePackage(deletePackageTarget.id);
            setDeletePackageTarget(null);
          }}
        />
      )}
    </div>
  );
}

export default function CoursesPage() {
  return (
    <RequireStaff feature="courses">
      <Shell>
        <CoursesContent />
      </Shell>
    </RequireStaff>
  );
}
