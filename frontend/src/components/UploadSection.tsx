"use client";

import React, { useState, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { validateDataset } from "@/lib/api";
import type { DatasetValidationResult } from "@/types";

export default function UploadSection() {
  const { uploadFile, loadDemoData, loading, backendConnected } = useApp();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<DatasetValidationResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setUploadError(null);
    setValidation(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Only CSV files are accepted.");
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setUploadError("File size exceeds 500 MB limit.");
      return;
    }

    setSelectedFile(file);
    setValidating(true);

    try {
      const result = await validateDataset(file);
      setValidation(result);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files?.[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!selectedFile) return;
    await uploadFile(selectedFile);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setValidation(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">
          Upload Dataset
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Upload a CSV file with financial transaction data. Required column: amount.
          Optional: date, description, category, merchant, transaction_type, account.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all duration-300",
          dragActive
            ? "border-indigo-500 bg-indigo-500/5"
            : "border-[var(--border)] bg-[var(--card)] hover:border-indigo-500/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFile(e.target.files[0]);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <div className="mb-4 rounded-xl bg-indigo-500/10 p-4">
          <Upload className="h-8 w-8 text-indigo-400" />
        </div>
        <p className="text-sm font-medium text-[var(--foreground)]">
          Drop your CSV file here, or click to browse
        </p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          CSV files up to 500 MB, maximum 1,000,000 rows
        </p>
      </div>

      {/* Demo Data button */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs text-[var(--muted-foreground)]">or</span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>
      <button
        onClick={loadDemoData}
        disabled={loading || !backendConnected}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-5 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] disabled:opacity-50"
      >
        {loading ? "Loading..." : "Load Demo Data (200 synthetic transactions)"}
      </button>

      {/* Error */}
      {uploadError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {uploadError}
          <button onClick={handleReset} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Validating */}
      {validating && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
          Validating {selectedFile?.name}...
        </div>
      )}

      {/* Validation Results */}
      {validation && selectedFile && (
        <div className="space-y-4 animate-fade-in">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border p-4 text-sm",
              validation.is_valid
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            )}
          >
            {validation.is_valid ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <div>
              <p className="font-medium">
                {validation.is_valid ? "File is valid" : "Validation failed"}
              </p>
              <p className="mt-0.5 text-xs opacity-80">
                {selectedFile.name} — {validation.total_rows} rows,{" "}
                {validation.valid_rows} valid, {validation.invalid_rows} invalid
              </p>
            </div>
          </div>

          {/* Column mapping */}
          {Object.keys(validation.columns_mapped).length > 0 && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                Column Mapping
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(validation.columns_mapped).map(([standard, csv]) => (
                  <div key={standard} className="flex items-center gap-2">
                    <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-mono text-indigo-400">
                      {standard}
                    </span>
                    <span className="text-[var(--muted-foreground)]">←</span>
                    <span className="text-[var(--foreground)]">{csv}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="space-y-2">
              {validation.warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-400"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {w}
                </div>
              ))}
            </div>
          )}

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="space-y-2">
              {validation.errors.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-400"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {e}
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {validation.preview_rows.length > 0 && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                Data Preview (first {validation.preview_rows.length} rows)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {validation.columns_found.slice(0, 8).map((col) => (
                        <th
                          key={col}
                          className="pb-2 pr-4 text-left font-medium text-[var(--muted-foreground)]"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {validation.preview_rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {validation.columns_found.slice(0, 8).map((col) => (
                          <td
                            key={col}
                            className="max-w-[150px] truncate py-2 pr-4 text-[var(--foreground)]"
                          >
                            {String(row[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              Cancel
            </button>
            {validation.is_valid && (
              <button
                onClick={handleUpload}
                disabled={loading}
                className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  `Upload & Process ${validation.valid_rows} Transactions`
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
