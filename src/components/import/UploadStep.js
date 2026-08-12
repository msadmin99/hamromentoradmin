"use client";

import { useState } from "react";
import { downloadFile, uploadFields } from "@/lib/api";

const FORMATS = [
  { key: "docx", label: "Word (.docx)", icon: "📄" },
  { key: "xlsx", label: "Excel (.xlsx)", icon: "📊" },
  { key: "csv", label: "CSV", icon: "📋" },
  { key: "json", label: "JSON", icon: "🔧" },
];

export default function UploadStep({ importMode = "question_bank", onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [downloadingFormat, setDownloadingFormat] = useState("");

  function pickFile(f) {
    setFile(f);
    setError("");
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = await uploadFields("/import-batches/upload/", "POST", { file, import_mode: importMode });
      onUploaded(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleTemplate(fmt) {
    setDownloadingFormat(fmt);
    try {
      await downloadFile(`/import-templates/${fmt}/`, `question-import-template.${fmt}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingFormat("");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) pickFile(dropped);
        }}
        className={`hm-card flex flex-col items-center gap-3 border-2 border-dashed p-10 text-center ${
          dragging ? "border-brand-blue bg-brand-blue/5" : "border-[var(--color-border)]"
        }`}
      >
        <span className="text-3xl">📥</span>
        <p className="text-sm font-semibold text-[var(--color-text)]">Drag & drop a file here, or</p>
        <label className="hm-btn-primary cursor-pointer">
          Choose File
          <input
            type="file"
            accept=".docx,.xlsx,.csv,.json"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] || null)}
          />
        </label>
        <p className="text-[11px] text-[var(--color-text-muted)]">Supports .docx, .xlsx, .csv, .json — up to 20MB</p>

        {file && (
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm">
            <span className="text-[var(--color-text)]">{file.name}</span>
            <button onClick={handleUpload} disabled={uploading} className="hm-btn-primary px-3 py-1.5 text-xs">
              {uploading ? "Uploading & validating…" : "Upload"}
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm font-medium text-brand-red">{error}</p>}

      <div className="hm-card p-4">
        <p className="text-sm font-bold text-[var(--color-text)]">Download Templates</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Each template includes a sample question with the expected structure — question text, options, correct
          answer, and explanation, plus optional images. Subject, Chapter, Topic and Course are selected on the next
          screen, not in the file — and marks/negative marks are set later in Exam Management.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              onClick={() => handleTemplate(f.key)}
              disabled={downloadingFormat === f.key}
              className="rounded-lg border border-[var(--color-border)] p-3 text-center text-xs font-semibold text-[var(--color-text)]"
            >
              <span className="block text-lg">{f.icon}</span>
              {downloadingFormat === f.key ? "Downloading…" : f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
