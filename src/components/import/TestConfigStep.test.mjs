/**
 * Daily Test schedule audit — exam-builder timezone fix + 24h window
 * auto-derivation.
 *
 * Root cause: <input type="datetime-local"> gives a raw, offset-less
 * string with no timezone info. Sending it straight to the backend let
 * Django/DRF interpret it in the server's active timezone (UTC — this
 * app never calls timezone.activate()), not the admin's intended Nepal
 * wall-clock time. `new Date(value).toISOString()` — the exact technique
 * already used correctly in exam-management/[id]/reschedule/page.js —
 * fixes this by converting through the ADMIN'S OWN BROWSER timezone.
 *
 * No DOM/rendering test infra in this repo (see src/lib/
 * examQuestionMerge.test.mjs's own note) — these are source assertions.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { test } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "TestConfigStep.js"), "utf8");

test("scheduled_start/scheduled_end are converted to real UTC instants before sending", async (t) => {
  await t.test("toUtcIso wraps the raw datetime-local value in new Date(...).toISOString()", () => {
    assert.match(src, /function toUtcIso\(localDatetimeValue\) \{/);
    assert.match(src, /const d = new Date\(localDatetimeValue\);/);
    assert.match(src, /return d\.toISOString\(\);/);
  });

  await t.test("a null/empty value stays null, not an invalid-date string", () => {
    assert.match(src, /if \(!localDatetimeValue\) return null;/);
    assert.match(src, /if \(Number\.isNaN\(d\.getTime\(\)\)\) return null;/);
  });

  await t.test("handleContinue sends the converted values, not the raw form fields", () => {
    assert.match(src, /const scheduledStartIso = toUtcIso\(form\.scheduled_start\);/);
    assert.match(src, /scheduled_start: scheduledStartIso,/);
    assert.doesNotMatch(src, /scheduled_start: form\.scheduled_start \|\| null,/);
  });
});

test("Daily Test's scheduled_end is auto-derived as exactly 24 hours after scheduled_start", async (t) => {
  await t.test("DAY_MS is exactly 24 hours in milliseconds", () => {
    assert.match(src, /const DAY_MS = 24 \* 60 \* 60 \* 1000;/);
  });

  await t.test("for exam_type 'daily', scheduled_end is computed from scheduled_start + DAY_MS, not read from a manual field", () => {
    const fn = src.slice(src.indexOf("const scheduledEndIso ="), src.indexOf("onContinue({"));
    assert.match(fn, /form\.exam_type === "daily"/);
    assert.match(fn, /new Date\(new Date\(scheduledStartIso\)\.getTime\(\) \+ DAY_MS\)\.toISOString\(\)/);
  });

  await t.test("a daily test with no scheduled_start gets no scheduled_end either (no forced window when nothing is scheduled)", () => {
    const fn = src.slice(src.indexOf("const scheduledEndIso ="), src.indexOf("onContinue({"));
    assert.match(fn, /scheduledStartIso\s*\?[\s\S]*?:\s*null/);
  });

  await t.test("every other exam type still uses its own manual scheduled_end field, converted but not derived", () => {
    const fn = src.slice(src.indexOf("const scheduledEndIso ="), src.indexOf("onContinue({"));
    assert.match(fn, /: toUtcIso\(form\.scheduled_end\)/);
  });
});

test("the Scheduled end input is replaced by a computed, read-only note for Daily Test only", async (t) => {
  await t.test("Daily Test shows an informational note instead of a manual end-time input", () => {
    assert.match(src, /form\.exam_type === "daily" \? "Opens at \(optional, Nepal time\)" : "Scheduled start \(optional\)"/);
    assert.match(src, /Automatically, 24 hours after opening/);
  });

  await t.test("every other exam type still renders the original manual 'Scheduled end' datetime-local input", () => {
    assert.match(src, /<label className="mb-1 block text-xs font-semibold text-\[var\(--color-text-muted\)\]">Scheduled end \(optional\)<\/label>/);
    assert.match(src, /onChange=\{\(e\) => setForm\(\(f\) => \(\{ \.\.\.f, scheduled_end: e\.target\.value \}\)\)\}/);
  });
});

test("Regression safety: unrelated exam-builder fields are untouched", async (t) => {
  await t.test("EXAM_TYPES, DIFFICULTIES, and academic_year/university validation are unchanged", () => {
    assert.match(src, /const EXAM_TYPES = \[/);
    assert.match(src, /const DIFFICULTIES = \["", "easy", "medium", "hard"\];/);
    assert.match(src, /Academic year is required for "Past Year Questions"/);
  });
});
