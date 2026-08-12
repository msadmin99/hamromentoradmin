"use client";

import { useMemo } from "react";

export default function CoursePicker({ courses, selected, onChange }) {
  const grouped = useMemo(() => {
    const acc = {};
    courses.forEach((c) => {
      const group = c.program_group || "Other";
      (acc[group] = acc[group] || []).push(c);
    });
    return acc;
  }, [courses]);

  function toggle(id) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="max-h-52 overflow-y-auto rounded-lg border border-[var(--color-border)] p-3">
      {Object.entries(grouped).map(([group, list]) => (
        <div key={group} className="mb-2 last:mb-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{group}</p>
          <div className="flex flex-col gap-1">
            {list.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs text-[var(--color-text)]">
                <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
