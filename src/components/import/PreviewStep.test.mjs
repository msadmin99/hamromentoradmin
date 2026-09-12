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
    assert.match(src, /onClick=\{\(\) => onSave\(row\.id, \{ error_skipped: false \}\)\}/);
    assert.match(src, /onClick=\{\(\) => onSave\(row\.id, \{ error_skipped: true \}\)\}/);
  });

  await t.test("Select All Errors / Skip All Errors / Skip Selected Errors / Undo Skip Selected are all present", () => {
    assert.match(src, />\s*Select All Errors\s*</);
    assert.match(src, />\s*Skip All Errors\s*</);
    assert.match(src, />\s*Skip Selected Errors\s*</);
    assert.match(src, />\s*Undo Skip Selected\s*</);
  });

  await t.test("bulk skip-error goes through the dedicated endpoint, one request for the whole selection", () => {
    const fn = src.slice(src.indexOf("async function applyBulkSkipError"), src.indexOf("async function skipAllErrorsNow"));
    assert.match(fn, /rows\/bulk-skip-error\//);
    assert.match(fn, /row_ids: Array\.from\(selectedErrorIds\)/);
  });

  await t.test("a skipped error row shows a distinct 'Skipped' status label without changing row.status semantics", () => {
    assert.match(src, /function displayStatus\(row\) \{/);
    assert.match(src, /if \(row\.status === "error" && row\.error_skipped\) return "skipped";/);
  });
});

test("Feature 2, item 6: the Import button unblocks once all errors are skipped", async (t) => {
  await t.test("eligibility uses unskipped_error_count, not the raw (unaffected) error count", () => {
    assert.match(src, /\(batch\.unskipped_error_count \?\? counts\.error \?\? 0\) === batch\.total_rows/);
    assert.doesNotMatch(src, /\(counts\.error \|\| 0\) === batch\.total_rows/);
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
  await t.test("a 6th 'Skipped' tile is added to the existing summary grid", () => {
    assert.match(src, /<p className="text-xs text-\[var\(--color-text-muted\)\]">Skipped<\/p>/);
    assert.match(src, /\{batch\.skipped_projected_count \|\| 0\}/);
  });

  await t.test("the existing Total/Valid/Warnings/Errors/Duplicates tiles are all still present, unchanged", () => {
    for (const label of ["Total Questions", "Valid", "Warnings", "Errors", "Duplicates"]) {
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
