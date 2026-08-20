"use client";

import { useEffect, useState } from "react";
import RichEditor from "@/components/richeditor/RichEditor";
import { api } from "@/lib/api";

const STATUS_STYLES = {
  valid: "bg-brand-green-light text-brand-green",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-brand-red-light text-brand-red",
  duplicate: "bg-purple-100 text-purple-800",
};

const DEDUP_OPTIONS = [
  { key: "skip", label: "Skip" },
  { key: "replace", label: "Replace" },
  { key: "keep_both", label: "Keep Both" },
];

function stripTags(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function TaxonomyPanel({ batch, onChanged }) {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjectId, setSubjectId] = useState(batch.subject_id ? String(batch.subject_id) : "");
  const [chapterId, setChapterId] = useState(batch.chapter_id ? String(batch.chapter_id) : "");
  const [topicId, setTopicId] = useState(batch.topic_id ? String(batch.topic_id) : "");
  const [courseIds, setCourseIds] = useState((batch.course_ids || []).map(String));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/subjects/").then(setSubjects);
    api.get("/courses/").then(setCourses);
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    const subject = subjects.find((s) => String(s.id) === subjectId);
    if (!subject) return;
    api.get(`/chapters/?subject=${subject.slug}`).then(setChapters);
  }, [subjectId, subjects]);

  useEffect(() => {
    if (!chapterId) return;
    api.get(`/topics/?chapter=${chapterId}`).then(setTopics);
  }, [chapterId]);

  async function save(next) {
    setSaving(true);
    try {
      const updated = await api.patch(`/import-batches/${batch.id}/taxonomy/`, {
        subject_id: next.subjectId ? Number(next.subjectId) : null,
        chapter_id: next.chapterId ? Number(next.chapterId) : null,
        topic_id: next.topicId ? Number(next.topicId) : null,
        course_ids: (next.courseIds || []).map(Number),
      });
      onChanged(updated);
    } finally {
      setSaving(false);
    }
  }

  function handleSubjectChange(value) {
    setSubjectId(value);
    setChapterId("");
    setTopicId("");
    setChapters([]);
    setTopics([]);
    save({ subjectId: value, chapterId: "", topicId: "", courseIds });
  }

  function handleChapterChange(value) {
    setChapterId(value);
    setTopicId("");
    setTopics([]);
    save({ subjectId, chapterId: value, topicId: "", courseIds });
  }

  function handleTopicChange(value) {
    setTopicId(value);
    save({ subjectId, chapterId, topicId: value, courseIds });
  }

  function toggleCourse(id) {
    const key = String(id);
    const next = courseIds.includes(key) ? courseIds.filter((c) => c !== key) : [...courseIds, key];
    setCourseIds(next);
    save({ subjectId, chapterId, topicId, courseIds: next });
  }

  return (
    <div className="hm-card p-4">
      <p className="text-sm font-bold text-[var(--color-text)]">Subject, Chapter & Topic</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Applied to every question in this import. Sourced from Subject Management — nothing new is created here.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">Subject</label>
          <select value={subjectId} onChange={(e) => handleSubjectChange(e.target.value)} className="hm-input w-full text-sm" disabled={saving}>
            <option value="">— Select —</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">Chapter</label>
          <select
            value={chapterId}
            onChange={(e) => handleChapterChange(e.target.value)}
            className="hm-input w-full text-sm"
            disabled={saving || !subjectId}
          >
            <option value="">— Select —</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">Topic</label>
          <select
            value={topicId}
            onChange={(e) => handleTopicChange(e.target.value)}
            className="hm-input w-full text-sm"
            disabled={saving || !chapterId}
          >
            <option value="">— Select —</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">
          Course(s) — a file can belong to more than one, e.g. Anatomy under both CEE-PG and NMCLE
        </label>
        <div className="flex flex-wrap gap-2">
          {courses.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCourse(c.id)}
              disabled={saving}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                courseIds.includes(String(c.id)) ? "bg-brand-blue text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RowDetail({ row, onSave, onDelete }) {
  const [data, setData] = useState(row.data);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function update(patch) {
    setData((d) => ({ ...d, ...patch }));
  }
  function updateOption(i, patch) {
    update({ options: (data.options || []).map((o, idx) => (idx === i ? { ...o, ...patch } : o)) });
  }
  function toggleCorrect(i) {
    update({ options: (data.options || []).map((o, idx) => (idx === i ? { ...o, is_correct: !o.is_correct } : o)) });
  }
  function addOption() {
    update({ options: [...(data.options || []), { text_html: "", is_correct: false }] });
  }
  function removeOption(i) {
    update({ options: (data.options || []).filter((_, idx) => idx !== i) });
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(row.id, { data });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Remove this question from the import? This can't be undone — you'd need to re-upload the file to get it back.")) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete(row.id);
    } catch (err) {
      setDeleteError(err.message || "Could not remove this question.");
      setDeleting(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg bg-[var(--color-surface-muted)] p-3">
      {(row.errors.length > 0 || row.warnings.length > 0) && (
        <ul className="mb-2 flex flex-col gap-1 text-xs">
          {row.errors.map((e, i) => (
            <li key={`e${i}`} className="text-brand-red">
              ⚠ {e}
            </li>
          ))}
          {row.warnings.map((w, i) => (
            <li key={`w${i}`} className="text-yellow-700">
              ℹ {w}
            </li>
          ))}
        </ul>
      )}

      <label className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">Question</label>
      <RichEditor value={data.text_html} onChange={(html) => update({ text_html: html })} placeholder="Question text" minHeight={70} />

      <p className="mb-1.5 mt-3 text-[11px] font-semibold text-[var(--color-text-muted)]">
        Options — click the letter to mark correct (multiple allowed)
      </p>
      <div className="flex flex-col gap-2">
        {(data.options || []).map((o, i) => (
          <div
            key={i}
            className={`rounded-lg border p-2 ${o.is_correct ? "border-brand-green bg-brand-green-light" : "border-[var(--color-border)] bg-white"}`}
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => toggleCorrect(i)}
                className={`mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${
                  o.is_correct ? "bg-brand-green text-white" : "border border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </button>
              <div className="min-w-0 flex-1">
                <RichEditor
                  value={o.text_html}
                  onChange={(html) => updateOption(i, { text_html: html })}
                  placeholder={`Option ${i + 1}`}
                  minHeight={44}
                />
              </div>
              <button
                type="button"
                onClick={() => removeOption(i)}
                title="Remove this option"
                className="mt-1 flex-none text-xs font-semibold text-brand-red"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addOption} className="hm-btn-outline mt-2 px-3 py-1 text-[11px]">
        + Add option
      </button>

      <div className="mt-4 rounded-lg bg-white p-3">
        <label className="mb-1.5 block text-[11px] font-semibold text-[var(--color-text-muted)]">Explanation (optional)</label>
        <RichEditor
          value={data.explanation_html}
          onChange={(html) => update({ explanation_html: html })}
          placeholder="Explanation — shown to students after they attempt this question"
          minHeight={70}
        />
      </div>

      {row.status === "duplicate" && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-purple-800">Duplicate — choose an action:</span>
          {DEDUP_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onSave(row.id, { dedup_action: opt.key })}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                row.dedup_action === opt.key ? "bg-brand-blue text-white" : "border border-[var(--color-border)] text-[var(--color-text)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {deleteError && <p className="mt-2 text-[11px] font-medium text-brand-red">{deleteError}</p>}

      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={handleDelete} disabled={deleting} className="text-xs font-semibold text-brand-red disabled:opacity-50">
          {deleting ? "Removing…" : "🗑 Remove this question"}
        </button>
        <button onClick={save} disabled={saving} className="hm-btn-outline px-3 py-1 text-[11px]">
          {saving ? "Saving…" : "Save edit"}
        </button>
      </div>
    </div>
  );
}

export default function PreviewStep({ batch: initialBatch, mode = "question_bank", highlightRowNumber, onConfirmed, onCancel }) {
  const [batch, setBatch] = useState(initialBatch);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState(highlightRowNumber ? "error" : "");
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const pageSize = 25;

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (statusFilter) params.set("status", statusFilter);
    api
      .get(`/import-batches/${batch.id}/rows/?${params.toString()}`)
      .then((data) => {
        setRows(data.results);
        setTotal(data.total);
        if (highlightRowNumber) {
          const match = data.results.find((r) => r.row_number === highlightRowNumber);
          if (match) setExpandedId(match.id);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [batch.id, page, statusFilter, highlightRowNumber]);

  async function saveRow(rowId, payload) {
    const updated = await api.patch(`/import-batches/${batch.id}/rows/${rowId}/`, payload);
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...updated } : r)));
    // Editing a row's data can flip its status (e.g. error -> valid once a
    // missing option is added back), which the Valid/Warning/Error counts
    // and the Import button's enabled state above depend on — refresh them.
    const updatedBatch = await api.get(`/import-batches/${batch.id}/status/`);
    setBatch(updatedBatch);
  }

  async function deleteRow(rowId) {
    const updatedBatch = await api.del(`/import-batches/${batch.id}/rows/${rowId}/`);
    setBatch(updatedBatch);
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    setTotal((prev) => Math.max(0, prev - 1));
    setExpandedId((prev) => (prev === rowId ? null : prev));
  }

  function handleTaxonomyChanged(updatedBatch) {
    setBatch(updatedBatch);
    setConfirmError("");
    load(); // row statuses may have shifted (dedup re-ran against the new Subject)
  }

  const taxonomyComplete = Boolean(batch.subject_id && batch.chapter_id && batch.topic_id);

  async function handleConfirm() {
    if (!taxonomyComplete) {
      setConfirmError("Please select Subject, Chapter and Topic before importing.");
      return;
    }
    if (mode === "create_test") {
      if (unresolvedDuplicates) {
        setConfirmError("Some duplicate rows still need a Skip/Replace/Keep Both decision before continuing.");
        return;
      }
      setConfirmError("");
      onConfirmed(batch);
      return;
    }
    setConfirming(true);
    setConfirmError("");
    try {
      await api.post(`/import-batches/${batch.id}/confirm/`, {});
      onConfirmed(batch);
    } catch (err) {
      setConfirmError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  const counts = batch.row_counts || {};
  const unresolvedDuplicates = (counts.duplicate || 0) > 0 && rows.some((r) => r.status === "duplicate" && !r.dedup_action);

  return (
    <div className="flex flex-col gap-4">
      <TaxonomyPanel batch={batch} onChanged={handleTaxonomyChanged} />

      <div className="hm-card grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Total Questions</p>
          <p className="text-lg font-extrabold text-[var(--color-text)]">{batch.total_rows}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Valid</p>
          <p className="text-lg font-extrabold text-brand-green">{counts.valid || 0}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Warnings</p>
          <p className="text-lg font-extrabold text-yellow-700">{counts.warning || 0}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Errors</p>
          <p className="text-lg font-extrabold text-brand-red">{counts.error || 0}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Duplicates</p>
          <p className="text-lg font-extrabold text-purple-700">{counts.duplicate || 0}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["", "valid", "warning", "error", "duplicate"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              statusFilter === s ? "bg-brand-blue text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
            }`}
          >
            {s ? s[0].toUpperCase() + s.slice(1) : "All"}
          </button>
        ))}
      </div>

      <div className="hm-card overflow-hidden">
        {loading && <p className="p-4 text-sm text-[var(--color-text-muted)]">Loading…</p>}
        {!loading &&
          rows.map((row) => (
            <div key={row.id} className="border-b border-[var(--color-border)] p-3 last:border-0">
              <button onClick={() => setExpandedId(expandedId === row.id ? null : row.id)} className="flex w-full items-center gap-3 text-left">
                <span className="w-8 flex-none text-xs text-[var(--color-text-muted)]">#{row.row_number}</span>
                <span className={`flex-none rounded-md px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[row.status] || ""}`}>
                  {row.status.toUpperCase()}
                </span>
                <span className="flex-1 truncate text-sm text-[var(--color-text)]">{stripTags(row.data.text_html) || "(blank question)"}</span>
                <span className="flex-none text-[var(--color-text-muted)]">{expandedId === row.id ? "▲" : "▼"}</span>
              </button>
              {expandedId === row.id && <RowDetail row={row} onSave={saveRow} onDelete={deleteRow} />}
            </div>
          ))}
        {!loading && rows.length === 0 && <p className="p-4 text-center text-sm text-[var(--color-text-muted)]">No rows match this filter.</p>}
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-center gap-3 text-xs">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="hm-btn-outline px-3 py-1">
            ← Prev
          </button>
          <span className="text-[var(--color-text-muted)]">
            Page {page} of {Math.ceil(total / pageSize)}
          </span>
          <button
            onClick={() => setPage((p) => (p * pageSize < total ? p + 1 : p))}
            disabled={page * pageSize >= total}
            className="hm-btn-outline px-3 py-1"
          >
            Next →
          </button>
        </div>
      )}

      {unresolvedDuplicates && (
        <p className="text-xs font-medium text-purple-700">
          Some duplicate rows on this page still need a Skip / Replace / Keep Both decision.
        </p>
      )}
      {!taxonomyComplete && (
        <p className="text-xs font-medium text-brand-red">Please select Subject, Chapter and Topic before importing.</p>
      )}
      {confirmError && <p className="text-sm font-medium text-brand-red">{confirmError}</p>}

      <div className="flex items-center justify-end gap-3">
        <button onClick={onCancel} className="hm-btn-outline">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={confirming || !taxonomyComplete || (counts.error || 0) === batch.total_rows}
          className="hm-btn-primary"
        >
          {mode === "create_test"
            ? "Continue to Test Configuration →"
            : confirming
              ? "Starting…"
              : `Import ${(counts.valid || 0) + (counts.warning || 0) + (counts.duplicate || 0)} question(s)`}
        </button>
      </div>
    </div>
  );
}
