"use client";

import { useEffect, useMemo, useState } from "react";
import CoursePicker from "@/components/CoursePicker";
import ExamBuilderModal from "@/components/ExamBuilderModal";
import { ImagePicker } from "@/components/QuestionCard";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api, uploadFields } from "@/lib/api";

const SOURCE_TYPES = [
  { key: "upload", label: "Direct Upload" },
  { key: "youtube", label: "YouTube" },
  { key: "vimeo", label: "Vimeo" },
  { key: "external_url", label: "External URL" },
];

const ACCESS_LEVELS = [
  { key: "public", label: "Public — anyone, even signed out" },
  { key: "registered", label: "Registered — any logged-in student" },
  { key: "premium", label: "Premium — requires a Video Lectures subscription" },
  { key: "course", label: "Course-Based — requires enrollment in an assigned course" },
  { key: "teacher_only", label: "Teacher Only" },
];

const RESOURCE_TYPES = [
  { key: "notes", label: "Lecture Notes (PDF)" },
  { key: "slides", label: "Slides" },
  { key: "practice", label: "Practice Questions" },
  { key: "reference", label: "Reference / External Reading" },
];

const TABS_META = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
];

function emptyForm() {
  return {
    title: "",
    description: "",
    category: "",
    thumbnail: null,
    courses: [],
    subject: "",
    selectedUnit: "",
    selectedChapter: "",
    source_type: "youtube",
    video_file: null,
    video_url: "",
    duration_minutes: 0,
    instructor_name: "",
    access_level: "registered",
    allow_notes_download: true,
    allow_slides_download: true,
    is_active: true,
    linked_tests: [],
    resources: [],
  };
}

function FilePicker({ label, value, accept, onChange }) {
  const hasExisting = typeof value === "string" && value.length > 0;
  const hasNewFile = value instanceof File;
  return (
    <div className="flex items-center gap-2">
      <label className="hm-btn-outline inline-flex cursor-pointer items-center gap-1.5 text-xs">
        📎 {hasNewFile ? value.name.slice(0, 24) : hasExisting ? "Replace file" : label}
        <input type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </label>
      {hasExisting && !hasNewFile && (
        <a href={value} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-blue">
          View current file
        </a>
      )}
      {(hasExisting || hasNewFile) && (
        <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-brand-red">
          Remove
        </button>
      )}
    </div>
  );
}

