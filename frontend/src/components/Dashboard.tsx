"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  BarChart3,
  ShieldAlert,
  FileText,
  Layers,
} from "lucide-react";
import { cn, formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "indigo",
  delay = 0,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  color?: string;
  delay?: number;
}) {
  const colorMap: Record<string, string> = {
    indigo: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/20",
    green: "from-green-500/20 to-green-600/5 border-green-500/20",
    red: "from-red-500/20 to-red-600/5 border-red-500/20",
    amber: "from-amber-500/20 to-amber-600/5 border-amber-500/20",
    purple: "from-purple-500/20 to-purple-600/5 border-purple-500/20",
    cyan: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20",
  };

  const iconColorMap: Record<string, string> = {
    indigo: "text-indigo-400",
    green: "text-green-400",
    red: "text-red-400",
    amber: "text-amber-400",
    purple: "text-purple-400",
    cyan: "text-cyan-400",
  };

  return (
    <div
      className={cn(
        "animate-fade-in rounded-xl border bg-gradient-to-br p-5 transition-all duration-300 hover:scale-[1.02]",
        colorMap[color]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn("rounded-lg bg-black/20 p-2.5", iconColorMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend === "up" ? (
            <TrendingUp className="h-3 w-3 text-green-400" />
          ) : trend === "down" ? (
            <TrendingDown className="h-3 w-3 text-red-400" />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-fade-in rounded-xl border border-[var(--border)] bg-[var(--card)] p-5",
        className
      )}
    >
      <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl">
      <p className="text-xs font-medium text-[var(--muted-foreground)]">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' && entry.name.toLowerCase().includes('amount')
            ? formatCurrency(entry.value)
            : formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { dashboardData, dataset, analysisResult, currentDatasetId } = useApp();

  if (!currentDatasetId || !dataset) {
    return <EmptyDashboard />;
  }

  if (!dashboardData) {
    return <DashboardSkeleton />;
  }

  const { metrics, amount_distribution, category_breakdown, time_series, recent_anomalies } =
    dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {dataset.name} — {formatNumber(metrics.total_transactions)} transactions
          </p>
        </div>
        {analysisResult && (
          <div className="flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Analysis Complete — {analysisResult.method.replace(/_/g, " ")}
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Total"
          value={formatNumber(metrics.total_transactions)}
          icon={FileText}
          color="indigo"
          delay={0}
        />
        <MetricCard
          title="Included"
          value={formatNumber(metrics.included_transactions)}
          subtitle={`${formatNumber(metrics.excluded_transactions)} excluded`}
          icon={Layers}
          color="green"
          delay={50}
        />
        <MetricCard
          title="Flagged"
          value={formatNumber(metrics.flagged_anomalies)}
          subtitle={`${formatPercentage(metrics.anomaly_percentage)} of total`}
          icon={ShieldAlert}
          color="red"
          delay={100}
        />
        <MetricCard
          title="Reviewed"
          value={formatNumber(metrics.reviewed_count)}
          subtitle={`${formatNumber(metrics.pending_review_count)} pending`}
          icon={CheckCircle2}
          color="purple"
          delay={150}
        />
        <MetricCard
          title="Pending"
          value={formatNumber(metrics.pending_review_count)}
          icon={Clock}
          color="amber"
          delay={200}
        />
        <MetricCard
          title="Total Amount"
          value={formatCurrency(metrics.total_amount)}
          subtitle={`Avg: ${formatCurrency(metrics.average_amount)}`}
          icon={DollarSign}
          color="cyan"
          delay={250}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Amount Distribution */}
        {amount_distribution.length > 0 && (
          <ChartCard title="Amount Distribution">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={amount_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis
                    dataKey="range_label"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Normal" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="anomaly_count" name="Anomalies" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {/* Category Breakdown */}
        {category_breakdown.length > 0 && (
          <ChartCard title="Anomalies by Category">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={category_breakdown.filter(c => c.anomalies > 0)}
                    dataKey="anomalies"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={((entry: Record<string, unknown>) =>
                      `${entry.name || entry.category || ""}: ${entry.value || entry.anomalies || 0}`) as any}
                    labelLine={{ stroke: "#94a3b8" }}
                  >
                    {category_breakdown
                      .filter(c => c.anomalies > 0)
                      .map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Time Series */}
      {time_series.length > 0 && (
        <ChartCard title="Transaction Trends Over Time">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={time_series}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAnomaly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Transactions"
                  stroke="#6366f1"
                  fill="url(#colorCount)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="anomaly_count"
                  name="Anomalies"
                  stroke="#ef4444"
                  fill="url(#colorAnomaly)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* Recent Anomalies */}
      {recent_anomalies.length > 0 && (
        <ChartCard title="Top Flagged Transactions (by anomaly score)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Score</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recent_anomalies.map((txn) => (
                  <tr key={txn.id} className="group transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-medium">
                      {txn.description || txn.merchant || "—"}
                    </td>
                    <td className="py-3 pr-4 font-mono">
                      {txn.amount !== null ? formatCurrency(txn.amount) : "—"}
                    </td>
                    <td className="py-3 pr-4 text-[var(--muted-foreground)]">
                      {txn.category || "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        "font-mono font-semibold",
                        txn.anomaly_score !== null && txn.anomaly_score >= 0.8 ? "text-red-400" :
                        txn.anomaly_score !== null && txn.anomaly_score >= 0.6 ? "text-orange-400" :
                        "text-yellow-400"
                      )}>
                        {txn.anomaly_score !== null ? txn.anomaly_score.toFixed(3) : "—"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Flagged
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </div>
  );
}

function EmptyDashboard() {
  const { loadDemoData, loading, backendConnected, setActiveTab } = useApp();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 pulse-glow">
        <BarChart3 className="h-10 w-10 text-indigo-400" />
      </div>
      <h2 className="text-2xl font-bold text-[var(--foreground)]">
        Welcome to SpendSense AI
      </h2>
      <p className="mt-2 max-w-md text-sm text-[var(--muted-foreground)]">
        Upload a CSV dataset or load demo data to start detecting anomalies in
        financial transactions using machine learning.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          onClick={() => setActiveTab("upload")}
          className="rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
        >
          Upload CSV
        </button>
        <button
          onClick={loadDemoData}
          disabled={loading || !backendConnected}
          className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading...
            </span>
          ) : (
            "Load Demo Data"
          )}
        </button>
      </div>
      {!backendConnected && (
        <p className="mt-4 text-xs text-red-400">
          Backend is not connected. Start the FastAPI server first.
        </p>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 skeleton" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 skeleton" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-72 skeleton" />
        <div className="h-72 skeleton" />
      </div>
    </div>
  );
}
