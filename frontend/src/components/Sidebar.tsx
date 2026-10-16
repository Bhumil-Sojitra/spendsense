"use client";

import React from "react";
import {
  LayoutDashboard,
  Upload,
  FlaskConical,
  Table2,
  History,
  Download,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "upload", label: "Upload Data", icon: Upload },
  { id: "analysis", label: "Run Analysis", icon: FlaskConical },
  { id: "transactions", label: "Transactions", icon: Table2 },
  { id: "excluded", label: "Excluded", icon: AlertTriangle },
  { id: "reviews", label: "Review History", icon: History },
  { id: "exports", label: "Exports", icon: Download },
];

export default function Sidebar() {
  const { activeTab, setActiveTab, backendConnected, demoMode, dataset } =
    useApp();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold gradient-text">SpendSense AI</h1>
          <p className="text-[10px] font-medium text-[var(--muted-foreground)]">
            Anomaly Detection
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isDisabled =
            !dataset &&
            !["dashboard", "upload"].includes(item.id);

          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && setActiveTab(item.id)}
              disabled={isDisabled}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-indigo-500/10 text-indigo-400"
                  : isDisabled
                  ? "cursor-not-allowed text-[var(--muted-foreground)] opacity-40"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5 shrink-0 transition-colors",
                  isActive ? "text-indigo-400" : ""
                )}
              />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Status footer */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2 text-xs">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              backendConnected ? "bg-green-500" : "bg-red-500"
            )}
          />
          <span className="text-[var(--muted-foreground)]">
            {backendConnected ? "Backend Connected" : "Backend Offline"}
          </span>
        </div>
        {demoMode && backendConnected && (
          <p className="mt-1 text-[10px] text-amber-500/80">
            Demo Mode — data is in-memory
          </p>
        )}
        {dataset && (
          <p className="mt-1 truncate text-[10px] text-[var(--muted-foreground)]">
            Dataset: {dataset.name}
          </p>
        )}
      </div>
    </aside>
  );
}
