"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import {
  Shield,
  ShieldCheck,
  Building2,
  LogIn,
  LogOut,
  Sparkles,
  ChevronDown,
  User,
  Database,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function UserHeader() {
  const { profile, isAuthenticated, isGuest, openAuthModal, signOut, quickDemoLogin } = useAuth();
  const { dataset, analysisResult } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const roleColors = {
    admin: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
    analyst: "border-purple-500/30 bg-purple-500/10 text-purple-300",
    viewer: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };

  const roleLabels = {
    admin: "Admin / Lead Auditor",
    analyst: "Risk Analyst / Reviewer",
    viewer: "Stakeholder / Viewer",
  };

  return (
    <header className="sticky top-0 z-30 mb-6 -mt-6 -mx-6 lg:-mx-8 px-6 lg:px-8 py-3.5 border-b border-[var(--border)] bg-[#0b0f19]/90 backdrop-blur-md flex items-center justify-between gap-4">
      {/* Left: Organization & Dataset Status */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-indigo-400 shrink-0" />
          <span className="text-sm font-semibold text-white truncate">
            {profile?.organization || "Guest Demo Workspace"}
          </span>
        </div>

        <span className="text-[var(--border)] hidden sm:inline">|</span>

        {/* Dataset Pill */}
        {dataset ? (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 border border-slate-700/60 truncate">
            <Database className="h-3 w-3 text-indigo-400 shrink-0" />
            <span className="font-medium truncate">{dataset.name}</span>
            <span className="text-[10px] text-slate-500">
              ({dataset.valid_rows.toLocaleString()} rows)
            </span>
            {analysisResult && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium ml-1">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Scored
              </span>
            )}
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-900/60 px-2.5 py-1 text-xs text-slate-500 border border-slate-800">
            <span>No dataset loaded</span>
          </div>
        )}
      </div>

      {/* Right: Auth Profile / Guest Demo Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Viva Quick Role Switcher Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 transition-all"
            title="Switch roles or login"
          >
            <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="hidden md:inline text-[11px] font-medium">
              {isGuest
                ? "Guest Demo"
                : `${profile?.display_name || "User"} (${roleLabels[profile?.role || "admin"].split(" ")[0]})`}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {/* Quick Dropdown */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-700 bg-[#0f172a] p-2 shadow-2xl z-50 animate-fade-in text-xs">
                <div className="px-2 py-1.5 border-b border-slate-800 mb-1.5">
                  <p className="font-semibold text-white">Current Session</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {profile?.email || "Guest Evaluation Mode"}
                  </p>
                  <span
                    className={cn(
                      "mt-1.5 inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                      profile?.role ? roleColors[profile.role] : "border-slate-700 bg-slate-800 text-slate-300"
                    )}
                  >
                    {profile?.role ? roleLabels[profile.role] : "Guest Auditor (All Permissions)"}
                  </span>
                </div>

                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Switch Demo Role (Viva)
                </p>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      quickDemoLogin("admin", "Bhumil Sojitra (Lead Auditor)");
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-300 text-slate-300 flex items-center justify-between"
                  >
                    <span>Admin (Lead Auditor)</span>
                    <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1 rounded">Full</span>
                  </button>

                  <button
                    onClick={() => {
                      quickDemoLogin("analyst", "Dhyan Patel (Risk Analyst)");
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-purple-500/10 hover:text-purple-300 text-slate-300 flex items-center justify-between"
                  >
                    <span>Analyst (Reviewer)</span>
                    <span className="text-[9px] text-purple-400 bg-purple-500/10 px-1 rounded">Review</span>
                  </button>

                  <button
                    onClick={() => {
                      quickDemoLogin("viewer", "Auditor (Viewer)");
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-300 text-slate-300 flex items-center justify-between"
                  >
                    <span>Viewer (Stakeholder)</span>
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 rounded">Read-Only</span>
                  </button>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      openAuthModal("signin");
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center gap-2"
                  >
                    <LogIn className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Supabase Team Sign In</span>
                  </button>
                  {!isGuest && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400 flex items-center gap-2"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Return to Guest Demo</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Primary Action Button */}
        {isGuest ? (
          <button
            onClick={() => openAuthModal("signin")}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 transition-all"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In / Team</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow">
              {profile?.display_name?.charAt(0).toUpperCase() || "A"}
            </div>
            <button
              onClick={signOut}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Sign Out to Guest Mode"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
