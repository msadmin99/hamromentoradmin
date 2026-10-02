/**
 * Grand Test schedule fix, round 2 — EditSessionModal is the ONE editor
 * that actually changes what students see (it PATCHes
 * ExamSession.start_datetime/end_datetime directly, the object
 * tests_app.lifecycle.resolve_test_schedule_session() prefers over the
 * plain Test.scheduled_start/end whenever a session exists). It had the
 * identical naive-datetime-local timezone bug fixed elsewhere in round
 * 1 (exam-management/page.js, the Reschedule page): the admin's
 * Kathmandu wall-clock entry was being read/sent through the browser's
 * own local zone instead of an explicit Asia/Kathmandu offset. These are
 * source assertions (no DOM/rendering infra in this repo — see other
 * *.test.mjs files for the same convention), confirming the fix is
 * wired through the shared lib/kathmanduDatetime.js helpers, not a
 * second ad-hoc copy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { test } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "page.js"), "utf8");

test("EditSessionModal reads and writes through the shared Kathmandu-aware helpers", async (t) => {
  await t.test("imports kathmanduDatetime.js rather than a local ad-hoc copy", () => {
    assert.match(src, /import \{ formatKathmandu, isValidScheduleWindow, isoToKathmanduLocal, kathmanduLocalToISOString \} from "@\/lib\/kathmanduDatetime";/);
  });

  await t.test("initial form state is seeded via isoToKathmanduLocal, not a raw UTC slice", () => {
    const useStateBlock = src.slice(src.indexOf("const [form, setForm] = useState({"), src.indexOf("});", src.indexOf("const [form, setForm] = useState({")));
    assert.match(useStateBlock, /start_datetime: isoToKathmanduLocal\(session\.start_datetime\)/);
    assert.match(useStateBlock, /end_datetime: isoToKathmanduLocal\(session\.end_datetime\)/);
    assert.doesNotMatch(useStateBlock, /\.slice\(0, 16\)/);
  });

  await t.test("save() attaches the explicit Kathmandu offset before sending, not a naive new Date(...).toISOString()", () => {
    const saveBlock = src.slice(src.indexOf("async function save() {"), src.indexOf("return (\n    <Modal"));
    assert.match(saveBlock, /const startISO = kathmanduLocalToISOString\(form\.start_datetime\);/);
    assert.match(saveBlock, /const endISO = kathmanduLocalToISOString\(form\.end_datetime\);/);
    assert.doesNotMatch(saveBlock, /new Date\(/);
  });

  await t.test("validates end-after-start client-side before saving", () => {
    assert.match(src, /if \(!isValidScheduleWindow\(startISO, endISO\)\) \{/);
  });

  await t.test("formatDateTime renders explicitly in Asia/Kathmandu via the shared formatter", () => {
    assert.match(src, /return formatKathmandu\(value, \{ day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" \}\);/);
  });
});

test("Regression safety: session status/participants/cancel behavior is untouched", async (t) => {
  await t.test("SESSION_STATUS_META and the cancel confirm flow are unchanged", () => {
    assert.match(src, /const SESSION_STATUS_META = \{/);
    assert.match(src, /await api\.post\(`\/exam-sessions\/\$\{session\.id\}\/cancel\/`, \{\}\);/);
  });

  await t.test("the editable-status gate (scheduled/registration_open only) is unchanged", () => {
    assert.match(src, /const editable = \["scheduled", "registration_open"\]\.includes\(session\.status\);/);
  });
});
