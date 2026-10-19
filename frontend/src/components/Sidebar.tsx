"use client";

import {
  LayoutDashboard,
  Upload,
  FlaskConical,
  Table2,
  History,
  Download,
  Activity,
  AlertTriangle,
  Loader2,
  LogOut,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
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
  const {
    activeTab,
    setActiveTab,
    backendConnected,
    demoMode,
    dataset,
    loading,
    isUploading,
    isValidating,
    uploadProgress,
  } = useApp();

  const { isGuest, profile, openAuthModal, signOut } = useAuth();

  const isLocked = loading || isUploading || isValidating;

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
        {/* Upload / Processing In-Flight Banner */}
        {isLocked && (
          <div className="mb-3 mx-1 flex items-center gap-2 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-300">
            <Loader2 className="h-4 w-4 animate-spin shrink-0 text-indigo-400" />
            <span className="truncate">
              {isUploading
                ? `Uploading (${uploadProgress}%)...`
                : isValidating
                ? "Validating CSV..."
                : "Loading dataset..."}
            </span>
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isDisabled =
            isLocked || (!dataset && !["dashboard", "upload"].includes(item.id));

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
                  ? "cursor-not-allowed text-[var(--muted-foreground)] opacity-35"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
              )}
              title={isLocked ? "Upload in progress, please wait..." : undefined}
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

      {/* User / Team Profile Card */}
      <div className="border-t border-[var(--border)] px-3 py-2.5 bg-slate-950/40">
        {isGuest ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-indigo-300 truncate">Guest Mode</p>
              <p className="text-[9px] text-[var(--muted-foreground)] truncate">All tools unlocked</p>
            </div>
            <button
              onClick={() => openAuthModal("signin")}
              className="rounded-md bg-indigo-600/80 hover:bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white transition-colors shrink-0"
            >
              Sign In
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-bold text-white shrink-0">
              {profile?.display_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-white truncate">
                {profile?.display_name || "Team Member"}
              </p>
              <span className="inline-block text-[9px] font-semibold text-indigo-400 uppercase tracking-wider">
                {profile?.role || "analyst"}
              </span>
            </div>
            <button
              onClick={signOut}
              className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
              title="Sign Out to Guest Mode"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Status footer */}
      <div className="border-t border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              backendConnected ? "bg-green-500" : "bg-red-500"
            )}
          />
          <span className="text-[var(--muted-foreground)]">
            {backendConnected ? "FastAPI Engine Online" : "Backend Offline"}
          </span>
        </div>
        {demoMode && backendConnected && (
          <p className="mt-0.5 text-[10px] text-amber-500/80">
            High-speed in-memory engine active
          </p>
        )}
        {dataset && (
          <p className="mt-0.5 truncate text-[10px] text-[var(--muted-foreground)]">
            Dataset: {dataset.name}
          </p>
        )}
      </div>
    </aside>
  );
}
