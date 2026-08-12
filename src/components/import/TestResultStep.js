"use client";

import Link from "next/link";

export default function TestResultStep({ result, retrying, onFixFile, onRetry, onStartOver }) {
  if (!result) return null;

  if (result.success) {
    return (
      <div className="hm-card flex flex-col items-center gap-4 p-8 text-center">
        <span className="text-3xl">✅</span>
        <p className="text-lg font-bold text-[var(--color-text)]">Questions imported and test created successfully</p>
        <div className="flex gap-3">
          <button onClick={onStartOver} className="hm-btn-primary">
            Import another file
          </button>
          <Link href="/exam-management" className="hm-btn-outline">
            Go to Exam Management
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="hm-card flex flex-col items-center gap-4 p-8 text-center">
      <span className="text-3xl">⚠️</span>
      <p className="text-lg font-bold text-[var(--color-text)]">Import Failed</p>
      <p className="text-sm text-[var(--color-text-muted)]">No incomplete test was published.</p>
      {result.detail && <p className="max-w-md text-sm font-medium text-brand-red">{result.detail}</p>}
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={onFixFile} className="hm-btn-outline">
          Fix File
        </button>
        <button onClick={onRetry} disabled={retrying} className="hm-btn-primary">
          {retrying ? "Retrying…" : "Try Again"}
        </button>
        <button onClick={onStartOver} className="hm-btn-outline">
          Start Over
        </button>
      </div>
    </div>
  );
}
