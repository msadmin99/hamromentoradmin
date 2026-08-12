"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EditableName from "@/components/EditableName";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const ROMAN_NUMERALS = [
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
  "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx",
];

function unitLetter(index) {
  return String.fromCharCode(65 + (index % 26));
}

function chapterNumeral(index) {
  return ROMAN_NUMERALS[index] || `${index + 1}`;
}

function UnitCard({ unit, index, onChanged }) {
  const [newChapterName, setNewChapterName] = useState("");
  const [adding, setAdding] = useState(false);

  async function addChapter(e) {
    e.preventDefault();
    if (!newChapterName.trim()) return;
    setAdding(true);
    try {
      await api.post("/topics/", { chapter: unit.id, name: newChapterName.trim(), order: unit.topics.length });
      setNewChapterName("");
      onChanged();
    } finally {
      setAdding(false);
    }
  }

  async function renameUnit(name) {
    await api.patch(`/chapters/${unit.id}/`, { name });
    onChanged();
  }

  async function renameChapter(id, name) {
    await api.patch(`/topics/${id}/`, { name });
    onChanged();
  }

  async function deleteChapter(id) {
    await api.del(`/topics/${id}/`);
    onChanged();
  }

  async function deleteUnit() {
    if (!confirm(`Delete the unit "${unit.name}" and all its chapters/questions?`)) return;
    await api.del(`/chapters/${unit.id}/`);
    onChanged();
  }

  return (
    <div className="hm-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-blue/10 text-xs font-bold text-brand-blue">
            {unitLetter(index)}
          </span>
          <EditableName value={unit.name} onSave={renameUnit} textClassName="font-bold text-[var(--color-text)]" />
          <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-semibold text-brand-blue">
            {unit.mcq_count} question{unit.mcq_count === 1 ? "" : "s"}
          </span>
        </div>
        <button onClick={deleteUnit} className="text-brand-red" aria-label="Delete unit">
          🗑
        </button>
      </div>

      <p className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Chapters</p>
      <div className="flex flex-col divide-y divide-[var(--color-border)]">
        {unit.topics.map((t, i) => (
          <div key={t.id} className="flex items-center justify-between py-2">
            <span className="flex items-center gap-2 text-sm text-[var(--color-text)]">
              <span className="font-mono text-xs text-[var(--color-text-muted)]">{chapterNumeral(i)}.</span>
              <EditableName value={t.name} onSave={(name) => renameChapter(t.id, name)} inputClassName="hm-input py-1 text-xs" />
            </span>
            <button onClick={() => deleteChapter(t.id)} className="text-xs text-brand-red" aria-label="Delete chapter">
              🗑
            </button>
          </div>
        ))}
        {unit.topics.length === 0 && <p className="py-2 text-xs italic text-[var(--color-text-muted)]">No chapters yet.</p>}
      </div>

      <form onSubmit={addChapter} className="mt-3 flex gap-2">
        <input
          value={newChapterName}
          onChange={(e) => setNewChapterName(e.target.value)}
          placeholder="New chapter name (e.g. Kinematics)"
          className="hm-input"
        />
        <button type="submit" disabled={adding} className="hm-btn-outline flex-none">
          Add
        </button>
      </form>
    </div>
  );
}

function SubjectDetailContent() {
  const { slug } = useParams();
  const router = useRouter();
  const [subject, setSubject] = useState(null);
  const [newUnitName, setNewUnitName] = useState("");
  const [adding, setAdding] = useState(false);

  function load() {
    api.get(`/subjects/${slug}/`).then(setSubject);
  }

  useEffect(load, [slug]);

  async function addUnit(e) {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    setAdding(true);
    try {
      await api.post("/chapters/", { subject: subject.id, name: newUnitName.trim(), order: subject.chapters.length });
      setNewUnitName("");
      load();
    } finally {
      setAdding(false);
    }
  }

  if (!subject) return <div className="p-6 text-sm text-[var(--color-text-muted)]">Loading…</div>;

  return (
    <div className="p-6">
      <button onClick={() => router.push("/subjects")} className="text-xs font-semibold text-brand-blue">
        ← Back
      </button>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold text-[var(--color-text)]">
        {subject.name.toUpperCase()}
        <span className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-muted)]">
          {subject.prefix}
        </span>
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Units and chapters organize this subject&apos;s question bank — e.g. Unit A &quot;Mechanics&quot; → Chapter i &quot;Vector&quot;.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {subject.chapters.map((unit, i) => (
          <UnitCard key={unit.id} unit={unit} index={i} onChanged={load} />
        ))}
        {subject.chapters.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">No units yet — add one below.</p>
        )}
      </div>

      <form onSubmit={addUnit} className="mt-4 flex gap-2">
        <input
          value={newUnitName}
          onChange={(e) => setNewUnitName(e.target.value)}
          placeholder="New unit name (e.g. Mechanics)"
          className="hm-input"
        />
        <button type="submit" disabled={adding} className="hm-btn-primary flex-none">
          + Add unit
        </button>
      </form>

      <p className="mt-6 text-xs text-[var(--color-text-muted)]">
        Manage the actual MCQs for a chapter from the <a href="/questions" className="text-brand-blue">Question Entry</a> page.
      </p>
    </div>
  );
}

export default function SubjectDetailPage() {
  return (
    <RequireStaff feature="question_bank">
      <Shell>
        <SubjectDetailContent />
      </Shell>
    </RequireStaff>
  );
}
