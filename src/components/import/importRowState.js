/**
 * Bulk Import "Preview & Validate": one place that defines what each row's
 * state MEANS for the import, so the badge, the buttons, the counters and the
 * Import button can never disagree.
 *
 * The word "skipped" is overloaded in this app, so the states are named for
 * what actually happens:
 *
 *   VALID / WARNING            imported.
 *   ERROR                      unresolved validation error — NOT imported until the
 *                              admin Skips it (import anyway) or Deletes it.
 *   ERROR_IMPORT_ANYWAY        an Error the admin chose to "Skip": the validation error
 *                              is acknowledged and IGNORED, the question is KEPT and
 *                              WILL be imported, its content unchanged.
 *   DUPLICATE                  a duplicate of an existing/other question (needs a
 *                              Skip/Replace/Keep Both decision).
 *   DUPLICATE_ATTACH_EXISTING  the duplicate decision was "Skip": no new question is
 *                              created; the existing one is used. (Unrelated to error Skip.)
 *   (Delete)                   the row is removed from the batch — it is simply gone,
 *                              so it has no state here.
 *
 * The server is the source of truth (ImportRow.status + error_skipped); this
 * module only interprets a row it already received.
 */

export const ROW_STATE = Object.freeze({
  VALID: "valid",
  WARNING: "warning",
  ERROR: "error",
  ERROR_IMPORT_ANYWAY: "error_import_anyway",
  DUPLICATE: "duplicate",
  DUPLICATE_ATTACH_EXISTING: "duplicate_attach_existing",
  OTHER: "other",
});

export function getRowState(row) {
  switch (row?.status) {
    case "valid":
      return ROW_STATE.VALID;
    case "warning":
      return ROW_STATE.WARNING;
    case "error":
      return row.error_skipped ? ROW_STATE.ERROR_IMPORT_ANYWAY : ROW_STATE.ERROR;
    case "duplicate":
      return row.dedup_action === "skip" ? ROW_STATE.DUPLICATE_ATTACH_EXISTING : ROW_STATE.DUPLICATE;
    default:
      return ROW_STATE.OTHER;
  }
}

/** Will this row become (or attach) a question when the batch is imported? */
export function willImport(row) {
  const s = getRowState(row);
  return s === ROW_STATE.VALID || s === ROW_STATE.WARNING || s === ROW_STATE.ERROR_IMPORT_ANYWAY ||
    s === ROW_STATE.DUPLICATE || s === ROW_STATE.DUPLICATE_ATTACH_EXISTING;
}

/** Can the admin choose "Skip (import anyway)" for this row right now? */
export function canSkipError(row) {
  return row?.status === "error" && !row.error_skipped && row.bypass_eligible !== false;
}

// Badge shown on each row: a short label + the STATUS_STYLES key it uses.
export const ROW_STATE_BADGE = Object.freeze({
  [ROW_STATE.VALID]: { label: "VALID", style: "valid" },
  [ROW_STATE.WARNING]: { label: "WARNING", style: "warning" },
  [ROW_STATE.ERROR]: { label: "ERROR", style: "error" },
  [ROW_STATE.ERROR_IMPORT_ANYWAY]: { label: "SKIPPED · WILL IMPORT", style: "skipped" },
  [ROW_STATE.DUPLICATE]: { label: "DUPLICATE", style: "duplicate" },
  [ROW_STATE.DUPLICATE_ATTACH_EXISTING]: { label: "DUPLICATE · USES EXISTING", style: "skipped" },
  [ROW_STATE.OTHER]: { label: "", style: "" },
});

export function rowBadge(row) {
  const badge = ROW_STATE_BADGE[getRowState(row)];
  return { ...badge, label: badge.label || String(row?.status || "").toUpperCase() };
}

// Wording — one definition so the meaning is identical everywhere it appears.
export const SKIP_TEXT = Object.freeze({
  action: "Skip this error — ignore it and import this question anyway",
  actionShort: "Skip",
  undo: "Undo Skip",
  status: "Skipped — validation error ignored; this question will still be imported.",
  statusDetail: "The error above still shows what was ignored. Its content is unchanged.",
  skippedDuplicateNote:
    "A validation error on this question was skipped (it will still be imported), but it is also a duplicate — choose what to do with the duplicate below.",
  cannotSkip: "This error can't be skipped.",
  cannotSkipHelp: "Fix the question above, or Delete it.",
  bulkSkipAll: "Skip All Errors (import anyway)",
  bulkSkipSelected: "Skip Selected Errors (import anyway)",
  bulkUndoSelected: "Undo Skip Selected",
  deleteLabel: "Delete this question — don't import it",
});

export function skipAllConfirmMessage(count) {
  return (
    `Skip ${count} error(s) and import those question(s) anyway?\n\n` +
    "The validation errors will be ignored, the questions kept exactly as they are, and they WILL be added when you import. " +
    "Questions with errors that can't be safely imported will be left as errors. To leave a question out instead, Delete it."
  );
}

/** Numbers shown in the summary tiles and on the Import button, taken from
 * the server's batch summary (never recomputed from a page of rows). Falls
 * back to the older fields so a stale batch object can't crash the screen. */
export function summarizeBatch(batch) {
  const counts = batch?.row_counts || {};
  const unresolvedErrors = batch?.unskipped_error_count ?? counts.error ?? 0;
  const skippedErrors = batch?.skipped_error_count ?? 0;
  const importable =
    batch?.importable_count ?? (counts.valid || 0) + (counts.warning || 0) + (counts.duplicate || 0) + skippedErrors;
  return {
    total: batch?.total_rows ?? 0,
    valid: counts.valid || 0,
    warning: counts.warning || 0,
    duplicate: counts.duplicate || 0,
    unresolvedErrors,
    skippedErrors,
    importable,
  };
}
