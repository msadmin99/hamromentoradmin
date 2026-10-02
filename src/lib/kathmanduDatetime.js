/**
 * Grand Test schedule timezone fix — the root cause of the reported
 * "12:45 AM" bug: both the exam-management Scheduled start/end fields
 * (`<input type="datetime-local">`) and the Reschedule page's Exam
 * Date + Start Time fields produce a NAIVE "YYYY-MM-DDTHH:MM" string
 * with no timezone offset at all — `<input type="datetime-local">`
 * never carries one, and the Reschedule page's own `new Date(...)`
 * construction used whatever zone the admin's BROWSER happened to be
 * in, not the "Asia/Kathmandu" label it displayed next to the field.
 * That naive/wrong-zone value was sent straight to the backend, where
 * Django (settings.TIME_ZONE='UTC', no per-request timezone.activate()
 * anywhere in this project) interprets a naive datetime as UTC — so an
 * admin entering "7:00 PM" meaning Nepal time got it stored 5h45m later
 * than intended, which is exactly the ":45"-past-midnight fingerprint of
 * the Kathmandu offset being applied once to an already-wrong instant.
 *
 * This is the one shared, explicit place both the exam-management form
 * and the Reschedule page now go through — no second timezone mechanism,
 * no library needed (Nepal has a single fixed UTC+05:45 offset all year,
 * no DST), matching the backend's own hardcoded 'Asia/Kathmandu' default
 * (tests_app/models.py ExamSession.timezone) and the Frontend's shared
 * lib/examSchedule.js formatter.
 */

export const KATHMANDU_OFFSET = "+05:45";
export const KATHMANDU_OFFSET_MINUTES = 5 * 60 + 45;

/**
 * A `datetime-local` input's value ("YYYY-MM-DDTHH:MM", no seconds, no
 * offset) -> an ISO string with the explicit Kathmandu offset attached,
 * e.g. "2026-10-03T19:00" -> "2026-10-03T19:00:00+05:45". The admin's
 * wall-clock entry is never reinterpreted in any other zone — this is a
 * pure string operation, not a Date-object round trip (which would
 * reintroduce exactly the browser-local-zone bug this fixes). Returns
 * null for an empty/missing value so "optional" stays optional.
 */
export function kathmanduLocalToISOString(localValue) {
  if (!localValue) return null;
  const [datePart, timePart] = localValue.split("T");
  if (!datePart || !timePart) return null;
  const seconds = timePart.length > 5 ? timePart.slice(0, 8) : `${timePart}:00`;
  return `${datePart}T${seconds}${KATHMANDU_OFFSET}`;
}

/**
 * The inverse: a backend ISO datetime (any offset — typically UTC) ->
 * the Kathmandu wall-clock "YYYY-MM-DDTHH:MM" a `datetime-local` input's
 * value expects, so editing an existing scheduled Test/Session shows the
 * admin the time they'd actually recognize, not the raw UTC instant.
 * Returns "" for a missing/invalid value (datetime-local's own empty
 * state).
 */
export function isoToKathmanduLocal(isoValue) {
  if (!isoValue) return "";
  const d = new Date(isoValue);
  if (Number.isNaN(d.getTime())) return "";
  // Deriving from UTC epoch millis + a fixed-minute offset (not
  // toLocaleString parsing) keeps this exact and independent of the
  // runtime's own ICU data, matching KATHMANDU_OFFSET_MINUTES above.
  const shifted = new Date(d.getTime() + KATHMANDU_OFFSET_MINUTES * 60000);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
  );
}

/** Human-readable Kathmandu-local display, for read-only previews (the
 * Reschedule page's "End Time" preview, its confirm-modal summary, and
 * the "Original Session" info tile) — explicit `timeZone` option, never
 * the viewer's own browser-local zone. */
export function formatKathmandu(isoValue, options = {}) {
  if (!isoValue) return "";
  const d = new Date(isoValue);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { timeZone: "Asia/Kathmandu", ...options });
}

/** True when end is strictly after start (both ISO strings or Dates) —
 * the same rule tests_app.exam_versioning.validate_session_window and
 * the newly added TestAdminSerializer.validate enforce server-side; this
 * lets the Admin UI show the error before a round trip, never as a
 * replacement for the server-side check. */
export function isValidScheduleWindow(startValue, endValue) {
  if (!startValue || !endValue) return true;
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;
  return end > start;
}
