import assert from "node:assert/strict";
import { test } from "node:test";
import { formatKathmandu, isoToKathmanduLocal, isValidScheduleWindow, kathmanduLocalToISOString } from "./kathmanduDatetime.js";

test("kathmanduLocalToISOString", async (t) => {
  await t.test("attaches the explicit +05:45 offset to a datetime-local value, without reinterpreting it in any other zone", () => {
    // Admin enters "October 3, 2026, 7:00 PM" meaning Nepal time.
    assert.equal(kathmanduLocalToISOString("2026-10-03T19:00"), "2026-10-03T19:00:00+05:45");
  });

  await t.test("tolerates a value that already includes seconds", () => {
    assert.equal(kathmanduLocalToISOString("2026-10-03T19:00:30"), "2026-10-03T19:00:30+05:45");
  });

  await t.test("returns null for an empty value — schedule stays optional", () => {
    assert.equal(kathmanduLocalToISOString(""), null);
    assert.equal(kathmanduLocalToISOString(null), null);
  });

  await t.test("the resulting instant, read back in UTC, is 5h45m earlier — proves this is NOT the old browser-local/UTC bug", () => {
    const iso = kathmanduLocalToISOString("2026-10-03T19:00");
    const utc = new Date(iso);
    assert.equal(utc.toISOString(), "2026-10-03T13:15:00.000Z");
  });
});

test("isoToKathmanduLocal", async (t) => {
  await t.test("converts a UTC-offset backend value back to the Kathmandu wall-clock datetime-local value", () => {
    assert.equal(isoToKathmanduLocal("2026-10-03T13:15:00+00:00"), "2026-10-03T19:00");
  });

  await t.test("round-trips exactly through kathmanduLocalToISOString -> isoToKathmanduLocal", () => {
    const original = "2026-10-03T19:00";
    const iso = kathmanduLocalToISOString(original);
    assert.equal(isoToKathmanduLocal(iso), original);
  });

  await t.test("correctly crosses a UTC calendar-day boundary the naive bug used to get wrong", () => {
    // 2026-10-03T19:00:00Z is 2026-10-04T00:45 in Kathmandu — the exact
    // mechanism behind the reported "12:45 AM" symptom.
    assert.equal(isoToKathmanduLocal("2026-10-03T19:00:00Z"), "2026-10-04T00:45");
  });

  await t.test("returns an empty string for a missing or invalid value", () => {
    assert.equal(isoToKathmanduLocal(null), "");
    assert.equal(isoToKathmanduLocal(""), "");
    assert.equal(isoToKathmanduLocal("not-a-date"), "");
  });
});

test("formatKathmandu", async (t) => {
  await t.test("renders explicitly in Asia/Kathmandu regardless of options passed", () => {
    const formatted = formatKathmandu("2026-10-03T13:15:00+00:00", { hour: "numeric", minute: "2-digit" });
    assert.equal(formatted, "7:00 PM");
  });

  await t.test("returns an empty string for a missing value", () => {
    assert.equal(formatKathmandu(null), "");
  });
});

test("isValidScheduleWindow", async (t) => {
  await t.test("true when end is after start", () => {
    assert.equal(isValidScheduleWindow("2026-10-03T13:15:00+00:00", "2026-10-03T16:15:00+00:00"), true);
  });

  await t.test("false when end equals or precedes start", () => {
    assert.equal(isValidScheduleWindow("2026-10-03T13:15:00+00:00", "2026-10-03T13:15:00+00:00"), false);
    assert.equal(isValidScheduleWindow("2026-10-03T13:15:00+00:00", "2026-10-03T10:00:00+00:00"), false);
  });

  await t.test("true (not blocking) when either side is missing — schedule stays optional", () => {
    assert.equal(isValidScheduleWindow(null, "2026-10-03T16:15:00+00:00"), true);
    assert.equal(isValidScheduleWindow("2026-10-03T13:15:00+00:00", null), true);
    assert.equal(isValidScheduleWindow(null, null), true);
  });
});
