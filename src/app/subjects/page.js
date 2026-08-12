"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import CoursePicker from "@/components/CoursePicker";
import EditableName from "@/components/EditableName";
import Modal from "@/components/Modal";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const emptyForm = { name: "", prefix: "", icon: "📘", order: 0, courses: [], is_free: true };

const ROMAN_NUMERALS = [
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
  "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx",
];

function unitLetter(index) {
  return String.fromCharCode(65 + (index % 26));
}

function chapterNumeral(index) {
  return ROMAN_NUMERALS[index] || `${index + 1}`;
}

function UnitBlock({ unit, index, onRefresh }) {
  const [newChapterName, setNewChapterName] = useState("");
  const [addingChapter, setAddingChapter] = useState(false);

  async function addChapter(e) {
    e.preventDefault();
    if (!newChapterName.trim()) return;
    setAddingChapter(true);
    try {
      await api.post("/topics/", { chapter: unit.id, name: newChapterName.trim(), order: unit.topics.length });
      setNewChapterName("");
      await onRefresh();
    } finally {
      setAddingChapter(false);
    }
  }

  async function renameUnit(name) {
    await api.patch(`/chapters/${unit.id}/`, { name });
    await onRefresh();
  }

  async function renameChapter(id, name) {
    await api.patch(`/topics/${id}/`, { name });
    await onRefresh();
  }

  async function deleteChapter(id) {
    await api.del(`/topics/${id}/`);
    await onRefresh();
  }

  async function deleteUnit() {
    if (!confirm(`Delete the unit "${unit.name}" and all its chapters/questions?`)) return;
    await api.del(`/chapters/${unit.id}/`);
    await onRefresh();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
      <div className="flex items-center gap-2 bg-[var(--color-surface-muted)] px-4 py-2.5">
        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-blue/10 text-[10px] font-bold text-brand-blue">
          {unitLetter(index)}
        </span>
        <EditableName value={unit.name} onSave={renameUnit} textClassName="text-sm font-semibold text-[var(--color-text)]" />
        <span className="ml-auto flex-none text-[10px] font-medium text-[var(--color-text-muted)]">
          {unit.mcq_count} question{unit.mcq_count === 1 ? "" : "s"}
        </span>
        <button onClick={deleteUnit} className="flex-none text-xs text-brand-red" aria-label="Delete unit">
          🗑
        </button>
      </div>

      <div className="divide-y divide-[var(--color-border)] px-4">
        {unit.topics.map((ch, ci) => (
          <div key={ch.id} className="flex items-center gap-2 py-2 pl-6">
            <span className="flex-none font-mono text-xs text-[var(--color-text-muted)]">{chapterNumeral(ci)}.</span>
            <EditableName
              value={ch.name}
              onSave={(name) => renameChapter(ch.id, name)}
              textClassName="text-sm text-[var(--color-text)]"
              inputClassName="hm-input py-1 text-xs"
            />
            <button onClick={() => deleteChapter(ch.id)} className="ml-auto flex-none text-xs text-brand-red" aria-label="Delete chapter">
              🗑
            </button>
          </div>
        ))}
        {unit.topics.length === 0 && <p className="py-2 pl-6 text-xs italic text-[var(--color-text-muted)]">No chapters yet.</p>}
      </div>

      <form onSubmit={addChapter} className="flex gap-2 border-t border-[var(--color-border)] px-4 py-2">
        <input
          value={newChapterName}
          onChange={(e) => setNewChapterName(e.target.value)}
          placeholder="New chapter name (e.g. Kinematics)"
          className="hm-input py-1 text-xs"
        />
        <button type="submit" disabled={addingChapter} className="hm-btn-outline flex-none text-xs">
          + Add chapter
        </button>
      </form>
    </div>
  );
}

function ExpandedUnits({ subject, detail, isLoading, onRefresh }) {
  const [newUnitName, setNewUnitName] = useState("");
  const [addingUnit, setAddingUnit] = useState(false);

  async function addUnit(e) {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    setAddingUnit(true);
    try {
      await api.post("/chapters/", { subject: subject.id, name: newUnitName.trim(), order: detail?.chapters.length || 0 });
      setNewUnitName("");
      await onRefresh();
    } finally {
      setAddingUnit(false);
    }
  }

  if (isLoading && !detail) {
    return <p className="px-6 py-3 text-xs text-[var(--color-text-muted)]">Loading units…</p>;
  }
  if (!detail) return null;

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-6 py-4">
      {detail.chapters.length === 0 && <p className="mb-3 text-xs text-[var(--color-text-muted)]">No units yet.</p>}
      <div className="flex flex-col gap-3">
        {detail.chapters.map((unit, ui) => (
          <UnitBlock key={unit.id} unit={unit} index={ui} onRefresh={onRefresh} />
        ))}
      </div>
      <form onSubmit={addUnit} className="mt-3 flex gap-2">
        <input
          value={newUnitName}
          onChange={(e) => setNewUnitName(e.target.value)}
          placeholder="New unit name (e.g. Mechanics)"
          className="hm-input max-w-xs text-sm"
        />
        <button type="submit" disabled={addingUnit} className="hm-btn-primary flex-none text-xs">
          + Add unit
        </button>
      </form>
    </div>
  );
}

