/**
 * "Add to this exam" summary (Bulk Import into an existing exam). The count on
 * the button and the tiles must treat a SKIPPED error as a question that WILL
 * be added, an unresolved error as left out, and a deleted row as gone.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const win = new JSDOM("<!doctype html><body></body>").window;
globalThis.window = win;
globalThis.document = win.document;
const { loadJsx } = await import("../../test-utils/loadJsx.mjs");
const { ImportSummaryStep } = await loadJsx("components/examManagement/BulkImportWorkspace.js", {
  stubs: {
    "components/import/PreviewStep": "export default function PreviewStep() { return null; }",
    "components/import/UploadStep": "export default function UploadStep() { return null; }",
    "lib/api": "export const api = {};",
  },
});

function summary(batch) {
  const html = renderToStaticMarkup(React.createElement(ImportSummaryStep, { batch, onBack() {}, onImported() {}, onCancel() {} }));
  const body = new JSDOM(`<body>${html}</body>`).window.document.body;
  const tiles = {};
  body.querySelectorAll(".grid > div").forEach((d) => {
    const [label, value] = [...d.querySelectorAll("p")].map((p) => p.textContent);
    tiles[label] = value;
  });
  const button = [...body.querySelectorAll("button")].find((b) => b.textContent.includes("Add to this exam"));
  return { body, tiles, button };
}

test("mixed batch: 10 valid + 2 warning + 1 skipped error (a second error was deleted) -> 13 will be added", () => {
  const { tiles, button, body } = summary({
    total_rows: 13, row_counts: { valid: 10, warning: 2, error: 1, duplicate: 0 },
    unskipped_error_count: 0, skipped_error_count: 1, importable_count: 13,
  });
  assert.equal(tiles["Questions to add"], "13");
  assert.equal(tiles["Valid"], "10");
  assert.equal(tiles["Warnings"], "2");
  assert.equal(tiles["Skipped errors (added anyway)"], "1");
  assert.equal(tiles["Errors left out"], "0");
  assert.equal(button.textContent, "Add to this exam (13)");
  assert.equal(button.disabled, false);
  assert.equal(body.textContent.includes("No eligible questions"), false);
});

test("an unresolved error is left out, and is no longer mislabelled as 'Skipped'", () => {
  const { tiles, button } = summary({
    total_rows: 3, row_counts: { valid: 2, error: 1 }, unskipped_error_count: 1, skipped_error_count: 0, importable_count: 2,
  });
  assert.equal(tiles["Questions to add"], "2");
  assert.equal(tiles["Errors left out"], "1");
  assert.equal(tiles["Skipped errors (added anyway)"], "0");
  assert.equal(button.textContent, "Add to this exam (2)");
});

test("if every row is an unresolved error nothing can be added", () => {
  const { button, body } = summary({ total_rows: 2, row_counts: { error: 2 }, unskipped_error_count: 2, skipped_error_count: 0, importable_count: 0 });
  assert.equal(button.disabled, true);
  assert.ok(body.textContent.includes("No eligible questions"));
});

test("a batch made only of skipped errors can be added", () => {
  const { button, tiles } = summary({ total_rows: 2, row_counts: { error: 2 }, unskipped_error_count: 0, skipped_error_count: 2, importable_count: 2 });
  assert.equal(tiles["Questions to add"], "2");
  assert.equal(button.disabled, false);
});
