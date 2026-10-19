"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowUpDown,
  Search,
  Filter,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from "lucide-react";
import {
  cn,
  formatCurrency,
  formatDate,
  formatNumber,
  getAnomalyScoreColor,
  getReviewStatusLabel,
  getReviewStatusColor,
} from "@/lib/utils";
import type { Transaction } from "@/types";
import { ReviewStatus } from "@/types";

function getPaginationItems(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

interface TransactionTableProps {
  showExcluded?: boolean;
}

export default function TransactionTable({ showExcluded = false }: TransactionTableProps) {
  const { transactions, currentDatasetId, updateTransaction, refreshTransactions } = useApp();
  const { profile, isGuest } = useAuth();
  const isViewer = profile?.role === "viewer";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [anomalyFilter, setAnomalyFilter] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [jumpPageInput, setJumpPageInput] = useState("");
  const [detailTxn, setDetailTxn] = useState<Transaction | null>(null);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch paginated transactions from backend
  React.useEffect(() => {
    if (!currentDatasetId) return;

    const sortBy = sorting[0]?.id;
    const sortOrder = sorting[0]?.desc ? "desc" : "asc";

    refreshTransactions({
      page,
      page_size: pageSize,
      is_anomaly: anomalyFilter === "all" ? undefined : anomalyFilter === "anomaly",
      is_included: !showExcluded,
      review_status: reviewFilter === "all" ? undefined : reviewFilter,
      search: search.trim() ? search.trim() : undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    });
  }, [
    currentDatasetId,
    page,
    pageSize,
    search,
    anomalyFilter,
    reviewFilter,
    showExcluded,
    sorting,
    refreshTransactions,
  ]);

  const total = transactions?.total ?? 0;
  const totalPages = Math.max(1, transactions?.total_pages ?? Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startRow = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, total);
  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const data = useMemo(() => {
    return transactions?.items || [];
  }, [transactions?.items]);

  const getReviewerTag = useCallback(() => {
    if (isGuest) return "Guest Auditor";
    return `${profile?.display_name || "Auditor"} (${profile?.role || "analyst"})`;
  }, [isGuest, profile]);

  const handleExclude = useCallback(
    async (txn: Transaction) => {
      if (isViewer) {
        alert("Viewer role is read-only. Switch to Analyst or Admin to exclude transactions.");
        return;
      }
      await updateTransaction(txn.id, {
        is_included: false,
        review_note: `Excluded by ${getReviewerTag()}`,
      });
    },
    [updateTransaction, isViewer, getReviewerTag]
  );

  const handleRestore = useCallback(
    async (txn: Transaction) => {
      if (isViewer) {
        alert("Viewer role is read-only. Switch to Analyst or Admin to restore transactions.");
        return;
      }
      await updateTransaction(txn.id, {
        is_included: true,
        review_note: `Restored by ${getReviewerTag()}`,
      });
    },
    [updateTransaction, isViewer, getReviewerTag]
  );

  const handleReview = useCallback(
    async (txn: Transaction, status: ReviewStatus) => {
      if (isViewer) {
        alert("Viewer role is read-only. Switch to Analyst or Admin to review transactions.");
        return;
      }
      await updateTransaction(txn.id, {
        review_status: status,
        review_note: `Reviewed by ${getReviewerTag()}`,
      });
    },
    [updateTransaction, isViewer, getReviewerTag]
  );

  const columns: ColumnDef<Transaction>[] = useMemo(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-xs text-[var(--muted-foreground)]">
            {formatDate(row.original.date)}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate text-sm font-medium text-[var(--foreground)]">
            {row.original.description || row.original.merchant || "—"}
          </span>
        ),
        size: 200,
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span
            className={cn(
              "font-mono text-sm font-semibold",
              row.original.amount !== null && row.original.amount < 0
                ? "text-green-400"
                : "text-[var(--foreground)]"
            )}
          >
            {row.original.amount !== null
              ? formatCurrency(row.original.amount)
              : "—"}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-xs text-[var(--muted-foreground)]">
            {row.original.category || "—"}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: "anomaly_score",
        header: "Score",
        cell: ({ row }) => {
          const score = row.original.anomaly_score;
          return (
            <span className={cn("font-mono text-xs font-semibold", getAnomalyScoreColor(score))}>
              {score !== null ? score.toFixed(3) : "—"}
            </span>
          );
        },
        size: 70,
      },
      {
        accessorKey: "primary_reason",
        header: "AI Insights",
        cell: ({ row }) => {
          const txn = row.original;
          if (txn.is_anomaly || txn.primary_reason) {
            return (
              <button
                onClick={() => setDetailTxn(txn)}
                className="group flex items-center gap-1.5 text-left rounded-md bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 border border-rose-500/20 transition-all max-w-[190px]"
                title={txn.anomaly_reasons?.join(" • ") || txn.primary_reason || "Flagged by ML model"}
              >
                <Sparkles className="h-3 w-3 text-rose-400 shrink-0" />
                <span className="truncate text-xs font-medium text-rose-300">
                  {txn.primary_reason || "Anomaly Outlier"}
                </span>
              </button>
            );
          }
          return (
            <span className="text-xs text-[var(--muted-foreground)] opacity-60">
              Typical pattern
            </span>
          );
        },
        size: 160,
      },
      {
        accessorKey: "is_anomaly",
        header: "Flag",
        cell: ({ row }) =>
          row.original.is_anomaly ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
              <AlertTriangle className="h-3 w-3" />
              Anomaly
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              Normal
            </span>
          ),
        size: 90,
      },
      {
        accessorKey: "review_status",
        header: "Review",
        cell: ({ row }) => (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              getReviewStatusColor(row.original.review_status)
            )}
          >
            {getReviewStatusLabel(row.original.review_status)}
          </span>
        ),
        size: 130,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const txn = row.original;
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDetailTxn(txn)}
                className="rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                title="View details"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              {txn.is_included ? (
                <button
                  onClick={() => handleExclude(txn)}
                  className="rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Exclude from analysis"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => handleRestore(txn)}
                  className="rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-green-500/10 hover:text-green-400"
                  title="Restore to analysis"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              {/* Review dropdown */}
              <ReviewDropdown txn={txn} onReview={handleReview} />
            </div>
          );
        },
        size: 120,
      },
    ],
    [handleExclude, handleRestore, handleReview]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
    },
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!currentDatasetId) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <p className="text-lg font-medium text-[var(--foreground)]">
          No dataset loaded
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">
            {showExcluded ? "Excluded Transactions" : "Transactions"}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {formatNumber(total)} {showExcluded ? "excluded" : ""} transactions found
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search description, merchant, or category..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
          />
        </div>
        <select
          value={anomalyFilter}
          onChange={(e) => {
            setAnomalyFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none"
        >
          <option value="all">All Flags</option>
          <option value="anomaly">Anomalies Only</option>
          <option value="normal">Normal Only</option>
        </select>
        <select
          value={reviewFilter}
          onChange={(e) => {
            setReviewFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none"
        >
          <option value="all">All Reviews</option>
          <option value="pending">Pending</option>
          <option value="reviewed_ok">Reviewed OK</option>
          <option value="reviewed_suspicious">Suspicious</option>
          <option value="reviewed_false_positive">False Positive</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[var(--border)]">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        className="flex items-center gap-1 hover:text-[var(--foreground)]"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-[var(--muted-foreground)]"
                >
                  No transactions found matching your filters.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "transition-colors hover:bg-white/[0.02]",
                    row.original.is_anomaly && "bg-red-500/[0.02]"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Numbered Pagination (1, 2, 3, 4, 5 ... n) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2 text-sm text-[var(--muted-foreground)]">
        <div className="flex items-center gap-3">
          <span>
            Showing <span className="font-semibold text-[var(--foreground)]">{formatNumber(startRow)}</span> to{" "}
            <span className="font-semibold text-[var(--foreground)]">{formatNumber(endRow)}</span> of{" "}
            <span className="font-semibold text-[var(--foreground)]">{formatNumber(total)}</span>
          </span>
          <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--border)]">
            <span className="text-xs">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--foreground)] outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* First & Prev */}
          <button
            onClick={() => setPage(1)}
            disabled={currentPage <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] transition-colors hover:bg-[var(--secondary)] disabled:opacity-30 disabled:pointer-events-none"
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] transition-colors hover:bg-[var(--secondary)] disabled:opacity-30 disabled:pointer-events-none"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Number buttons: 1, 2, 3, 4, 5 ... n */}
          {paginationItems.map((item, idx) => {
            if (item === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex h-8 w-8 items-center justify-center text-xs text-[var(--muted-foreground)] select-none"
                >
                  ...
                </span>
              );
            }
            const isCurrent = item === currentPage;
            return (
              <button
                key={item}
                onClick={() => setPage(item)}
                className={cn(
                  "flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition-all",
                  isCurrent
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-500"
                    : "border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {item}
              </button>
            );
          })}

          {/* Next & Last */}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] transition-colors hover:bg-[var(--secondary)] disabled:opacity-30 disabled:pointer-events-none"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={currentPage >= totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] transition-colors hover:bg-[var(--secondary)] disabled:opacity-30 disabled:pointer-events-none"
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>

          {/* Jump to page */}
          {totalPages > 5 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const target = parseInt(jumpPageInput, 10);
                if (!isNaN(target) && target >= 1 && target <= totalPages) {
                  setPage(target);
                  setJumpPageInput("");
                }
              }}
              className="ml-2 flex items-center gap-1.5"
            >
              <span className="text-xs text-[var(--muted-foreground)]">Go to:</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                placeholder={String(currentPage)}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                className="h-8 w-14 rounded-lg border border-[var(--border)] bg-[var(--card)] px-1.5 text-center text-xs text-[var(--foreground)] outline-none"
              />
            </form>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {detailTxn && (
        <TransactionDetailModal
          transaction={detailTxn}
          onClose={() => setDetailTxn(null)}
          onExclude={handleExclude}
          onRestore={handleRestore}
          onReview={handleReview}
        />
      )}
    </div>
  );
}

