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
  Sparkles,
} from "lucide-react";
import {
  cn,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatCompactNumber,
  cleanCategoryName,
} from "@/lib/utils";
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

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-[#111827] p-3 shadow-2xl text-xs z-50">
      {label && (
        <p className="mb-2 border-b border-slate-700/60 pb-1 text-xs font-semibold text-white">
          {label}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-mono font-bold" style={{ color: entry.color }}>
              {typeof entry.value === "number" && entry.name.toLowerCase().includes("amount")
                ? formatCurrency(entry.value)
                : formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatRangeLabel(label: string): string {
  if (!label) return "";
  return label.replace(/\$([0-9,]+)/g, (_, match) => {
    const num = parseFloat(match.replace(/,/g, ""));
    if (isNaN(num)) return `$${match}`;
    return `$${formatCompactNumber(num)}`;
  });
}

export default function Dashboard() {
  const { dashboardData, dataset, analysisResult, currentDatasetId } = useApp();
  const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(null);

  // Category breakdown: Group top 6 categories and combine others into "Other Categories"
  const { topCategoriesData, totalCategoryAnomalies } = React.useMemo(() => {
    if (!dashboardData?.category_breakdown) {
      return { topCategoriesData: [], totalCategoryAnomalies: 0 };
    }
    const filtered = dashboardData.category_breakdown
      .filter((c) => c.anomalies > 0)
      .sort((a, b) => b.anomalies - a.anomalies);
    const total = filtered.reduce((sum, c) => sum + c.anomalies, 0);

    if (filtered.length <= 6) {
      return { topCategoriesData: filtered, totalCategoryAnomalies: total };
    }

    const top5 = filtered.slice(0, 5);
    const others = filtered.slice(5);
    const otherAnomalies = others.reduce((sum, c) => sum + c.anomalies, 0);
    const otherTotal = others.reduce((sum, c) => sum + c.total, 0);

    return {
      topCategoriesData: [
        ...top5,
        {
          category: "Other Categories",
          total: otherTotal,
          anomalies: otherAnomalies,
          anomaly_rate: otherTotal > 0 ? (otherAnomalies / otherTotal) * 100 : 0,
        },
      ],
      totalCategoryAnomalies: total,
    };
  }, [dashboardData?.category_breakdown]);

  // Time series: If > 60 daily points, aggregate into weekly intervals for smooth, clear trends
  const formattedTimeSeries = React.useMemo(() => {
    const raw = dashboardData?.time_series || [];
    if (raw.length === 0) return [];

    if (raw.length > 60) {
      const weekly: Array<{ date: string; displayDate: string; count: number; anomaly_count: number }> = [];
      const windowSize = 7;
      for (let i = 0; i < raw.length; i += windowSize) {
        const slice = raw.slice(i, i + windowSize);
        const count = slice.reduce((sum, item) => sum + (item.count || 0), 0);
        const anomaly_count = slice.reduce((sum, item) => sum + (item.anomaly_count || 0), 0);
        const startDate = slice[0].date;
        let displayDate = startDate;
        try {
          const d = new Date(startDate);
          if (!isNaN(d.getTime())) {
            displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }
        } catch {}
        weekly.push({ date: startDate, displayDate, count, anomaly_count });
      }
      return weekly;
    }

    return raw.map((item) => {
      let displayDate = item.date;
      try {
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) {
          displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
      } catch {}
      return { ...item, displayDate };
    });
  }, [dashboardData?.time_series]);

  if (!currentDatasetId || !dataset) {
    return <EmptyDashboard />;
  }

  if (!dashboardData) {
    return <DashboardSkeleton />;
  }

  const { metrics, amount_distribution, recent_anomalies } = dashboardData;

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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Amount Distribution */}
        {amount_distribution.length > 0 && (
          <ChartCard title="Amount Distribution">
            <div className="mb-3 flex items-center justify-end gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#6366f1]" />
                Normal
              </span>
              <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#ef4444]" />
                Anomalies
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={amount_distribution} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                  <XAxis
                    dataKey="range_label"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    tickFormatter={formatRangeLabel}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={40}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(v) => formatCompactNumber(v)}
                    width={45}
                  />
                  <Tooltip wrapperStyle={{ zIndex: 100, pointerEvents: "none" }} content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Normal" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="anomaly_count" name="Anomalies" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {/* Category Breakdown (Clean Donut + Side Legend) */}
        {topCategoriesData.length > 0 && (
          <ChartCard title="Anomalies by Category">
            <div className="flex flex-col sm:flex-row items-center gap-6 h-64">
              <div className="relative h-56 w-56 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topCategoriesData}
                      dataKey="anomalies"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={88}
                      paddingAngle={3}
                      cornerRadius={4}
                      stroke="#111827"
                      strokeWidth={2}
                    >
                      {topCategoriesData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                          onMouseEnter={() => setHoveredCategory(entry.category)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{ zIndex: 100, pointerEvents: "none" }}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const data = payload[0].payload;
                        const pct = totalCategoryAnomalies > 0 ? (data.anomalies / totalCategoryAnomalies) * 100 : 0;
                        return (
                          <div className="rounded-xl border border-slate-700 bg-[#111827] p-2.5 shadow-2xl text-xs z-50">
                            <p className="font-semibold text-white">{cleanCategoryName(data.category)}</p>
                            <p className="mt-1 text-slate-300">
                              Flagged: <span className="font-mono font-bold text-red-400">{formatNumber(data.anomalies)}</span> ({pct.toFixed(1)}%)
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-200",
                    hoveredCategory ? "opacity-0" : "opacity-100"
                  )}
                >
                  <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                    {formatCompactNumber(totalCategoryAnomalies)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                    Anomalies
                  </span>
                </div>
              </div>

              {/* Clean Legend list */}
              <div className="flex-1 w-full space-y-1.5 overflow-y-auto max-h-56 pr-2">
                {topCategoriesData.map((cat, idx) => {
                  const pct = totalCategoryAnomalies > 0 ? (cat.anomalies / totalCategoryAnomalies) * 100 : 0;
                  const color = CHART_COLORS[idx % CHART_COLORS.length];
                  return (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-[var(--secondary)]/40 hover:bg-[var(--secondary)] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        <span className="truncate font-medium text-[var(--foreground)]">
                          {cleanCategoryName(cat.category)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 text-right">
                        <span className="font-mono text-[var(--muted-foreground)]">
                          {formatCompactNumber(cat.anomalies)}
                        </span>
                        <span className="w-12 font-mono font-semibold text-[var(--foreground)] text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Time Series (Smoothed & Clear) */}
      {formattedTimeSeries.length > 0 && (
        <ChartCard title="Transaction Trends Over Time">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[var(--muted-foreground)]">
              {dashboardData.time_series.length > 60
                ? "Weekly aggregated volume & anomaly trends"
                : "Daily volume & anomaly trends"}
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#6366f1]" />
                Volume
              </span>
              <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                Flagged Anomalies
              </span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTimeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorAnomaly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  minTickGap={45}
                  axisLine={{ stroke: "rgba(148,163,184,0.15)" }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(v) => formatCompactNumber(v)}
                  width={50}
                  axisLine={{ stroke: "rgba(148,163,184,0.15)" }}
                />
                <Tooltip wrapperStyle={{ zIndex: 100, pointerEvents: "none" }} content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Transactions"
                  stroke="#6366f1"
                  fill="url(#colorCount)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: "#6366f1", strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="anomaly_count"
                  name="Anomalies"
                  stroke="#ef4444"
                  fill="url(#colorAnomaly)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: "#ef4444", strokeWidth: 2 }}
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
                  <th className="pb-3 pr-4">AI Risk Factor</th>
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
                    <td className="py-3 pr-4">
                      {txn.primary_reason ? (
                        <span
                          className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-300 border border-rose-500/20 max-w-[190px] truncate"
                          title={txn.anomaly_reasons?.join(" • ") || txn.primary_reason}
                        >
                          <Sparkles className="h-3 w-3 text-rose-400 shrink-0" />
                          <span className="truncate">{txn.primary_reason}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">Statistical Outlier</span>
                      )}
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
