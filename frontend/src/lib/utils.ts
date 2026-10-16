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
