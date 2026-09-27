/**
 * Bulk Import row-state model: what each state MEANS for the import, and the
 * counters derived from the server's batch summary. Delete and Skip must have
 * genuinely different outcomes.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { canSkipError, getRowState, ROW_STATE, rowBadge, SKIP_TEXT, summarizeBatch, willImport } from "./importRowState.js";

const row = (o) => ({ status: "error", error_skipped: false, bypass_eligible: true, dedup_action: "", ...o });

test("states are named for what happens, not a bare 'skipped'", () => {
  assert.equal(getRowState(row({ status: "valid" })), ROW_STATE.VALID);
  assert.equal(getRowState(row({ status: "warning" })), ROW_STATE.WARNING);
  assert.equal(getRowState(row({})), ROW_STATE.ERROR);
  assert.equal(getRowState(row({ error_skipped: true })), ROW_STATE.ERROR_IMPORT_ANYWAY);
  assert.equal(getRowState(row({ status: "duplicate" })), ROW_STATE.DUPLICATE);
  assert.equal(getRowState(row({ status: "duplicate", dedup_action: "skip" })), ROW_STATE.DUPLICATE_ATTACH_EXISTING);
});

test("SKIP imports the question; an unresolved error does not (DELETE removes the row entirely)", () => {
  assert.equal(willImport(row({})), false, "unresolved error is left out");
  assert.equal(willImport(row({ error_skipped: true })), true, "skipped error WILL be imported");
  assert.equal(willImport(row({ status: "valid" })), true);
  assert.equal(willImport(row({ status: "warning" })), true);
});

test("Skip is offered only for an unresolved error the server says can be ignored", () => {
  assert.equal(canSkipError(row({})), true);
  assert.equal(canSkipError(row({ error_skipped: true })), false, "already skipped -> Undo instead");
  assert.equal(canSkipError(row({ bypass_eligible: false })), false, "unsafe error cannot be skipped");
  assert.equal(canSkipError(row({ status: "valid" })), false);
});

test("badge wording makes the skipped meaning unambiguous", () => {
  assert.equal(rowBadge(row({ error_skipped: true })).label, "SKIPPED · WILL IMPORT");
  assert.equal(rowBadge(row({})).label, "ERROR");
  assert.notEqual(rowBadge(row({ error_skipped: true })).label, rowBadge(row({ status: "duplicate", dedup_action: "skip" })).label);
});

test("UI wording says the error is ignored and the question is still imported", () => {
  assert.equal(SKIP_TEXT.status, "Skipped — validation error ignored; this question will still be imported.");
  for (const text of Object.values(SKIP_TEXT)) assert.doesNotMatch(String(text), /excluded from this import/i);
});

test("mixed batch counters: 10 valid + 2 warning + skipped error imported, deleted error gone", () => {
  // Shape produced by the backend after: skip one error, delete the other (13 rows remain).
  const s = summarizeBatch({
    total_rows: 13, row_counts: { valid: 10, warning: 2, error: 1, duplicate: 0 },
    unskipped_error_count: 0, skipped_error_count: 1, importable_count: 13,
  });
  assert.deepEqual(
    { total: s.total, valid: s.valid, warning: s.warning, unresolved: s.unresolvedErrors, skipped: s.skippedErrors, importable: s.importable },
    { total: 13, valid: 10, warning: 2, unresolved: 0, skipped: 1, importable: 13 },
  );
});

test("an unresolved error is NOT importable; skipping moves it into the importable set", () => {
  const before = summarizeBatch({ total_rows: 3, row_counts: { valid: 2, error: 1 }, unskipped_error_count: 1, skipped_error_count: 0 });
  const after = summarizeBatch({ total_rows: 3, row_counts: { valid: 2, error: 1 }, unskipped_error_count: 0, skipped_error_count: 1 });
  assert.equal(before.importable, 2);
  assert.equal(before.unresolvedErrors, 1);
  assert.equal(after.importable, 3);
  assert.equal(after.unresolvedErrors, 0);
});

test("summarizeBatch tolerates a stale/partial batch object", () => {
  const s = summarizeBatch({ total_rows: 5, row_counts: { valid: 3, warning: 1, duplicate: 1, error: 0 } });
  assert.equal(s.importable, 5);
  assert.equal(summarizeBatch(undefined).importable, 0);
});
