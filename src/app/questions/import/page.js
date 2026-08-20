"use client";

import Link from "next/link";
import { useState } from "react";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import DistributionPreviewStep from "@/components/import/DistributionPreviewStep";
import PreviewStep from "@/components/import/PreviewStep";
import ProgressStep from "@/components/import/ProgressStep";
import SummaryStep from "@/components/import/SummaryStep";
import TestConfigStep from "@/components/import/TestConfigStep";
import TestResultStep from "@/components/import/TestResultStep";
import UploadStep from "@/components/import/UploadStep";
import { api } from "@/lib/api";

const QUESTION_BANK_STEPS = ["upload", "preview", "progress", "summary"];
const QUESTION_BANK_LABELS = ["Upload", "Preview & Validate", "Import", "Summary"];
const CREATE_TEST_STEPS = ["upload", "preview", "test_config", "distribution", "test_result"];
const CREATE_TEST_LABELS = ["Upload", "Preview & Validate", "Test Configuration", "Distribution Preview", "Create Test"];

function ImportContent() {
  const [importMode, setImportMode] = useState("question_bank"); // question_bank | create_test
  const [step, setStep] = useState("upload");
  const [batch, setBatch] = useState(null);
  const [testConfig, setTestConfig] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [creatingTest, setCreatingTest] = useState(false);
  const [highlightRowNumber, setHighlightRowNumber] = useState(null);

  function handleUploaded(batchSummary) {
    setBatch(batchSummary);
    setHighlightRowNumber(null);
    setStep("preview");
  }

  function handlePreviewContinue(updatedBatch) {
    const nextBatch = updatedBatch || batch;
    if (updatedBatch) setBatch(updatedBatch);
    // Route off the batch's own recorded import_mode, not the "Import Type"
    // selector state — the selector can only ever be right at the moment a
    // NEW upload starts; once a batch exists, what the server actually
    // stored for it is the only thing that can't drift out of sync.
    if (nextBatch.import_mode === "create_test") {
      setStep("test_config");
    } else {
      setStep("progress");
    }
  }

  function handleTestConfigContinue(config) {
    setTestConfig(config);
    setStep("distribution");
  }

  async function createTest(config) {
    setCreatingTest(true);
    try {
      const result = await api.post(`/import-batches/${batch.id}/create-test/`, config);
      setBatch(result);
      setTestResult({ success: true, testId: result.test_id });
    } catch (err) {
      setTestResult({ success: false, detail: err.message, failedRowNumber: err.data?.failed_row_number ?? null });
    } finally {
      setCreatingTest(false);
      setStep("test_result");
    }
  }

  function handleFixFile() {
    setHighlightRowNumber(testResult?.failedRowNumber ?? null);
    setStep("preview");
  }

  function handleImportFinished(finalBatch) {
    setBatch(finalBatch);
    setStep("summary");
  }

  function startOver() {
    setBatch(null);
    setTestConfig(null);
    setTestResult(null);
    setHighlightRowNumber(null);
    setStep("upload");
  }

  // Once a batch exists, its own import_mode (what the server actually
  // recorded at upload) drives which step flow is shown — never the
  // "Import Type" selector state, which is only meaningful pre-upload and
  // must not silently relabel an existing batch's flow.
  const effectiveMode = batch ? batch.import_mode : importMode;
  const stepKeys = effectiveMode === "create_test" ? CREATE_TEST_STEPS : QUESTION_BANK_STEPS;
  const stepLabels = effectiveMode === "create_test" ? CREATE_TEST_LABELS : QUESTION_BANK_LABELS;
  const currentIndex = stepKeys.indexOf(step);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <a href="/questions" className="text-xs font-semibold text-brand-blue">
            ← Back to Question Entry
          </a>
          <h1 className="mt-2 text-xl font-bold text-[var(--color-text)]">Bulk Question Import</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Import Word, Excel, CSV, or JSON files of Physics, Chemistry, or Biology questions — validated and
            duplicate-checked before anything is saved.
          </p>
        </div>
        <Link href="/questions/import/history" className="hm-btn-outline">
          📜 Import History
        </Link>
      </div>

      {step === "upload" && (
        <div className="hm-card mt-4 p-4">
          <p className="text-sm font-bold text-[var(--color-text)]">Import Type</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-6">
            <label className="flex items-start gap-2 text-sm text-[var(--color-text)]">
              <input
                type="radio"
                className="mt-0.5"
                checked={importMode === "question_bank"}
                onChange={() => setImportMode("question_bank")}
              />
              <span>
                <span className="font-semibold">Import to Question Bank</span>
                <br />
                <span className="text-xs text-[var(--color-text-muted)]">Adds questions to the question bank only.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-[var(--color-text)]">
              <input
                type="radio"
                className="mt-0.5"
                checked={importMode === "create_test"}
                onChange={() => setImportMode("create_test")}
              />
              <span>
                <span className="font-semibold">Import & Create Test</span>
                <br />
                <span className="text-xs text-[var(--color-text-muted)]">
                  Imports questions AND assembles them into a complete Test in Exam Management.
                </span>
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)]">
        {stepLabels.map((label, i) => {
          const isActive = i === currentIndex;
          const isDone = currentIndex > i;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 ${
                  isActive
                    ? "bg-brand-blue text-white"
                    : isDone
                      ? "bg-brand-green-light text-brand-green"
                      : "bg-[var(--color-surface-muted)]"
                }`}
              >
                {isDone ? "✓ " : ""}
                {label}
              </span>
              {i < stepLabels.length - 1 && <span>→</span>}
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        {step === "upload" && <UploadStep importMode={importMode} onUploaded={handleUploaded} />}
        {step === "preview" && batch && (
          <PreviewStep
            batch={batch}
            mode={effectiveMode}
            highlightRowNumber={highlightRowNumber}
            onConfirmed={handlePreviewContinue}
            onCancel={startOver}
          />
        )}
        {step === "progress" && batch && <ProgressStep batchId={batch.id} onFinished={handleImportFinished} />}
        {step === "summary" && batch && <SummaryStep batch={batch} onStartOver={startOver} />}

        {step === "test_config" && batch && (
          <TestConfigStep batch={batch} initialConfig={testConfig} onContinue={handleTestConfigContinue} onBack={() => setStep("preview")} />
        )}
        {step === "distribution" && batch && testConfig && (
          <DistributionPreviewStep
            batch={batch}
            config={testConfig}
            creating={creatingTest}
            onCreate={() => createTest(testConfig)}
            onBack={() => setStep("test_config")}
          />
        )}
        {step === "test_result" && (
          <TestResultStep
            result={testResult}
            retrying={creatingTest}
            onFixFile={handleFixFile}
            onRetry={() => createTest(testConfig)}
            onStartOver={startOver}
          />
        )}
      </div>
    </div>
  );
}

export default function ImportPage() {
  return (
    <RequireStaff feature="question_entry">
      <Shell>
        <ImportContent />
      </Shell>
    </RequireStaff>
  );
}
