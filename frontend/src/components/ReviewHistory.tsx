"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import {
  History,
  Clock,
  Download,
  Filter,
  Search,
  ArrowRight,
  EyeOff,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  FileCheck2,
  Tag,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  formatDateTime,
  formatCurrency,
  cleanCategoryName,
  formatReviewAction,
  cn,
} from "@/lib/utils";
import { getReviewExportUrl } from "@/lib/api";

type FilterTab = "all" | "reviews" | "exclusions" | "restores";

export default function ReviewHistory() {
  const { reviewLogs, currentDatasetId } = useApp();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Statistics
  const stats = useMemo(() => {
    let reviewsCount = 0;
    let exclusionsCount = 0;
    let restoresCount = 0;

    for (const log of reviewLogs) {
      if (log.action.includes("excluded") || log.new_included === false) {
        exclusionsCount++;
      } else if (log.action.includes("included") || log.new_included === true) {
        restoresCount++;
      } else {
        reviewsCount++;
      }
    }

    return {
      total: reviewLogs.length,
      reviews: reviewsCount,
      exclusions: exclusionsCount,
      restores: restoresCount,
    };
  }, [reviewLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return reviewLogs.filter((log) => {
      // Tab filter
      const isExclude = log.action.includes("excluded") || log.new_included === false;
      const isRestore = log.action.includes("included") || log.new_included === true;
      const isReview = !isExclude && !isRestore;

      if (activeFilter === "reviews" && !isReview) return false;
      if (activeFilter === "exclusions" && !isExclude) return false;
      if (activeFilter === "restores" && !isRestore) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = log.transaction_description?.toLowerCase().includes(query);
        const matchesCategory = log.transaction_category?.toLowerCase().includes(query);
        const matchesNote = log.note?.toLowerCase().includes(query);
        const matchesAction = log.action.toLowerCase().includes(query);
        const matchesId = log.transaction_id.toLowerCase().includes(query);

        if (!matchesDesc && !matchesCategory && !matchesNote && !matchesAction && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [reviewLogs, activeFilter, searchQuery]);

  if (!currentDatasetId) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] border border-[var(--border)]">
          <History className="h-8 w-8 text-[var(--muted-foreground)]" />
        </div>
        <p className="mt-4 text-lg font-medium text-[var(--foreground)]">No dataset loaded</p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Upload a CSV or load demo data to view review actions and audit trail.
        </p>
      </div>
    );
  }

  const exportUrl = getReviewExportUrl(currentDatasetId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Review History
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Audit trail of all review decisions, status updates, and dataset exclusions.
          </p>
        </div>

        {reviewLogs.length > 0 && (
          <div className="flex items-center gap-3">
            <a
              href={exportUrl}
              download
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-xs font-medium text-[var(--foreground)] transition-all hover:bg-white/[0.04] hover:border-indigo-500/30"
            >
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              Export Audit Trail (.csv)
            </a>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      {reviewLogs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Total Actions</span>
              <History className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{stats.total}</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Reviews Logged</span>
              <ShieldCheck className="h-4 w-4 text-blue-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{stats.reviews}</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Exclusions</span>
              <EyeOff className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{stats.exclusions}</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Restores</span>
              <RotateCcw className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{stats.restores}</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      {reviewLogs.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-[var(--border)] bg-black/20 p-1">
            <button
              onClick={() => setActiveFilter("all")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                activeFilter === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-white"
              )}
            >
              All Actions ({stats.total})
            </button>
            <button
              onClick={() => setActiveFilter("reviews")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                activeFilter === "reviews"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-white"
              )}
            >
              Reviews ({stats.reviews})
            </button>
            <button
              onClick={() => setActiveFilter("exclusions")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                activeFilter === "exclusions"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-white"
              )}
            >
              Exclusions ({stats.exclusions})
            </button>
            {stats.restores > 0 && (
              <button
                onClick={() => setActiveFilter("restores")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  activeFilter === "restores"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-white"
                )}
              >
                Restores ({stats.restores})
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-1.5 pl-9 pr-8 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Logs List */}
      {reviewLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] py-16 text-center">
          <Clock className="mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">No review actions yet</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Actions will appear here when you review, exclude, or restore transactions.
          </p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] py-12 text-center">
          <Filter className="mb-2 h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">No matching audit logs</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Try adjusting your search query or switching filter tabs.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log) => {
            const action = formatReviewAction(log);

            return (
              <div
                key={log.id}
                className="group relative flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.02]"
              >
                {/* Top Row: Icon, Badge, Description, Amount, Time */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Action Icon Badge */}
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-inner",
                        action.actionType === "exclude" && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                        action.actionType === "restore" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                        action.actionType === "review_ok" && "bg-green-500/10 text-green-400 border border-green-500/20",
                        action.actionType === "review_suspicious" && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                        action.actionType === "review_false_positive" && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                        action.actionType === "review" && "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      )}
                    >
                      {action.actionType === "exclude" && <EyeOff className="h-4 w-4" />}
                      {action.actionType === "restore" && <RotateCcw className="h-4 w-4" />}
                      {action.actionType === "review_ok" && <ShieldCheck className="h-4 w-4" />}
                      {action.actionType === "review_suspicious" && <ShieldAlert className="h-4 w-4" />}
                      {action.actionType === "review_false_positive" && <ShieldX className="h-4 w-4" />}
                      {action.actionType === "review" && <History className="h-4 w-4" />}
                    </div>

                    {/* Description and Metadata */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[13px] text-white truncate max-w-sm">
                          {log.transaction_description || "Transaction"}
                        </span>

                        {log.transaction_amount !== null && log.transaction_amount !== undefined && (
                          <span className="font-mono text-xs font-semibold text-emerald-400">
                            {formatCurrency(log.transaction_amount)}
                          </span>
                        )}

                        {log.transaction_category && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)] border border-white/[0.05]">
                            <Tag className="h-2.5 w-2.5 opacity-60" />
                            {cleanCategoryName(log.transaction_category)}
                          </span>
                        )}
                      </div>

                      {/* Action Title / Intent */}
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        Action: <span className="font-medium text-gray-300">{action.title}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Timestamp */}
                  <div className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <Clock className="h-3.5 w-3.5 opacity-60" />
                    <span>{formatDateTime(log.created_at)}</span>
                  </div>
                </div>

                {/* Bottom Row: State Transition Pill & Reviewer Notes */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-white/[0.04]">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Clear Status Transition */}
                    {action.actionType === "exclude" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 border border-amber-500/20">
                        <EyeOff className="h-3 w-3" />
                        Active in Dataset
                        <ArrowRight className="h-3 w-3 text-amber-500/70" />
                        Excluded from ML Model
                      </span>
                    ) : action.actionType === "restore" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 border border-emerald-500/20">
                        <RotateCcw className="h-3 w-3" />
                        Excluded
                        <ArrowRight className="h-3 w-3 text-emerald-500/70" />
                        Restored to Active Dataset
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-gray-300 border border-white/[0.06]">
                        <span>{action.fromLabel}</span>
                        <ArrowRight className="h-3 w-3 text-[var(--muted-foreground)]" />
                        <span className="font-semibold text-white">{action.toLabel}</span>
                      </span>
                    )}

                    {/* Note if present */}
                    {log.note && (
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.03] px-2.5 py-1 text-xs italic text-[var(--muted-foreground)] border border-white/[0.05]">
                        <MessageSquare className="h-3 w-3 text-indigo-400 not-italic shrink-0" />
                        <span>"{log.note}"</span>
                      </div>
                    )}
                  </div>

                  {/* Transaction ID Pill */}
                  <span className="text-[11px] font-mono text-[var(--muted-foreground)] opacity-60">
                    ID: {log.transaction_id.slice(0, 8)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
