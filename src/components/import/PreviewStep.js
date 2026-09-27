"use client";

import { useEffect, useState } from "react";
import RichEditor from "@/components/richeditor/RichEditor";
import RenderedContent from "@/components/richeditor/RenderedContent";
import { api } from "@/lib/api";
import { canSkipError, rowBadge, skipAllConfirmMessage, SKIP_TEXT, summarizeBatch } from "./importRowState";

const STATUS_STYLES = {
  valid: "bg-brand-green-light text-brand-green",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-brand-red-light text-brand-red",
  duplicate: "bg-purple-100 text-purple-800",
  skipped: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
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
  // Bulk-import taxonomy audit Phase 3: duplicate checking runs off the
  // request path now — dedupStatus mirrors the batch's dedup_status for
  // whichever generation is currently being polled ("" = nothing to poll,
  // e.g. no Subject selected yet, or the last known dedup already
  // completed and nothing has changed since). pollGeneration is the
  // dedup_generation the active poll loop below is watching; changing it
  // (a new Subject change, or clearing it once complete) is what starts/
  // stops the effect — the same "poll until terminal, clean up on
  // unmount" shape ProgressStep.js already uses for import progress.
  const [dedupStatus, setDedupStatus] = useState(batch.dedup_status || "");
  const [pollGeneration, setPollGeneration] = useState(null);

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

  // Polls /status/ (the same endpoint + cadence ProgressStep.js already
  // uses for import progress) until the CURRENT generation reaches
  // 'completed'. If the batch's dedup_generation ever stops matching the
  // generation this effect started for — a newer Subject change moved
  // it on — this poll simply stops without acting; the newer save()
  // call has already set pollGeneration to its own, later value, which
  // re-runs this effect fresh for that generation instead.
  useEffect(() => {
    if (pollGeneration == null) return undefined;
    let cancelled = false;
    function poll() {
      api.get(`/import-batches/${batch.id}/status/`).then((data) => {
        if (cancelled) return;
        if (data.dedup_generation !== pollGeneration) {
          return; // superseded — a later effect run owns the current generation
        }
        setDedupStatus(data.dedup_status);
        if (data.dedup_status === "completed") {
          onChanged(data); // refresh parent's batch + (via handleTaxonomyChanged) reload rows
          setPollGeneration(null);
          return;
        }
        setTimeout(() => {
          if (!cancelled) poll();
        }, 1200);
      });
    }
    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollGeneration, batch.id]);

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
      setDedupStatus(updated.dedup_status || "");
      if (updated.dedup_status === "pending" || updated.dedup_status === "processing") {
        setPollGeneration(updated.dedup_generation);
      }
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
      {(dedupStatus === "pending" || dedupStatus === "processing") && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-blue">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
          Duplicate check in progress… Subject, Chapter and Topic stay editable while this runs.
        </p>
      )}
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

// Real reported bug: an admin reviewing Preview & Validate had no way to
// tell whether a diagram-only question/option/explanation actually
// carried its picture — the boxes just looked blank (RichEditor renders
// `text_html` only, and a diagram-only item has no text_html at all).
// Read-only by design: this screen edits `text_html` via RichEditor, but
// there's no matching "replace this image" upload control here — that's
// deliberately out of scope for this fix, which only needed to make an
// already-correctly-extracted image visible before confirming.
function ImagePreview({ src, label }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={label} className="mt-1.5 max-h-40 rounded-md border border-[var(--color-border)] object-contain" />
  );
}

// READ-ONLY "what students will see" panel shown next to an editor. It renders
// the editor's current source through the same pipeline as the student page;
// it never edits, converts or stores anything, so the source in the editor
// (including raw $…$ / \(…\) delimiters) is exactly what gets saved.
function RenderedPreviewBox({ label, html }) {
  return (
    <div className="mt-1.5 rounded-md border border-dashed border-[var(--color-border)] bg-white/70 px-2.5 py-1.5" data-rendered-preview-box>
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <RenderedContent html={html} className="text-sm text-[var(--color-text)]" emptyLabel="Nothing to preview yet." />
    </div>
  );
}

