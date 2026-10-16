"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { History, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function ReviewHistory() {
  const { reviewLogs, currentDatasetId } = useApp();

  if (!currentDatasetId) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <History className="mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
        <p className="text-lg font-medium text-[var(--foreground)]">No dataset loaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">Review History</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Audit trail of all review, exclude, and restore actions.
        </p>
      </div>

      {reviewLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] py-16 text-center">
          <Clock className="mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">No review actions yet</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Actions will appear here when you review, exclude, or restore transactions.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviewLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10">
                <History className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {log.action}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {log.previous_status && (
                    <span>
                      {log.previous_status} → {log.new_status}
                    </span>
                  )}
                  {log.note && <span className="ml-2">— {log.note}</span>}
                </p>
              </div>
              <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                {formatDateTime(log.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
