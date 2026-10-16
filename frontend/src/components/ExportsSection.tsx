"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { Download, FileSpreadsheet, AlertTriangle, FileText, History } from "lucide-react";
import { getExportUrl, getReviewExportUrl } from "@/lib/api";

export default function ExportsSection() {
  const { currentDatasetId, dataset } = useApp();

  if (!currentDatasetId || !dataset) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <Download className="mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
        <p className="text-lg font-medium text-[var(--foreground)]">No dataset loaded</p>
      </div>
    );
  }

  const exports = [
    {
      title: "Full Dataset",
      description: "All transactions with anomaly scores, review statuses, and inclusion states.",
      icon: FileSpreadsheet,
      url: getExportUrl(currentDatasetId, "all"),
      color: "indigo",
    },
    {
      title: "Included Transactions",
      description: "Only transactions currently included in the active analysis.",
      icon: FileText,
      url: getExportUrl(currentDatasetId, "included"),
      color: "green",
    },
    {
      title: "Flagged Anomalies",
      description: "Only transactions flagged as potential anomalies by the ML model.",
      icon: AlertTriangle,
      url: getExportUrl(currentDatasetId, "flagged"),
      color: "red",
    },
    {
      title: "Excluded Transactions",
      description: "Transactions that have been excluded from the active analysis.",
      icon: FileText,
      url: getExportUrl(currentDatasetId, "excluded"),
      color: "amber",
    },
    {
      title: "Review Audit Log",
      description: "Complete history of all review, exclude, and restore actions.",
      icon: History,
      url: getReviewExportUrl(currentDatasetId),
      color: "purple",
    },
  ];

  const colorMap: Record<string, string> = {
    indigo: "border-indigo-500/20 hover:border-indigo-500/40",
    green: "border-green-500/20 hover:border-green-500/40",
    red: "border-red-500/20 hover:border-red-500/40",
    amber: "border-amber-500/20 hover:border-amber-500/40",
    purple: "border-purple-500/20 hover:border-purple-500/40",
  };

  const iconColorMap: Record<string, string> = {
    indigo: "text-indigo-400 bg-indigo-500/10",
    green: "text-green-400 bg-green-500/10",
    red: "text-red-400 bg-red-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    purple: "text-purple-400 bg-purple-500/10",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">Exports</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Download your analysis results as CSV files.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exports.map((exp) => {
          const Icon = exp.icon;
          return (
            <a
              key={exp.title}
              href={exp.url}
              download
              className={`group flex flex-col rounded-xl border bg-[var(--card)] p-5 transition-all duration-200 hover:scale-[1.01] ${colorMap[exp.color]}`}
            >
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${iconColorMap[exp.color]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-[var(--foreground)]">{exp.title}</h3>
              <p className="mt-1 flex-1 text-xs text-[var(--muted-foreground)]">
                {exp.description}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100">
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
