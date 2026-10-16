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
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import {
  cn,
  formatCurrency,
  formatDate,
  getAnomalyScoreColor,
  getReviewStatusLabel,
  getReviewStatusColor,
} from "@/lib/utils";
import type { Transaction } from "@/types";
import { ReviewStatus } from "@/types";

interface TransactionTableProps {
  showExcluded?: boolean;
}

export default function TransactionTable({ showExcluded = false }: TransactionTableProps) {
  const { transactions, currentDatasetId, updateTransaction, refreshTransactions } = useApp();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [anomalyFilter, setAnomalyFilter] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [detailTxn, setDetailTxn] = useState<Transaction | null>(null);

  const data = useMemo(() => {
    if (!transactions?.items) return [];
    let filtered = transactions.items;
    if (showExcluded) {
      filtered = filtered.filter((t) => !t.is_included);
    } else {
      filtered = filtered.filter((t) => t.is_included);
    }
    if (anomalyFilter === "anomaly") {
      filtered = filtered.filter((t) => t.is_anomaly);
    } else if (anomalyFilter === "normal") {
      filtered = filtered.filter((t) => !t.is_anomaly);
    }
    if (reviewFilter !== "all") {
      filtered = filtered.filter((t) => t.review_status === reviewFilter);
    }
    return filtered;
  }, [transactions, showExcluded, anomalyFilter, reviewFilter]);

  const handleExclude = useCallback(
    async (txn: Transaction) => {
      await updateTransaction(txn.id, { is_included: false });
    },
    [updateTransaction]
  );

  const handleRestore = useCallback(
    async (txn: Transaction) => {
      await updateTransaction(txn.id, { is_included: true });
    },
    [updateTransaction]
  );

  const handleReview = useCallback(
    async (txn: Transaction, status: ReviewStatus) => {
      await updateTransaction(txn.id, { review_status: status });
    },
    [updateTransaction]
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
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
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
            {data.length} {showExcluded ? "excluded" : ""} transactions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
          />
        </div>
        <select
          value={anomalyFilter}
          onChange={(e) => setAnomalyFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none"
        >
          <option value="all">All Flags</option>
          <option value="anomaly">Anomalies Only</option>
          <option value="normal">Normal Only</option>
        </select>
        <select
          value={reviewFilter}
          onChange={(e) => setReviewFilter(e.target.value)}
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

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[var(--muted-foreground)]">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount() || 1} ({data.length} rows)
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-lg border border-[var(--border)] p-2 transition-colors hover:bg-[var(--secondary)] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-lg border border-[var(--border)] p-2 transition-colors hover:bg-[var(--secondary)] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
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
