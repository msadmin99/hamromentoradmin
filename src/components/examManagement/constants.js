export const EXAM_TYPES = [
  { key: "qbank", label: "Question Bank" },
  { key: "daily", label: "Daily Test" },
  { key: "mock", label: "Mock Test" },
  { key: "grand", label: "Grand Test" },
  { key: "pyq", label: "Past Year Questions" },
];
export const EXAM_TYPE_LABELS = Object.fromEntries(EXAM_TYPES.map((t) => [t.key, t.label]));

export const TABS = [{ key: "all", label: "All Exams" }, ...EXAM_TYPES.map((t) => ({ key: t.key, label: t.label }))];

export const STATUS_OPTIONS = [
  { key: "", label: "All Status" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "scheduled", label: "Scheduled" },
];

export const STATUS_BADGE = {
  published: "bg-brand-green-light text-brand-green",
  draft: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
  scheduled: "bg-amber-50 text-amber-600",
};

/** Reuse-the-existing-tree, relabel-only per program (see plan: no new
 * Specialty/System models). Chapter model is admin-labeled "Unit", Topic
 * model is admin-labeled "Chapter" everywhere else in this app — this map
 * only changes what a program's Academic Mapping step calls the middle
 * "Unit" level, since that's the level CEE-PG/NMCLE describe differently. */
export const PROGRAM_HIERARCHY_LABELS = {
  "CEE-PG": { subject: "Specialty", unit: "Subject", topic: "Chapter" },
  NMCLE: { subject: "Subject", unit: "System", topic: "Topic" },
};
export const DEFAULT_HIERARCHY_LABELS = { subject: "Subject", unit: "Unit", topic: "Chapter" };

export function hierarchyLabelsFor(program) {
  return PROGRAM_HIERARCHY_LABELS[program] || DEFAULT_HIERARCHY_LABELS;
}

export function programIcon(course) {
  return course?.icon || "🎓";
}

/** RequireStaff/Shell already read user.permissions the same way — action
 * gating for individual row buttons follows the identical pattern instead
 * of inventing a second permission model. */
export function hasFeature(user, feature) {
  if (!user) return false;
  const topTier = user.is_superuser || !user.admin_role || user.admin_role === "super_admin";
  if (topTier) return true;
  return (user.permissions || []).includes(feature);
}
