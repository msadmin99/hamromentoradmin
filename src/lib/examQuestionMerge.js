// Phase C — the merge rule Bulk Import Questions uses to combine an
// exam's current in-memory question list with questions just created by
// POST /import-batches/<id>/create-questions/. Extracted into its own
// plain, JSX-free module (no React import) specifically so it's coverable
// by this project's existing test convention (node --test on plain .mjs/.js
// modules — see Frontend/src/lib/*.test.mjs for the sibling precedent);
// Admin has no component-rendering test setup (no jsdom/React Testing
// Library), and introducing one wasn't in scope for this phase.
//
// The rule (Phase C/Step 9, explicit): append only, never replace —
// `existing questions + imported questions`, with duplicate protection by
// id, preserving both existing order and the imported order. This is the
// only thing standing between a bulk import and TestAdminSerializer.update()
// wiping out an exam's other questions on the next Save (it replaces the
// *entire* TestQuestion set from whatever question_ids the client sends),
// so it must never drop or reorder an already-present question.
export function mergeImportedQuestions(existingQuestions, importedQuestions) {
  const existingIds = new Set(existingQuestions.map((q) => q.id));
  const netNew = importedQuestions.filter((q) => !existingIds.has(q.id));
  return [...existingQuestions, ...netNew];
}

// How many of `importedQuestions` are actually net-new against
// `existingQuestions` — the count the UI shows ("N questions added...").
// A "skip" duplicate that resolves to a question already in this exam
// must not inflate this count (Phase C/Step 8: don't add duplicate IDs).
export function countNetNew(existingQuestions, importedQuestions) {
  const existingIds = new Set(existingQuestions.map((q) => q.id));
  return importedQuestions.filter((q) => !existingIds.has(q.id)).length;
}