export function RowDetail({ row, onSave, onDelete }) {
  const [data, setData] = useState(row.data);
  const imageUrls = row.image_urls || {};
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [skipError, setSkipError] = useState("");

  // "Skip" = ignore this validation error and import the question anyway (the
  // server refuses, with a reason, for errors that can't be safely imported).
  async function setSkip(skipped) {
    setSkipError("");
    try {
      await onSave(row.id, { error_skipped: skipped });
    } catch (err) {
      setSkipError(err.message || "Could not change this row's Skip setting.");
    }
  }

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

      {row.status === "error" && (
        <div className="mb-2 flex flex-col gap-1.5" data-skip-panel>
          {row.error_skipped ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--color-text)]">
                {SKIP_TEXT.status} <span className="font-normal text-[var(--color-text-muted)]">{SKIP_TEXT.statusDetail}</span>
              </span>
              <button type="button" onClick={() => setSkip(false)} className="hm-btn-outline flex-none px-2 py-1 text-[11px]">
                {SKIP_TEXT.undo}
              </button>
            </div>
          ) : row.bypass_eligible === false ? (
            <p className="text-[11px] font-semibold text-brand-red" data-cannot-skip>
              {SKIP_TEXT.cannotSkip} <span className="font-normal">{row.bypass_block_reason || SKIP_TEXT.cannotSkipHelp}</span>
            </p>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setSkip(true)}
                className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text)]"
              >
                {SKIP_TEXT.action}
              </button>
            </div>
          )}
          {skipError && <p className="text-[11px] font-medium text-brand-red">{skipError}</p>}
        </div>
      )}

      <label className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">Question</label>
      <RichEditor value={data.text_html} onChange={(html) => update({ text_html: html })} placeholder="Question text" minHeight={70} />
      <ImagePreview src={imageUrls.question_image_url} label="Question diagram" />
      <RenderedPreviewBox label="Rendered preview" html={data.text_html} />

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
                <ImagePreview src={(imageUrls.option_image_urls || [])[i]} label={`Option ${String.fromCharCode(65 + i)} diagram`} />
                <RenderedPreviewBox label="Rendered preview" html={o.text_html} />
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
        <ImagePreview src={imageUrls.explanation_image_url} label="Explanation diagram" />
        <RenderedPreviewBox label="Rendered preview" html={data.explanation_html} />
      </div>

      {row.status === "duplicate" && row.error_skipped && (
        <p className="mt-3 text-[11px] font-semibold text-[var(--color-text)]" data-skipped-duplicate-note>
          {SKIP_TEXT.skippedDuplicateNote}
        </p>
      )}
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
          {deleting ? "Removing…" : `🗑 ${SKIP_TEXT.deleteLabel}`}
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
  // Bulk-action audit (Features 1/2/5): stable row.id-based Sets, never
  // array indexes — a row's index in `rows` shifts under filtering,
  // paging, editing, and deleting, but its id never does. Two completely
  // independent Sets (not one shared "selected" concept) so a duplicate
  // selection can never bleed into an error selection or vice versa.
  const [selectedDuplicateIds, setSelectedDuplicateIds] = useState(() => new Set());
  const [selectedErrorIds, setSelectedErrorIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState("");
  // A bulk Skip can hand its duplicate check to a background run, leaving the batch
  // "pending"; poll until it completes so Import re-enables without a manual refresh.
  const [skipDedupGeneration, setSkipDedupGeneration] = useState(null);
  const pageSize = 25;

  function watchDedup(updatedBatch) {
    if (updatedBatch?.dedup_status === "pending" || updatedBatch?.dedup_status === "processing") {
      setSkipDedupGeneration(updatedBatch.dedup_generation);
    }
  }

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

  useEffect(() => {
    if (skipDedupGeneration == null) return undefined;
    let cancelled = false;
    function poll() {
      api.get(`/import-batches/${batch.id}/status/`).then((data) => {
        if (cancelled || data.dedup_generation !== skipDedupGeneration) return; // superseded
        setBatch(data);
        if (data.dedup_status === "completed") {
          setSkipDedupGeneration(null);
          load(); // rows the check flagged as duplicates now show as such
          return;
        }
        setTimeout(() => {
          if (!cancelled) poll();
        }, 1200);
      });
    }
    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipDedupGeneration, batch.id]);

  async function saveRow(rowId, payload) {
    const updated = await api.patch(`/import-batches/${batch.id}/rows/${rowId}/`, payload);
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...updated } : r)));
    // Editing a row's data can flip its status (e.g. error -> valid once a
    // missing option is added back), which the Valid/Warning/Error counts
    // and the Import button's enabled state above depend on — refresh them.
    const updatedBatch = await api.get(`/import-batches/${batch.id}/status/`);
    setBatch(updatedBatch);
    watchDedup(updatedBatch);
  }

  async function deleteRow(rowId) {
    const updatedBatch = await api.del(`/import-batches/${batch.id}/rows/${rowId}/`);
    setBatch(updatedBatch);
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    setTotal((prev) => Math.max(0, prev - 1));
    setExpandedId((prev) => (prev === rowId ? null : prev));
  }

  // The one-click Skip / Undo Skip on a row in the list. Errors (e.g. the server
  // refusing to skip an unimportable row) are shown, never swallowed.
  async function toggleRowSkip(row) {
    setBulkError("");
    try {
      await saveRow(row.id, { error_skipped: !row.error_skipped });
    } catch (err) {
      setBulkError(err.message || "Could not change this row's Skip setting.");
    }
  }

  function toggleDuplicateSelected(id) {
    setSelectedDuplicateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleErrorSelected(id) {
    setSelectedErrorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // "Select All" means every row of that status across the WHOLE batch,
  // not just the 25 on this page — fetches the full id list (ids_only=1,
  // unpaginated) rather than trying to reconstruct it from `rows`.
  async function selectAllDuplicates() {
    setBulkError("");
    const data = await api.get(`/import-batches/${batch.id}/rows/?status=duplicate&ids_only=1`);
    setSelectedDuplicateIds(new Set(data.ids));
  }

  async function selectAllErrors() {
    setBulkError("");
    const data = await api.get(`/import-batches/${batch.id}/rows/?status=error&ids_only=1`);
    setSelectedErrorIds(new Set(data.ids));
  }

  async function applyBulkDedupAction(action) {
    if (selectedDuplicateIds.size === 0) return;
    if (
      action === "replace" &&
      !confirm(
        `Replace ${selectedDuplicateIds.size} duplicate question(s)?\n\nThis action will apply Replace to all selected duplicate questions.`,
      )
    ) {
      return;
    }
    if (
      action === "remove" &&
      !confirm(
        `Remove ${selectedDuplicateIds.size} duplicate question(s)?\n\nThis removes them from this import batch so they won't be processed. This can't be undone here — you'd need to re-upload the file to get them back.`,
      )
    ) {
      return;
    }
    setBulkBusy(true);
    setBulkError("");
    try {
      const updatedBatch = await api.post(`/import-batches/${batch.id}/rows/bulk-dedup-action/`, {
        row_ids: Array.from(selectedDuplicateIds),
        action,
      });
      setBatch(updatedBatch);
      setSelectedDuplicateIds(new Set());
      load();
    } catch (err) {
      setBulkError(err.message || "Could not apply the bulk action to the selected duplicates.");
    } finally {
      setBulkBusy(false);
    }
  }

  // The server decides which errors may be ignored; rows it refuses come back in
  // `rejected` with a reason, and stay unresolved errors.
  function reportRejected(response) {
    const rejected = response?.rejected || [];
    if (rejected.length === 0) return;
    setBulkError(
      `${rejected.length} question(s) could not be skipped because their error can't be safely imported ` +
        `(row${rejected.length === 1 ? "" : "s"} ${rejected.slice(0, 8).map((r) => `#${r.row_number}`).join(", ")}` +
        `${rejected.length > 8 ? ", …" : ""}). Fix them or Delete them.`,
    );
  }

  async function applyBulkSkipError(skipped) {
    if (selectedErrorIds.size === 0) return;
    if (skipped && !confirm(skipAllConfirmMessage(selectedErrorIds.size))) return;
    setBulkBusy(true);
    setBulkError("");
    try {
      const updatedBatch = await api.post(`/import-batches/${batch.id}/rows/bulk-skip-error/`, {
        row_ids: Array.from(selectedErrorIds),
        skipped,
      });
      setBatch(updatedBatch);
      setSelectedErrorIds(new Set());
      load();
      reportRejected(updatedBatch);
      watchDedup(updatedBatch);
    } catch (err) {
      setBulkError(err.message || "Could not update the selected error rows.");
    } finally {
      setBulkBusy(false);
    }
  }

  // A convenient shortcut combining "select all" + "skip" into one click,
  // per the spec's preferred single-button option alongside the
  // select-then-act flow above — both end up calling the exact same
  // bulk-skip-error endpoint.
  async function skipAllErrorsNow() {
    setBulkBusy(true);
    setBulkError("");
    try {
      const idsData = await api.get(`/import-batches/${batch.id}/rows/?status=error&ids_only=1`);
      if (idsData.ids.length === 0) return;
      if (!confirm(skipAllConfirmMessage(idsData.ids.length))) return;
      const updatedBatch = await api.post(`/import-batches/${batch.id}/rows/bulk-skip-error/`, {
        row_ids: idsData.ids,
        skipped: true,
      });
      setBatch(updatedBatch);
      setSelectedErrorIds(new Set());
      load();
      reportRejected(updatedBatch);
      watchDedup(updatedBatch);
    } catch (err) {
      setBulkError(err.message || "Could not skip all error rows.");
    } finally {
      setBulkBusy(false);
    }
  }

  function handleTaxonomyChanged(updatedBatch) {
    setBatch(updatedBatch);
    setConfirmError("");
    load(); // row statuses may have shifted (dedup re-ran against the new Subject)
  }

  const taxonomyComplete = Boolean(batch.subject_id && batch.chapter_id && batch.topic_id);
  // Bulk-import taxonomy audit Phase 3: dedup_status only ever reads
  // 'completed' for the batch's CURRENT dedup_generation — a stale
  // generation's completion write is rejected server-side (see
  // ImportBatchTaxonomyView.patch / import_dedup_tasks.run_dedup_task's
  // generation-gated update), so this single check on the latest fetched
  // `batch` already covers "completed" + "current generation" + "Subject
  // hasn't changed since" together — no separate generation comparison
  // needed on top of it.
  const dedupComplete = !batch.subject_id || batch.dedup_status === "completed";

  async function handleConfirm() {
    if (!taxonomyComplete) {
      setConfirmError("Please select Subject, Chapter and Topic before importing.");
      return;
    }
    if (!dedupComplete) {
      setConfirmError("Duplicate check is still in progress for the selected Subject — please wait for it to complete.");
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
  const summary = summarizeBatch(batch);
  const unresolvedDuplicates = (counts.duplicate || 0) > 0 && rows.some((r) => r.status === "duplicate" && !r.dedup_action);

  return (
    <div className="flex flex-col gap-4">
      <TaxonomyPanel batch={batch} onChanged={handleTaxonomyChanged} />

      <div className="hm-card grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
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
          <p className="text-xs text-[var(--color-text-muted)]">Errors (unresolved)</p>
          <p className="text-lg font-extrabold text-brand-red">{summary.unresolvedErrors}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Duplicates</p>
          <p className="text-lg font-extrabold text-purple-700">{counts.duplicate || 0}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Skipped errors (will import)</p>
          <p className="text-lg font-extrabold text-[var(--color-text-muted)]">{summary.skippedErrors}</p>
        </div>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]" data-import-summary-line>
        {summary.importable} question(s) will be imported.
        {summary.unresolvedErrors > 0 &&
          ` ${summary.unresolvedErrors} unresolved error(s) will be left out — Skip one to import it anyway, or Delete it.`}
      </p>

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

      {statusFilter === "duplicate" && (counts.duplicate || 0) > 0 && (
        <div className="hm-card flex flex-wrap items-center gap-3 p-3">
          <button type="button" onClick={selectAllDuplicates} disabled={bulkBusy} className="hm-btn-outline px-3 py-1 text-xs disabled:opacity-50">
            Select All Duplicates
          </button>
          {selectedDuplicateIds.size > 0 && (
            <>
              <button
                type="button"
                onClick={() => setSelectedDuplicateIds(new Set())}
                disabled={bulkBusy}
                className="text-xs font-semibold text-[var(--color-text-muted)] underline disabled:opacity-50"
              >
                Clear Selection
              </button>
              <span className="text-xs font-semibold text-[var(--color-text)]">
                {selectedDuplicateIds.size} duplicate{selectedDuplicateIds.size === 1 ? "" : "s"} selected
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                {DEDUP_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => applyBulkDedupAction(opt.key)}
                    disabled={bulkBusy}
                    className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text)] disabled:opacity-50"
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => applyBulkDedupAction("remove")}
                  disabled={bulkBusy}
                  className="rounded-md border border-brand-red px-2.5 py-1 text-xs font-semibold text-brand-red disabled:opacity-50"
                >
                  Remove
                </button>
              </span>
            </>
          )}
        </div>
      )}

      {statusFilter === "error" && (counts.error || 0) > 0 && (
        <div className="hm-card flex flex-wrap items-center gap-3 p-3">
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">Errors: {counts.error}</span>
          <button type="button" onClick={selectAllErrors} disabled={bulkBusy} className="hm-btn-outline px-3 py-1 text-xs disabled:opacity-50">
            Select All Errors
          </button>
          <button type="button" onClick={skipAllErrorsNow} disabled={bulkBusy} className="hm-btn-outline px-3 py-1 text-xs disabled:opacity-50">
            {SKIP_TEXT.bulkSkipAll}
          </button>
          {selectedErrorIds.size > 0 && (
            <>
              <button
                type="button"
                onClick={() => setSelectedErrorIds(new Set())}
                disabled={bulkBusy}
                className="text-xs font-semibold text-[var(--color-text-muted)] underline disabled:opacity-50"
              >
                Clear Selection
              </button>
              <span className="text-xs font-semibold text-[var(--color-text)]">
                {selectedErrorIds.size} error{selectedErrorIds.size === 1 ? "" : "s"} selected
              </span>
              <button
                type="button"
                onClick={() => applyBulkSkipError(true)}
                disabled={bulkBusy}
                className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text)] disabled:opacity-50"
              >
                {SKIP_TEXT.bulkSkipSelected}
              </button>
              <button
                type="button"
                onClick={() => applyBulkSkipError(false)}
                disabled={bulkBusy}
                className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text)] disabled:opacity-50"
              >
                {SKIP_TEXT.bulkUndoSelected}
              </button>
            </>
          )}
        </div>
      )}

      {bulkError && <p className="text-xs font-medium text-brand-red">{bulkError}</p>}

      <div className="hm-card overflow-hidden">
        {loading && <p className="p-4 text-sm text-[var(--color-text-muted)]">Loading…</p>}
        {!loading &&
          rows.map((row) => {
            const badge = rowBadge(row);
            const selectable = row.status === "duplicate" ? "duplicate" : row.status === "error" ? "error" : null;
            const checked = selectable === "duplicate" ? selectedDuplicateIds.has(row.id) : selectable === "error" ? selectedErrorIds.has(row.id) : false;
            return (
              <div key={row.id} className="border-b border-[var(--color-border)] p-3 last:border-0">
                <div className="flex w-full items-center gap-3 text-left">
                  {selectable && (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => (selectable === "duplicate" ? toggleDuplicateSelected(row.id) : toggleErrorSelected(row.id))}
                      aria-label={`Select ${selectable} question #${row.row_number}`}
                      className="h-4 w-4 flex-none accent-brand-blue"
                    />
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span className="w-8 flex-none text-xs text-[var(--color-text-muted)]">#{row.row_number}</span>
                    <span className={`flex-none rounded-md px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[badge.style] || ""}`}>
                      {badge.label}
                    </span>
                    <span className="flex-1 truncate text-sm text-[var(--color-text)]">
                      {stripTags(row.data.text_html) || "(blank question)"}
                    </span>
                    <span className="flex-none text-[var(--color-text-muted)]">{expandedId === row.id ? "▲" : "▼"}</span>
                  </button>
                  {row.status === "error" && (row.error_skipped || canSkipError(row)) && (
                    // Visible without expanding the row — the same Skip
                    // control also lives in RowDetail (with the fuller
                    // explanation) for anyone who does expand. Skip means
                    // "ignore this error and import the question anyway".
                    // Not offered for an error the server says can't be
                    // safely imported (RowDetail explains why instead).
                    <button
                      type="button"
                      onClick={() => toggleRowSkip(row)}
                      title="Skip: ignore this validation error and import this question anyway"
                      className="flex-none rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text)]"
                    >
                      {row.error_skipped ? SKIP_TEXT.undo : SKIP_TEXT.actionShort}
                    </button>
                  )}
                </div>
                {expandedId === row.id && <RowDetail row={row} onSave={saveRow} onDelete={deleteRow} />}
              </div>
            );
          })}
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
      {taxonomyComplete && !dedupComplete && (
        <p className="text-xs font-medium text-brand-blue">
          Duplicate check is still in progress for the selected Subject — Import will be available once it completes.
        </p>
      )}
      {confirmError && <p className="text-sm font-medium text-brand-red">{confirmError}</p>}

      <div className="flex items-center justify-end gap-3">
        <button onClick={onCancel} className="hm-btn-outline">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={
            confirming ||
            !taxonomyComplete ||
            !dedupComplete ||
            // Nothing importable = nothing to do. A Skipped error counts as
            // importable (it is imported anyway); an unresolved Error does not.
            summary.importable === 0
          }
          className="hm-btn-primary"
        >
          {mode === "create_test"
            ? "Continue to Test Configuration →"
            : confirming
              ? "Starting…"
              : `Import ${summary.importable} question(s)`}
        </button>
      </div>
    </div>
  );
}