function SubjectsContent() {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [renameForm, setRenameForm] = useState({ name: "", prefix: "", courses: [], is_free: true });
  const [renameError, setRenameError] = useState("");
  const [expandedSlugs, setExpandedSlugs] = useState(new Set());
  const [detailBySlug, setDetailBySlug] = useState({});
  const [expandLoading, setExpandLoading] = useState(new Set());

  function load() {
    setLoading(true);
    api
      .get("/subjects/")
      .then(setSubjects)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.get("/courses/").then(setCourses);
  }, []);

  async function createSubject(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/subjects/", form);
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubject(slug) {
    if (!confirm("Delete this subject and all its units/chapters/questions?")) return;
    await api.del(`/subjects/${slug}/`);
    load();
  }

  async function refreshDetail(slug) {
    const detail = await api.get(`/subjects/${slug}/`);
    setDetailBySlug((prev) => ({ ...prev, [slug]: detail }));
    load(); // keep the Units/Questions columns in the main row fresh too
  }

  async function toggleExpand(slug) {
    setExpandedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    if (!detailBySlug[slug]) {
      setExpandLoading((prev) => new Set(prev).add(slug));
      try {
        const detail = await api.get(`/subjects/${slug}/`);
        setDetailBySlug((prev) => ({ ...prev, [slug]: detail }));
      } finally {
        setExpandLoading((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      }
    }
  }

  function openRename(s) {
    setRenaming(s);
    setRenameForm({ name: s.name, prefix: s.prefix, courses: (s.courses_detail || []).map((c) => c.id), is_free: s.is_free });
    setRenameError("");
  }

  async function saveRename(e) {
    e.preventDefault();
    setRenameError("");
    try {
      await api.patch(`/subjects/${renaming.slug}/`, renameForm);
      setRenaming(null);
      load();
    } catch (err) {
      setRenameError(err.message);
    }
  }

  const sections = useMemo(() => {
    const order = [];
    courses.forEach((c) => {
      const group = c.program_group || "Other";
      if (!order.includes(group)) order.push(group);
    });
    order.push("Unassigned");

    const bySection = {};
    subjects.forEach((s) => {
      const groups = new Set((s.courses_detail || []).map((c) => c.program_group || "Other"));
      if (groups.size === 0) groups.add("Unassigned");
      groups.forEach((g) => {
        (bySection[g] = bySection[g] || []).push(s);
      });
    });

    return order.filter((g) => bySection[g]?.length).map((g) => [g, bySection[g]]);
  }, [subjects, courses]);

  function SubjectTable({ list }) {
    return (
      <div className="hm-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Prefix</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Course(s)</th>
              <th className="px-4 py-3">Units</th>
              <th className="px-4 py-3">Questions</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {list.map((s) => {
              const isOpen = expandedSlugs.has(s.slug);
              const isLoading = expandLoading.has(s.slug);
              const detail = detailBySlug[s.slug];
              return (
                <Fragment key={s.id}>
                  <tr>
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleExpand(s.slug)}
                          aria-label={isOpen ? "Collapse units" : "Expand units"}
                          className="flex h-5 w-5 flex-none items-center justify-center rounded text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)]"
                        >
                          <span className={`inline-block transition-transform ${isOpen ? "rotate-90" : ""}`}>▸</span>
                        </button>
                        <Link href={`/subjects/${s.slug}`} className="flex items-center gap-2 hover:text-brand-blue">
                          <span>{s.icon}</span> {s.name.toUpperCase()}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)]">{s.prefix}</td>
                    <td className="px-4 py-3">
                      {s.is_free ? (
                        <span className="rounded-md bg-brand-green-light px-2 py-1 text-[10px] font-bold text-brand-green">FREE</span>
                      ) : (
                        <span className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">PRO</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.courses_detail || []).map((c) => (
                          <span key={c.id} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue">
                            {c.name}
                          </span>
                        ))}
                        {(s.courses_detail || []).length === 0 && <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">{s.module_count}</td>
                    <td className="px-4 py-3">{s.solved_modules}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openRename(s)} className="mr-3 text-xs font-semibold text-brand-blue">
                        Edit
                      </button>
                      <button onClick={() => deleteSubject(s.slug)} className="text-xs font-semibold text-brand-red">
                        Delete
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <ExpandedUnits
                          subject={s}
                          detail={detail}
                          isLoading={isLoading}
                          onRefresh={() => refreshDetail(s.slug)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Subject Management</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Subjects, units, and chapters used to organize the question bank — grouped by which course(s) use them. A
            subject can be shared across multiple courses (e.g. Physiology under both CEE-PG and NMCLE).
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="hm-btn-primary">
          + Add Subject
        </button>
      </div>

      {loading && <p className="mt-6 text-sm text-[var(--color-text-muted)]">Loading…</p>}

      {!loading && subjects.length === 0 && (
        <div className="mt-6 hm-card p-8 text-center text-sm text-[var(--color-text-muted)]">No subjects yet.</div>
      )}

      {sections.map(([group, list]) => (
        <div key={group} className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{group}</p>
          <SubjectTable list={list} />
        </div>
      ))}

      {showForm && (
        <Modal title="Add subject" onClose={() => setShowForm(false)}>
          <form onSubmit={createSubject} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="hm-input"
                placeholder="e.g. Anatomy"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                Prefix (optional, auto-generated if blank)
              </label>
              <input
                value={form.prefix}
                onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value.toUpperCase() }))}
                className="hm-input"
                placeholder="e.g. ANAT"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Icon (emoji)</label>
              <input
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                className="hm-input"
                maxLength={4}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                className="hm-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                Course(s) — which programs use this subject
              </label>
              <CoursePicker courses={courses} selected={form.courses} onChange={(v) => setForm((f) => ({ ...f, courses: v }))} />
            </div>
            <label className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] p-3 text-sm">
              <span>
                <span className="font-semibold text-[var(--color-text)]">Free access</span>
                <span className="block text-xs text-[var(--color-text-muted)]">
                  Off = students need an active Question Bank subscription for one of the course(s) above.
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.is_free}
                onChange={(e) => setForm((f) => ({ ...f, is_free: e.target.checked }))}
              />
            </label>
            {error && <p className="text-xs font-medium text-brand-red">{error}</p>}
            <button type="submit" disabled={saving} className="hm-btn-primary mt-2">
              {saving ? "Saving..." : "Create subject"}
            </button>
          </form>
        </Modal>
      )}

      {renaming && (
        <Modal title="Edit subject" onClose={() => setRenaming(null)}>
          <p className="mb-3 text-xs text-[var(--color-text-muted)]">
            The prefix (e.g. PHY, CHEM, MATH) is what the Excel importer matches against the &quot;Subject Prefix&quot;
            column, and must be unique across all subjects.
          </p>
          <form onSubmit={saveRename} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Name</label>
              <input
                required
                value={renameForm.name}
                onChange={(e) => setRenameForm((f) => ({ ...f, name: e.target.value }))}
                className="hm-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Prefix</label>
              <input
                value={renameForm.prefix}
                onChange={(e) => setRenameForm((f) => ({ ...f, prefix: e.target.value.toUpperCase() }))}
                className="hm-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                Course(s) — which programs use this subject
              </label>
              <CoursePicker
                courses={courses}
                selected={renameForm.courses}
                onChange={(v) => setRenameForm((f) => ({ ...f, courses: v }))}
              />
            </div>
            <label className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] p-3 text-sm">
              <span>
                <span className="font-semibold text-[var(--color-text)]">Free access</span>
                <span className="block text-xs text-[var(--color-text-muted)]">
                  Off = students need an active Question Bank subscription for one of the course(s) above.
                </span>
              </span>
              <input
                type="checkbox"
                checked={renameForm.is_free}
                onChange={(e) => setRenameForm((f) => ({ ...f, is_free: e.target.checked }))}
              />
            </label>
            {renameError && <p className="text-xs font-medium text-brand-red">{renameError}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setRenaming(null)} className="hm-btn-outline">
                Cancel
              </button>
              <button type="submit" className="hm-btn-primary">
                Save changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function SubjectsPage() {
  return (
    <RequireStaff feature="question_bank">
      <Shell>
        <SubjectsContent />
      </Shell>
    </RequireStaff>
  );
}