function VideosContent() {
  const [videos, setVideos] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tests, setTests] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");

  const [showBuilder, setShowBuilder] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [originalResources, setOriginalResources] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    api.get("/subjects/").then(setSubjects);
    api.get("/courses/").then(setCourses);
    api.get("/video-categories/").then(setCategories);
    api.get("/tests/").then(setTests);
  }, []);

  function loadVideos() {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab === "archived") params.set("include_archived", "true");
    if (search) params.set("search", search);
    api
      .get(`/videos/?${params.toString()}`)
      .then((data) => setVideos(tab === "archived" ? data.filter((v) => v.is_archived) : data))
      .finally(() => setLoading(false));
  }

  useEffect(loadVideos, [tab, search]);

  useEffect(() => {
    setForm((f) => ({ ...f, selectedUnit: "", selectedChapter: "" }));
    setTopics([]);
    const subj = subjects.find((s) => s.id === Number(form.subject));
    if (subj) api.get(`/chapters/?subject=${subj.slug}`).then(setChapters);
    else setChapters([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.subject, subjects]);

  useEffect(() => {
    setForm((f) => ({ ...f, selectedChapter: "" }));
    const ch = chapters.find((c) => c.id === Number(form.selectedUnit));
    setTopics(ch?.topics || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.selectedUnit, chapters]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setOriginalResources([]);
    setAnalytics(null);
    setError("");
    setShowBuilder(true);
  }

  async function openEdit(v) {
    const full = await api.get(`/videos/${v.id}/`);
    setEditingId(v.id);
    setForm({
      title: full.title,
      description: full.description || "",
      category: full.category || "",
      thumbnail: full.thumbnail || null,
      courses: full.courses || [],
      subject: full.subject || "",
      selectedUnit: full.chapter || "",
      selectedChapter: full.topic || "",
      source_type: full.source_type,
      video_file: full.video_file || null,
      video_url: full.video_url || "",
      duration_minutes: full.duration_seconds ? Math.round(full.duration_seconds / 60) : 0,
      instructor_name: full.instructor_name || "",
      access_level: full.access_level,
      allow_notes_download: full.allow_notes_download,
      allow_slides_download: full.allow_slides_download,
      is_active: full.is_active,
      linked_tests: full.linked_tests || [],
      resources: (full.resources || []).map((r) => ({ ...r, file: r.file || null })),
    });
    setOriginalResources(full.resources || []);
    setAnalytics(null);
    setError("");
    setShowBuilder(true);
    api.get(`/videos/${v.id}/analytics/`).then(setAnalytics).catch(() => {});
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    const created = await api.post("/video-categories/", { name: newCategoryName.trim() });
    setCategories((c) => [...c, created]);
    setForm((f) => ({ ...f, category: created.id }));
    setNewCategoryName("");
  }

  async function save(closeAfter) {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setError("");
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description,
      category: form.category || null,
      courses: form.courses,
      subject: form.subject || null,
      chapter: form.selectedUnit || null,
      topic: form.selectedChapter || null,
      source_type: form.source_type,
      video_url: form.source_type === "upload" ? "" : form.video_url,
      duration_seconds: Math.round(Number(form.duration_minutes || 0) * 60),
      instructor_name: form.instructor_name,
      access_level: form.access_level,
      allow_notes_download: form.allow_notes_download,
      allow_slides_download: form.allow_slides_download,
      is_active: form.is_active,
      linked_tests: form.linked_tests,
    };
    try {
      let id = editingId;
      if (editingId) {
        await api.patch(`/videos/${editingId}/`, payload);
      } else {
        const created = await api.post("/videos/", payload);
        id = created.id;
        setEditingId(id);
      }

      const mediaFields = {};
      if (form.video_file instanceof File) mediaFields.video_file = form.video_file;
      if (form.thumbnail instanceof File) mediaFields.thumbnail = form.thumbnail;
      if (Object.keys(mediaFields).length > 0) {
        await uploadFields(`/videos/${id}/upload_media/`, "PATCH", mediaFields);
      }

      // Sync resources: create new rows, update changed ones, delete removed ones.
      const keptIds = form.resources.filter((r) => r.id).map((r) => r.id);
      for (const orig of originalResources) {
        if (!keptIds.includes(orig.id)) await api.del(`/video-resources/${orig.id}/`);
      }
      for (const r of form.resources) {
        const isNewFile = r.file instanceof File;
        if (r.id) {
          if (isNewFile) {
            await uploadFields(`/video-resources/${r.id}/`, "PATCH", { title: r.title, resource_type: r.resource_type, file: r.file });
          } else {
            await api.patch(`/video-resources/${r.id}/`, { title: r.title, resource_type: r.resource_type, external_url: r.external_url || "" });
          }
        } else if (isNewFile) {
          await uploadFields("/video-resources/", "POST", { video: id, title: r.title, resource_type: r.resource_type, file: r.file });
        } else {
          await api.post("/video-resources/", { video: id, title: r.title, resource_type: r.resource_type, external_url: r.external_url || "" });
        }
      }

      loadVideos();
      if (closeAfter) setShowBuilder(false);
      else {
        const refreshed = await api.get(`/videos/${id}/`);
        setOriginalResources(refreshed.resources || []);
        setForm((f) => ({ ...f, resources: (refreshed.resources || []).map((r) => ({ ...r, file: r.file || null })) }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function archiveToggle(v) {
    await api.patch(`/videos/${v.id}/`, { is_archived: !v.is_archived });
    loadVideos();
  }

  async function deleteVideo(id) {
    if (!confirm("Delete this video permanently?")) return;
    await api.del(`/videos/${id}/`);
    loadVideos();
  }

  function updateResource(idx, patch) {
    setForm((f) => ({ ...f, resources: f.resources.map((r, i) => (i === idx ? { ...r, ...patch } : r)) }));
  }
  function addResource() {
    setForm((f) => ({ ...f, resources: [...f.resources, { resource_type: "notes", title: "", file: null, external_url: "" }] }));
  }
  function removeResource(idx) {
    setForm((f) => ({ ...f, resources: f.resources.filter((_, i) => i !== idx) }));
  }

  function toggleLinkedTest(testId) {
    setForm((f) => ({
      ...f,
      linked_tests: f.linked_tests.includes(testId) ? f.linked_tests.filter((id) => id !== testId) : [...f.linked_tests, testId],
    }));
  }

  const tabs = useMemo(
    () => [
      {
        key: "basic",
        label: "Basic Info",
        content: (
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Title</label>
              <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="hm-input" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="hm-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Category</label>
              <div className="flex items-center gap-2">
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="hm-input"
                >
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="hm-input text-xs"
                />
                <button type="button" onClick={addCategory} className="hm-btn-outline flex-none text-xs">
                  + Add
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Thumbnail</label>
              <ImagePicker label="Choose thumbnail" value={form.thumbnail} onChange={(v) => setForm((f) => ({ ...f, thumbnail: v }))} />
            </div>
          </div>
        ),
      },
      {
        key: "hierarchy",
        label: "Academic Hierarchy",
        content: (
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                Assign to courses (blank = visible to every course)
              </label>
              <CoursePicker courses={courses} selected={form.courses} onChange={(v) => setForm((f) => ({ ...f, courses: v }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Subject</label>
                <select value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="hm-input">
                  <option value="">None</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Unit</label>
                <select
                  value={form.selectedUnit}
                  onChange={(e) => setForm((f) => ({ ...f, selectedUnit: e.target.value }))}
                  className="hm-input"
                  disabled={!chapters.length}
                >
                  <option value="">None</option>
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Chapter</label>
                <select
                  value={form.selectedChapter}
                  onChange={(e) => setForm((f) => ({ ...f, selectedChapter: e.target.value }))}
                  className="hm-input"
                  disabled={!topics.length}
                >
                  <option value="">None</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "source",
        label: "Source & Media",
        content: (
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Source</label>
              <select
                value={form.source_type}
                onChange={(e) => setForm((f) => ({ ...f, source_type: e.target.value }))}
                className="hm-input"
              >
                {SOURCE_TYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {form.source_type === "upload" ? (
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Video file</label>
                <FilePicker
                  label="Choose video file"
                  accept="video/*"
                  value={form.video_file}
                  onChange={(v) => setForm((f) => ({ ...f, video_file: v }))}
                />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Video URL</label>
                <input
                  value={form.video_url}
                  onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                  placeholder="https://..."
                  className="hm-input"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Duration (minutes)</label>
                <input
                  type="number"
                  min={0}
                  value={form.duration_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                  className="hm-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                  Instructor name (optional — falls back to your account)
                </label>
                <input
                  value={form.instructor_name}
                  onChange={(e) => setForm((f) => ({ ...f, instructor_name: e.target.value }))}
                  className="hm-input"
                />
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "access",
        label: "Access Control",
        content: (
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Access level</label>
              <select
                value={form.access_level}
                onChange={(e) => setForm((f) => ({ ...f, access_level: e.target.value }))}
                className="hm-input"
              >
                {ACCESS_LEVELS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] p-3 text-sm">
              <span className="font-semibold text-[var(--color-text)]">Allow notes download</span>
              <input
                type="checkbox"
                checked={form.allow_notes_download}
                onChange={(e) => setForm((f) => ({ ...f, allow_notes_download: e.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] p-3 text-sm">
              <span className="font-semibold text-[var(--color-text)]">Allow slides download</span>
              <input
                type="checkbox"
                checked={form.allow_slides_download}
                onChange={(e) => setForm((f) => ({ ...f, allow_slides_download: e.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] p-3 text-sm">
              <span className="font-semibold text-[var(--color-text)]">Active (visible to students)</span>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
            </label>
          </div>
        ),
      },
      {
        key: "resources",
        label: "Resources",
        content: (
          <div className="flex flex-col gap-3">
            {form.resources.map((r, idx) => (
              <div key={r.id || `new-${idx}`} className="rounded-lg border border-[var(--color-border)] p-3">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={r.resource_type}
                    onChange={(e) => updateResource(idx, { resource_type: e.target.value })}
                    className="hm-input text-xs"
                  >
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={r.title}
                    onChange={(e) => updateResource(idx, { title: e.target.value })}
                    placeholder="Title"
                    className="hm-input text-xs"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <FilePicker label="Choose file" value={r.file} onChange={(v) => updateResource(idx, { file: v })} />
                  <span className="text-xs text-[var(--color-text-muted)]">or</span>
                  <input
                    value={r.external_url || ""}
                    onChange={(e) => updateResource(idx, { external_url: e.target.value })}
                    placeholder="External URL"
                    className="hm-input flex-1 text-xs"
                  />
                </div>
                <button type="button" onClick={() => removeResource(idx)} className="mt-2 text-xs font-semibold text-brand-red">
                  Remove resource
                </button>
              </div>
            ))}
            <button type="button" onClick={addResource} className="hm-btn-outline text-xs">
              + Add resource
            </button>
          </div>
        ),
      },
      {
        key: "quiz",
        label: "Quiz Linking",
        content: (
          <div>
            <p className="mb-2 text-xs text-[var(--color-text-muted)]">
              Students can jump straight from the player to any quiz linked here.
            </p>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--color-border)] p-2">
              {tests.map((t) => (
                <label key={t.id} className="flex items-center gap-2 border-b border-[var(--color-border)] px-2 py-2 text-xs last:border-0">
                  <input type="checkbox" checked={form.linked_tests.includes(t.id)} onChange={() => toggleLinkedTest(t.id)} />
                  <span className="truncate">{t.title}</span>
                  <span className="ml-auto flex-none text-[10px] text-[var(--color-text-muted)]">{t.exam_type}</span>
                </label>
              ))}
              {tests.length === 0 && <p className="p-2 text-xs text-[var(--color-text-muted)]">No exams created yet.</p>}
            </div>
          </div>
        ),
      },
      {
        key: "analytics",
        label: "Analytics",
        content: !editingId ? (
          <p className="text-xs text-[var(--color-text-muted)]">Save the video first to see analytics.</p>
        ) : !analytics ? (
          <p className="text-xs text-[var(--color-text-muted)]">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="hm-card p-3">
              <p className="text-xs text-[var(--color-text-muted)]">Views</p>
              <p className="text-xl font-bold text-[var(--color-text)]">{analytics.views_count}</p>
            </div>
            <div className="hm-card p-3">
              <p className="text-xs text-[var(--color-text-muted)]">Watchers</p>
              <p className="text-xl font-bold text-[var(--color-text)]">{analytics.watchers}</p>
            </div>
            <div className="hm-card p-3">
              <p className="text-xs text-[var(--color-text-muted)]">Completed</p>
              <p className="text-xl font-bold text-[var(--color-text)]">{analytics.completed}</p>
            </div>
            <div className="hm-card p-3">
              <p className="text-xs text-[var(--color-text-muted)]">Avg. watch %</p>
              <p className="text-xl font-bold text-[var(--color-text)]">{analytics.avg_watch_percent}%</p>
            </div>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, chapters, topics, subjects, courses, categories, tests, newCategoryName, analytics, editingId]
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">🎥 Video Lectures</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Upload and organize structured video content mapped to your course → subject → unit → chapter hierarchy.
          </p>
        </div>
        <button onClick={openCreate} className="hm-btn-primary">
          + Upload Video
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-1 border-b border-[var(--color-border)]">
          {TABS_META.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold ${
                tab === t.key ? "border-b-2 border-brand-blue text-brand-blue" : "text-[var(--color-text-muted)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search videos…"
          className="hm-input w-64"
        />
      </div>

      <div className="mt-4 hm-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {videos
              .filter((v) => tab !== "active" || !v.is_archived)
              .map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{v.title}</td>
                  <td className="px-4 py-3 text-xs">{v.subject_name || "—"}</td>
                  <td className="px-4 py-3 text-xs">{v.category_name || "—"}</td>
                  <td className="px-4 py-3 text-xs">{ACCESS_LEVELS.find((a) => a.key === v.access_level)?.label.split(" —")[0]}</td>
                  <td className="px-4 py-3">{v.views_count}</td>
                  <td className="px-4 py-3">
                    {v.is_archived ? (
                      <span className="rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-[10px] font-bold text-[var(--color-text-muted)]">
                        ARCHIVED
                      </span>
                    ) : v.is_active ? (
                      <span className="rounded-md bg-brand-green-light px-2 py-1 text-[10px] font-bold text-brand-green">ACTIVE</span>
                    ) : (
                      <span className="rounded-md bg-yellow-100 px-2 py-1 text-[10px] font-bold text-yellow-800">DRAFT</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(v)} className="mr-3 text-xs font-semibold text-brand-blue">
                      Edit
                    </button>
                    <button onClick={() => archiveToggle(v)} className="mr-3 text-xs font-semibold text-[var(--color-text-muted)]">
                      {v.is_archived ? "Unarchive" : "Archive"}
                    </button>
                    <button onClick={() => deleteVideo(v.id)} className="text-xs font-semibold text-brand-red">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && videos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No videos here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showBuilder && (
        <ExamBuilderModal
          title={editingId ? "Edit video" : "Upload video"}
          tabs={tabs}
          onCancel={() => setShowBuilder(false)}
          onSave={save}
          saving={saving}
          error={error}
        />
      )}
    </div>
  );
}

export default function VideosPage() {
  return (
    <RequireStaff feature="video_lectures">
      <Shell>
        <VideosContent />
      </Shell>
    </RequireStaff>
  );
}
