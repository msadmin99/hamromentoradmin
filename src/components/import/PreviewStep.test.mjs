/**
 * Bulk Import "Preview and Validate" audit — Features 1, 2, 5, 6.
 *
 * Admin has no jsdom/React Testing Library setup (see
 * src/lib/examQuestionMerge.test.mjs's own note, and this repo's plain
 * `node --test` runner) and PreviewStep.js contains JSX, which can't be
 * imported directly under plain Node — so these are source assertions
 * confirming the specific behaviors this stage requires, matching the
 * established pattern in this codebase and its sibling Frontend repo's
 * AppShell.test.mjs / qbankLoadingSkeletons.test.mjs.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { test } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "PreviewStep.js"), "utf8");

test("Feature 1: bulk duplicate selection uses stable row.id-based Sets, never array indexes", async (t) => {
  await t.test("selection state is a Set, not an array of indexes", () => {
    assert.match(src, /const \[selectedDuplicateIds, setSelectedDuplicateIds\] = useState\(\(\) => new Set\(\)\)/);
    assert.match(src, /const \[selectedErrorIds, setSelectedErrorIds\] = useState\(\(\) => new Set\(\)\)/);
  });

  await t.test("toggling and bulk actions key off row.id, never a .map((_, i) => i) index", () => {
    assert.match(src, /toggleDuplicateSelected\(id\)/);
    assert.match(src, /onChange=\{\(\) => \(selectable === "duplicate" \? toggleDuplicateSelected\(row\.id\) : toggleErrorSelected\(row\.id\)\)\}/);
  });

  await t.test("duplicate and error selections are two independent Sets — no shared/combined selection variable", () => {
    assert.doesNotMatch(src, /selectedIds\s*=/); // no single combined-selection variable name exists
  });
});

test("Feature 1: Select All Duplicates fetches the whole batch, not just the current page", async (t) => {
  await t.test("selectAllDuplicates fetches ids_only across the full batch (unpaginated)", () => {
    assert.match(src, /async function selectAllDuplicates\(\)/);
    assert.match(src, /rows\/\?status=duplicate&ids_only=1/);
  });

  await t.test("Select All / Clear Selection / selected count controls are rendered", () => {
    assert.match(src, />\s*Select All Duplicates\s*</);
    assert.match(src, />\s*Clear Selection\s*</);
    assert.match(src, /\{selectedDuplicateIds\.size\} duplicate\{selectedDuplicateIds\.size === 1 \? "" : "s"\} selected/);
  });
});

test("Feature 1: bulk duplicate actions reuse the same Skip/Replace/Keep Both options, plus Remove", async (t) => {
  await t.test("the same DEDUP_OPTIONS list (Skip/Replace/Keep Both) drives both individual and bulk controls", () => {
    const dedupOptionsBlock = src.slice(src.indexOf("const DEDUP_OPTIONS"), src.indexOf("// A row's underlying"));
    assert.match(dedupOptionsBlock, /key: "skip", label: "Skip"/);
    assert.match(dedupOptionsBlock, /key: "replace", label: "Replace"/);
    assert.match(dedupOptionsBlock, /key: "keep_both", label: "Keep Both"/);
    // exactly one definition — bulk buttons render DEDUP_OPTIONS.map(...), not a second hardcoded list
    assert.equal((src.match(/DEDUP_OPTIONS\.map/g) || []).length, 2, "individual row controls + bulk controls both map over the same list");
  });

  await t.test("a bulk Remove button exists alongside the three reused actions", () => {
    assert.match(src, /onClick=\{\(\) => applyBulkDedupAction\("remove"\)\}/);
  });

  await t.test("the individual per-row duplicate controls still call onSave with dedup_action, unchanged", () => {
    assert.match(src, /onClick=\{\(\) => onSave\(row\.id, \{ dedup_action: opt\.key \}\)\}/);
  });
});

test("Feature 1: confirmation dialogs guard the destructive bulk actions (Replace/Remove)", async (t) => {
  await t.test("Replace shows a confirm() naming the count before applying", () => {
    const fn = src.slice(src.indexOf("async function applyBulkDedupAction"), src.indexOf("async function applyBulkSkipError"));
    assert.match(fn, /action === "replace" &&\s*!confirm\(\s*`Replace \$\{selectedDuplicateIds\.size\} duplicate question\(s\)\?/);
  });

  await t.test("Remove shows a confirm() naming the count before applying", () => {
    const fn = src.slice(src.indexOf("async function applyBulkDedupAction"), src.indexOf("async function applyBulkSkipError"));
    assert.match(fn, /action === "remove" &&\s*!confirm\(\s*`Remove \$\{selectedDuplicateIds\.size\} duplicate question\(s\)\?/);
  });

  await t.test("Skip and Keep Both do not require a confirmation dialog (non-destructive)", () => {
    const fn = src.slice(src.indexOf("async function applyBulkDedupAction"), src.indexOf("async function applyBulkSkipError"));
    assert.doesNotMatch(fn, /action === "skip" &&\s*!confirm/);
    assert.doesNotMatch(fn, /action === "keep_both" &&\s*!confirm/);
  });
});

test("Feature 1: the bulk dedup endpoint is a single request per action, not one per row", async (t) => {
  await t.test("applyBulkDedupAction posts once with the full row_ids array", () => {
    const fn = src.slice(src.indexOf("async function applyBulkDedupAction"), src.indexOf("async function applyBulkSkipError"));
    assert.match(fn, /api\.post\(`\/import-batches\/\$\{batch\.id\}\/rows\/bulk-dedup-action\/`, \{/);
    assert.match(fn, /row_ids: Array\.from\(selectedDuplicateIds\)/);
    // exactly one api.post call in this function — not a loop calling it per id
    const postCalls = (fn.match(/api\.post\(/g) || []).length;
    assert.equal(postCalls, 1, "must send one bulk request, not loop per selected row");
  });
});

test("Feature 2: error rows can be skipped individually and in bulk without deleting or altering their errors", async (t) => {
  await t.test("individual Skip/Undo Skip buttons call onSave with error_skipped, not a delete", () => {
    // RowDetail's buttons go through setSkip(), which is the only caller of onSave for this flag.
    assert.match(src, /onClick=\{\(\) => setSkip\(false\)\}/);
    assert.match(src, /onClick=\{\(\) => setSkip\(true\)\}/);
    assert.match(src, /await onSave\(row\.id, \{ error_skipped: skipped \}\)/);
    assert.doesNotMatch(src.slice(src.indexOf("async function setSkip"), src.indexOf("function update(patch)")), /onDelete|api\.del/);
  });

  await t.test("Select All Errors / Skip All Errors / Skip Selected Errors / Undo Skip Selected are all present", () => {
    assert.match(src, />\s*Select All Errors\s*</);
    // Labels now come from one constant so the "(import anyway)" meaning is identical everywhere.
    assert.match(src, /\{SKIP_TEXT\.bulkSkipAll\}/);
    assert.match(src, /\{SKIP_TEXT\.bulkSkipSelected\}/);
    assert.match(src, /\{SKIP_TEXT\.bulkUndoSelected\}/);
    const state = readFileSync(join(here, "importRowState.js"), "utf8");
    assert.match(state, /bulkSkipAll: "Skip All Errors \(import anyway\)"/);
    assert.match(state, /bulkSkipSelected: "Skip Selected Errors \(import anyway\)"/);
    assert.match(state, /bulkUndoSelected: "Undo Skip Selected"/);
  });

  await t.test("bulk skip-error goes through the dedicated endpoint, one request for the whole selection", () => {
    const fn = src.slice(src.indexOf("async function applyBulkSkipError"), src.indexOf("async function skipAllErrorsNow"));
    assert.match(fn, /rows\/bulk-skip-error\//);
    assert.match(fn, /row_ids: Array\.from\(selectedErrorIds\)/);
  });

  await t.test("a skipped error row shows a distinct status label without changing row.status semantics", () => {
    // The label is derived (never written back to row.status) by the shared state model.
    const state = readFileSync(join(here, "importRowState.js"), "utf8");
    assert.match(state, /case "error":\s*return row\.error_skipped \? ROW_STATE\.ERROR_IMPORT_ANYWAY : ROW_STATE\.ERROR;/);
    assert.match(src, /const badge = rowBadge\(row\);/);
    assert.doesNotMatch(src, /row\.status = /);
  });

  await t.test("a Skip/Undo Skip control is visible on the COLLAPSED row, not only inside the expanded detail (Part B root-cause fix: discoverability)", () => {
    const collapsedRowBlock = src.slice(src.indexOf("rows.map((row) => {"), src.indexOf("{expandedId === row.id && <RowDetail"));
    assert.match(collapsedRowBlock, /row\.status === "error" && \(row\.error_skipped \|\| canSkipError\(row\)\) && \(/);
    assert.match(collapsedRowBlock, /onClick=\{\(\) => toggleRowSkip\(row\)\}/);
    assert.match(collapsedRowBlock, /\{row\.error_skipped \? SKIP_TEXT\.undo : SKIP_TEXT\.actionShort\}/);
    // and it saves through the same error_skipped flag, surfacing (not swallowing) a server refusal
    assert.match(src, /await saveRow\(row\.id, \{ error_skipped: !row\.error_skipped \}\)/);
  });

  await t.test("the collapsed-row Skip button is a sibling of the expand-toggle, not nested inside it (clicking Skip must not also toggle expand)", () => {
    const collapsedRowBlock = src.slice(src.indexOf("rows.map((row) => {"), src.indexOf("{expandedId === row.id && <RowDetail"));
    const toggleButtonEnd = collapsedRowBlock.indexOf("</button>");
    const skipButtonIndex = collapsedRowBlock.indexOf("onClick={() => toggleRowSkip(row)}");
    assert.ok(skipButtonIndex > toggleButtonEnd, "collapsed-row Skip button must render after the expand-toggle button closes");
  });
});

test("Feature 2, item 6: the Import button unblocks once all errors are skipped", async (t) => {
  await t.test("eligibility uses the server's importable count (skipped errors count as importable), not the raw error count", () => {
    assert.match(src, /summary\.importable === 0/);
    assert.doesNotMatch(src, /\(counts\.error \|\| 0\) === batch\.total_rows/);
    assert.doesNotMatch(src, /unskipped_error_count \?\? counts\.error \?\? 0\) === batch\.total_rows/);
    const state = readFileSync(join(here, "importRowState.js"), "utf8");
    assert.match(state, /batch\?\.importable_count \?\?/);
  });
});

test("Feature 5: bulk-selection UX uses the existing design system, no new visual style", async (t) => {
  await t.test("bulk-action panels use the existing .hm-card / hm-btn-outline / hm-btn-primary classes, not new component styles", () => {
    const dupPanel = src.slice(src.indexOf('statusFilter === "duplicate" && (counts.duplicate'), src.indexOf('statusFilter === "error" && (counts.error'));
    assert.match(dupPanel, /hm-card/);
    assert.match(dupPanel, /hm-btn-outline/);
  });

  await t.test("checkboxes only render for duplicate/error rows, never for valid/warning rows", () => {
    assert.match(src, /const selectable = row\.status === "duplicate" \? "duplicate" : row\.status === "error" \? "error" : null;/);
    assert.match(src, /\{selectable && \(\s*<input\s*type="checkbox"/);
  });
});

test("Feature 6: the import summary adds a Skipped tile without altering existing counts", async (t) => {
  await t.test("the 6th tile counts skipped errors as WILL-IMPORT (not omitted)", () => {
    assert.match(src, /<p className="text-xs text-\[var\(--color-text-muted\)\]">Skipped errors \(will import\)<\/p>/);
    assert.match(src, /\{summary\.skippedErrors\}/);
    assert.doesNotMatch(src, /batch\.skipped_projected_count/);
  });

  await t.test("the existing Total/Valid/Warnings/Errors/Duplicates tiles are all still present, unchanged", () => {
    // "Errors" is now "Errors (unresolved)": a skipped error is no longer an unresolved error.
    for (const label of ["Total Questions", "Valid", "Warnings", "Errors (unresolved)", "Duplicates"]) {
      assert.ok(src.includes(`>${label}<`), `missing existing summary tile: ${label}`);
    }
  });
});

test("Regression safety: unrelated behaviors are untouched", async (t) => {
  await t.test("TaxonomyPanel (Subject/Chapter/Topic + dedup polling) is untouched", () => {
    assert.match(src, /function TaxonomyPanel\(\{ batch, onChanged \}\)/);
    assert.match(src, /Duplicate check in progress… Subject, Chapter and Topic stay editable while this runs\./);
  });

  await t.test("the RichEditor-based question/option/explanation editors are untouched", () => {
    assert.match(src, /<RichEditor value=\{data\.text_html\} onChange=\{\(html\) => update\(\{ text_html: html \}\)\} placeholder="Question text"/);
  });

  await t.test("saveRow still refreshes batch status after any row edit (Feature 4's existing revalidation path)", () => {
    const fn = src.slice(src.indexOf("async function saveRow"), src.indexOf("async function deleteRow"));
    assert.match(fn, /api\.get\(`\/import-batches\/\$\{batch\.id\}\/status\/`\)/);
  });

  await t.test("the individual row delete confirmation dialog is untouched", () => {
    assert.match(src, /Remove this question from the import\? This can't be undone/);
  });
});

test("Skip -> duplicate check: the screen follows a background run to completion (no manual refresh)", async (t) => {
  await t.test("skip flows watch a pending/processing dedup status", () => {
    assert.match(src, /function watchDedup\(updatedBatch\) \{/);
    assert.match(src, /updatedBatch\?\.dedup_status === "pending" \|\| updatedBatch\?\.dedup_status === "processing"/);
    // single-row skip (saveRow) and both bulk paths (selected + all) all call it
    assert.equal((src.match(/watchDedup\(updatedBatch\);/g) || []).length, 3);
  });

  await t.test("polling is generation-scoped, stops when completed, and reloads the rows", () => {
    const effect = src.slice(src.indexOf("if (skipDedupGeneration == null) return undefined;"), src.indexOf("async function saveRow"));
    assert.match(effect, /data\.dedup_generation !== skipDedupGeneration/);
    assert.match(effect, /data\.dedup_status === "completed"/);
    assert.match(effect, /setSkipDedupGeneration\(null\)/);
    assert.match(effect, /load\(\)/);
    assert.match(effect, /setTimeout\(/);
  });
});
