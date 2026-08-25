"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/** Searchable multi-select for assigning individual students to an exam —
 * keeps a local id->label cache so already-selected students still display
 * a name even after the search results that surfaced them scroll away. */
export default function StudentPicker({ selected, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [labelCache, setLabelCache] = useState({});
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return undefined;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api
        .get(`/users/?search=${encodeURIComponent(query.trim())}`)
        .then((data) => {
          const list = data.results || data || [];
          setResults(list);
          setLabelCache((c) => {
            const next = { ...c };
            list.forEach((u) => {
              next[u.id] = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email;
            });
            return next;
          });
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function toggle(id) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search students by name or email…"
        className="hm-input text-sm"
      />
      {loading && <p className="mt-2 text-xs text-[var(--color-text-muted)]">Searching…</p>}
      {!loading && results.length > 0 && (
        <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
          {results.map((u) => (
            <label key={u.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]">
              <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
              {labelCache[u.id] || u.email}
              <span className="text-[var(--color-text-muted)]">({u.email})</span>
            </label>
          ))}
        </div>
      )}
      {selected.length > 0 && (
        <div className="mt-2 border-t border-[var(--color-border)] pt-2">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            {selected.length} student{selected.length === 1 ? "" : "s"} individually assigned
          </p>
          <div className="flex flex-wrap gap-1">
            {selected.map((id) => (
              <span key={id} className="flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[11px] text-[var(--color-text)]">
                {labelCache[id] || `#${id}`}
                <button type="button" onClick={() => toggle(id)} className="font-bold text-brand-red">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