function ReviewDropdown({
  txn,
  onReview,
}: {
  txn: Transaction;
  onReview: (txn: Transaction, status: ReviewStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  const options = [
    { status: ReviewStatus.REVIEWED_OK, label: "Mark OK", icon: ShieldCheck, color: "text-green-400" },
    { status: ReviewStatus.REVIEWED_SUSPICIOUS, label: "Mark Suspicious", icon: ShieldAlert, color: "text-red-400" },
    { status: ReviewStatus.REVIEWED_FALSE_POSITIVE, label: "False Positive", icon: ShieldX, color: "text-blue-400" },
    { status: ReviewStatus.PENDING, label: "Reset to Pending", icon: Shield, color: "text-gray-400" },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
        title="Review"
      >
        <Shield className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-48 rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-xl animate-fade-in">
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.status}
                  onClick={() => {
                    onReview(txn, opt.status);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-[var(--secondary)]",
                    txn.review_status === opt.status
                      ? "bg-[var(--secondary)] font-semibold"
                      : ""
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", opt.color)} />
                  <span className="text-[var(--foreground)]">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TransactionDetailModal({
  transaction: txn,
  onClose,
  onExclude,
  onRestore,
  onReview,
}: {
  transaction: Transaction;
  onClose: () => void;
  onExclude: (txn: Transaction) => void;
  onRestore: (txn: Transaction) => void;
  onReview: (txn: Transaction, status: ReviewStatus) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl animate-fade-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-bold text-[var(--foreground)]">
          Transaction Details
        </h3>

        <div className="mt-4 space-y-3">
          <DetailRow label="Description" value={txn.description || txn.merchant || "—"} />
          <DetailRow label="Amount" value={txn.amount !== null ? formatCurrency(txn.amount) : "—"} />
          <DetailRow label="Date" value={formatDate(txn.date)} />
          <DetailRow label="Category" value={txn.category || "—"} />
          <DetailRow label="Merchant" value={txn.merchant || "—"} />
          <DetailRow label="Type" value={txn.transaction_type || "—"} />
          <DetailRow label="Account" value={txn.account || "—"} />
          <div className="border-t border-[var(--border)] pt-3">
            <DetailRow
              label="Anomaly Score"
              value={
                <span className={cn("font-mono font-semibold", getAnomalyScoreColor(txn.anomaly_score))}>
                  {txn.anomaly_score !== null ? txn.anomaly_score.toFixed(4) : "Not analyzed"}
                </span>
              }
            />
            <DetailRow
              label="Anomaly Flag"
              value={
                txn.is_anomaly ? (
                  <span className="text-red-400 font-semibold">⚠ Potential Anomaly</span>
                ) : (
                  <span className="text-green-400">Normal</span>
                )
              }
            />
            <DetailRow
              label="Review Status"
              value={
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getReviewStatusColor(txn.review_status))}>
                  {getReviewStatusLabel(txn.review_status)}
                </span>
              }
            />
            <DetailRow
              label="Included"
              value={txn.is_included ? "Yes" : "Excluded"}
            />
          </div>

          {/* Explainable AI (XAI) Risk Factors */}
          {txn.anomaly_reasons && txn.anomaly_reasons.length > 0 && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 mt-3 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-rose-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Explainable AI (XAI) Risk Factors
                </h4>
              </div>
              <ul className="space-y-1.5 text-xs text-rose-200/90 pl-1">
                {txn.anomaly_reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
          {txn.is_included ? (
            <button
              onClick={() => { onExclude(txn); onClose(); }}
              className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
            >
              <EyeOff className="mr-1.5 inline h-3.5 w-3.5" />
              Exclude
            </button>
          ) : (
            <button
              onClick={() => { onRestore(txn); onClose(); }}
              className="rounded-lg bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20"
            >
              <RotateCcw className="mr-1.5 inline h-3.5 w-3.5" />
              Restore
            </button>
          )}
          <button
            onClick={() => { onReview(txn, ReviewStatus.REVIEWED_OK); onClose(); }}
            className="rounded-lg bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20"
          >
            <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" />
            Mark OK
          </button>
          <button
            onClick={() => { onReview(txn, ReviewStatus.REVIEWED_SUSPICIOUS); onClose(); }}
            className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
          >
            <ShieldAlert className="mr-1.5 inline h-3.5 w-3.5" />
            Mark Suspicious
          </button>
          <button
            onClick={() => { onReview(txn, ReviewStatus.REVIEWED_FALSE_POSITIVE); onClose(); }}
            className="rounded-lg bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
          >
            <ShieldX className="mr-1.5 inline h-3.5 w-3.5" />
            False Positive
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-xs font-medium text-[var(--muted-foreground)]">
        {label}
      </span>
      <span className="text-right text-sm text-[var(--foreground)]">{value}</span>
    </div>
  );
}
