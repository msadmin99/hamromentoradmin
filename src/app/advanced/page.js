"use client";

import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { API_URL } from "@/lib/api";

function CronCard({ title, description, path }) {
  return (
    <div className="hm-card p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">⏱ {title}</p>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 font-mono text-xs text-[var(--color-text)]">
        <span>
          {API_URL}
          {path}
        </span>
        <button
          onClick={() => navigator.clipboard?.writeText(`${API_URL}${path}`)}
          className="ml-3 flex-none text-[var(--color-text-muted)]"
          aria-label="Copy"
        >
          ⧉
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">
        Authenticate the request with the <code className="rounded bg-[var(--color-surface-muted)] px-1">CRON_SECRET</code>{" "}
        value set in the backend&apos;s <code className="rounded bg-[var(--color-surface-muted)] px-1">.env</code> — either as
        header <code className="rounded bg-[var(--color-surface-muted)] px-1">X-Cron-Secret: &lt;secret&gt;</code> or query param{" "}
        <code className="rounded bg-[var(--color-surface-muted)] px-1">?secret=&lt;secret&gt;</code>. It&apos;s never shown here
        since it&apos;s a server-side secret.
      </p>
    </div>
  );
}

function AdvancedContent() {
  return (
    <div className="p-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">🔌 Advanced</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Cron jobs and API integrations for this deployment.</p>

      <div className="mt-5 flex flex-col gap-4">
        <CronCard
          title="Automatic daily generation (external cron)"
          description="Courses with 'Auto-generate each day' enabled (in Daily Live Exam → Format settings) only get today's exam set created when this endpoint is called — set up a daily job at cron-job.org (or any scheduler) to POST it once a day."
          path="/cron/generate-daily-live-exams/"
        />
        <CronCard
          title="Automatic daily generation (external cron)"
          description="Every course with a Daily Practice format configured only gets today's question set created when this endpoint is called — set up a daily job to POST it once a day, instead of it generating lazily on a student's first click."
          path="/cron/generate-daily-practice/"
        />
        <CronCard
          title="Housekeeping (external cron)"
          description="A package's access already stops the instant it expires or is revoked — this just deletes long-stale grant records so admin lists stay clean. Safe to run weekly rather than daily."
          path="/cron/prune-expired-packages/"
        />
      </div>
    </div>
  );
}

export default function AdvancedPage() {
  return (
    <RequireStaff feature="advanced">
      <Shell>
        <AdvancedContent />
      </Shell>
    </RequireStaff>
  );
}
