"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  FlaskConical,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Sparkles,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { cn, formatNumber, formatPercentage } from "@/lib/utils";
import { DetectionMethod } from "@/types";

const methods = [
  {
    id: DetectionMethod.ISOLATION_FOREST,
    label: "Isolation Forest",
    description: "Unsupervised ML algorithm that isolates anomalies by random feature splitting. Best for multi-dimensional anomaly detection.",
    icon: Sparkles,
    color: "indigo",
  },
  {
    id: DetectionMethod.STATISTICAL_IQR,
    label: "Statistical IQR",
    description: "Interquartile Range-based method. Flags transactions with amounts significantly outside the normal distribution.",
    icon: BarChart3,
    color: "cyan",
  },
  {
    id: DetectionMethod.COMBINED,
    label: "Combined (Ensemble)",
    description: "Runs both methods and flags a transaction if either model detects an anomaly. Provides broader coverage.",
    icon: TrendingUp,
    color: "purple",
  },
];

export default function AnalysisSection() {
  const { runAnalysis, analysisRunning, analysisResult, dataset, currentDatasetId, error } = useApp();
  const [selectedMethod, setSelectedMethod] = useState<DetectionMethod>(
    DetectionMethod.ISOLATION_FOREST
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [contamination, setContamination] = useState(0.1);
  const [nEstimators, setNEstimators] = useState(100);
  const [iqrMultiplier, setIqrMultiplier] = useState(1.5);

  const handleRunAnalysis = async () => {
    await runAnalysis(selectedMethod, {
      contamination,
      n_estimators: nEstimators,
      iqr_multiplier: iqrMultiplier,
    });
  };

  if (!currentDatasetId || !dataset) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <FlaskConical className="mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
        <p className="text-lg font-medium text-[var(--foreground)]">
          No dataset loaded
        </p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Upload a CSV file or load demo data first.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">
          Run Analysis
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Select a detection method and configure parameters to analyze{" "}
          <span className="font-medium text-[var(--foreground)]">
            {dataset.name}
          </span>{" "}
          ({formatNumber(dataset.total_rows)} transactions).
        </p>
      </div>

      {/* Method Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Detection Method
        </h3>
        <div className="grid gap-3">
          {methods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={cn(
                  "flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200",
                  isSelected
                    ? "border-indigo-500/50 bg-indigo-500/5"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]/30"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 rounded-lg p-2",
                    isSelected
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-[var(--secondary)] text-[var(--muted-foreground)]"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--foreground)]">
                    {method.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {method.description}
                  </p>
                </div>
                <div
                  className={cn(
                    "mt-1 h-4 w-4 rounded-full border-2 transition-all",
                    isSelected
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-[var(--muted-foreground)]"
                  )}
                >
                  {isSelected && (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between p-4 text-sm font-medium text-[var(--foreground)]"
        >
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-[var(--muted-foreground)]" />
            Advanced Parameters
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            {showAdvanced ? "Hide" : "Show"}
          </span>
        </button>
        {showAdvanced && (
          <div className="space-y-4 border-t border-[var(--border)] p-4 animate-fade-in">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                Contamination ({(contamination * 100).toFixed(0)}%)
              </label>
              <p className="mb-2 text-[10px] text-[var(--muted-foreground)]">
                Expected proportion of anomalies in the dataset. Lower = fewer flagged.
              </p>
              <input
                type="range"
                min={0.01}
                max={0.5}
                step={0.01}
                value={contamination}
                onChange={(e) => setContamination(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="mt-1 flex justify-between text-[10px] text-[var(--muted-foreground)]">
                <span>1%</span>
                <span>50%</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                Number of Trees ({nEstimators})
              </label>
              <p className="mb-2 text-[10px] text-[var(--muted-foreground)]">
                Number of trees in the Isolation Forest ensemble. More trees = more stable results.
              </p>
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={nEstimators}
                onChange={(e) => setNEstimators(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                IQR Multiplier ({iqrMultiplier.toFixed(1)})
              </label>
              <p className="mb-2 text-[10px] text-[var(--muted-foreground)]">
                Used by the statistical method. Higher = less sensitive.
              </p>
              <input
                type="range"
                min={1.0}
                max={5.0}
                step={0.1}
                value={iqrMultiplier}
                onChange={(e) => setIqrMultiplier(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Run Button */}
      <button
        onClick={handleRunAnalysis}
        disabled={analysisRunning}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3.5 text-sm font-semibold text-white transition-all hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
      >
        {analysisRunning ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Running Analysis...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Run Anomaly Detection
          </span>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {analysisResult && (
        <div className="animate-fade-in space-y-4">
          <div
            className={cn(
              "rounded-xl border p-5",
              analysisResult.status === "completed"
                ? "border-green-500/30 bg-green-500/5"
                : "border-red-500/30 bg-red-500/5"
            )}
          >
            <div className="flex items-center gap-3">
              {analysisResult.status === "completed" ? (
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-400" />
              )}
              <div>
                <p className="font-semibold text-[var(--foreground)]">
                  Analysis{" "}
                  {analysisResult.status === "completed"
                    ? "Complete"
                    : "Failed"}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Method: {analysisResult.method.replace(/_/g, " ")} |{" "}
                  {formatNumber(analysisResult.total_transactions)} transactions analyzed
                </p>
              </div>
            </div>

            {analysisResult.status === "completed" && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-black/20 p-3 text-center">
                  <p className="text-2xl font-bold text-red-400">
                    {formatNumber(analysisResult.anomalies_detected)}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    Potential Anomalies
                  </p>
                </div>
                <div className="rounded-lg bg-black/20 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {formatPercentage(analysisResult.anomaly_percentage)}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    Anomaly Rate
                  </p>
                </div>
                <div className="rounded-lg bg-black/20 p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-400">
                    {analysisResult.features_used.length}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    Features Used
                  </p>
                </div>
              </div>
            )}

            {analysisResult.features_used.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">
                  Features Used:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.features_used.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-medium text-indigo-400"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysisResult.error_message && (
              <p className="mt-3 text-xs text-red-400">
                Error: {analysisResult.error_message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-400/80">
        <p className="font-medium">⚠️ Important Note</p>
        <p className="mt-1">
          Anomaly detection identifies unusual patterns, not confirmed fraud. Flagged
          transactions are &quot;potential anomalies&quot; that require human review. Without
          ground-truth labels, precision/recall metrics cannot be reported.
        </p>
      </div>
    </div>
  );
}
