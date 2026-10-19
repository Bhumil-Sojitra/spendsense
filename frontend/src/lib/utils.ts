import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactNumber(num: number): string {
  if (Math.abs(num) >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (Math.abs(num) >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return num.toLocaleString();
}

export function cleanCategoryName(name: string): string {
  if (!name) return "Unknown";
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function getAnomalyScoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 0.8) return "text-red-500";
  if (score >= 0.6) return "text-orange-500";
  if (score >= 0.4) return "text-yellow-500";
  return "text-green-500";
}

export function getReviewStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "Pending Review";
    case "reviewed_ok": return "Reviewed — OK";
    case "reviewed_suspicious": return "Reviewed — Suspicious";
    case "reviewed_false_positive": return "Reviewed — False Positive";
    default: return status;
  }
}

export function getReviewStatusColor(status: string): string {
  switch (status) {
    case "pending": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case "reviewed_ok": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "reviewed_suspicious": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "reviewed_false_positive": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    default: return "bg-gray-100 text-gray-700";
  }
}

export interface ReviewActionDetails {
  title: string;
  actionType: "exclude" | "restore" | "review_ok" | "review_suspicious" | "review_false_positive" | "review";
  badgeLabel: string;
  badgeClass: string;
  transitionText: string;
  fromLabel: string;
  toLabel: string;
}

export function formatReviewAction(log: {
  action: string;
  previous_status?: string | null;
  new_status?: string | null;
  previous_included?: boolean | null;
  new_included?: boolean | null;
}): ReviewActionDetails {
  const isExclude = log.action.includes("excluded") || log.new_included === false;
  const isRestore = log.action.includes("included") || log.new_included === true;
  const hasStatusChange =
    (log.previous_status && log.new_status && log.previous_status !== log.new_status) ||
    log.action.includes("reviewed as");

  const prevStatus = log.previous_status || "pending";
  const newStatus = log.new_status || "pending";
  const fromLabel = getReviewStatusLabel(prevStatus);
  const toLabel = getReviewStatusLabel(newStatus);

  if (isExclude) {
    let transition = "Active in Dataset → Excluded from Analysis";
    if (hasStatusChange) {
      transition = `${fromLabel} → ${toLabel} • Excluded`;
    }
    return {
      title: "Excluded from Analysis",
      actionType: "exclude",
      badgeLabel: "Excluded",
      badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
      transitionText: transition,
      fromLabel: "Active",
      toLabel: "Excluded",
    };
  }

  if (isRestore) {
    let transition = "Excluded → Restored to Active Dataset";
    if (hasStatusChange) {
      transition = `${fromLabel} → ${toLabel} • Restored`;
    }
    return {
      title: "Restored to Analysis",
      actionType: "restore",
      badgeLabel: "Restored",
      badgeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
      transitionText: transition,
      fromLabel: "Excluded",
      toLabel: "Active",
    };
  }

  // Review Status Changes
  if (newStatus === "reviewed_ok" || log.action.includes("reviewed_ok")) {
    return {
      title: "Reviewed — Marked as OK",
      actionType: "review_ok",
      badgeLabel: "Marked OK",
      badgeClass: "bg-green-500/15 text-green-400 border border-green-500/30",
      transitionText: `${fromLabel} → Reviewed — OK`,
      fromLabel,
      toLabel: "Reviewed — OK",
    };
  }

  if (newStatus === "reviewed_suspicious" || log.action.includes("reviewed_suspicious")) {
    return {
      title: "Reviewed — Flagged as Suspicious",
      actionType: "review_suspicious",
      badgeLabel: "Suspicious",
      badgeClass: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
      transitionText: `${fromLabel} → Reviewed — Suspicious`,
      fromLabel,
      toLabel: "Reviewed — Suspicious",
    };
  }

  if (newStatus === "reviewed_false_positive" || log.action.includes("reviewed_false_positive")) {
    return {
      title: "Reviewed — False Positive",
      actionType: "review_false_positive",
      badgeLabel: "False Positive",
      badgeClass: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
      transitionText: `${fromLabel} → Reviewed — False Positive`,
      fromLabel,
      toLabel: "Reviewed — False Positive",
    };
  }

  return {
    title: `Updated Status to ${toLabel}`,
    actionType: "review",
    badgeLabel: toLabel,
    badgeClass: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    transitionText: `${fromLabel} → ${toLabel}`,
    fromLabel,
    toLabel,
  };
}
