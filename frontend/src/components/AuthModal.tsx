"use client";

import React, { useState } from "react";
import { useAuth, UserRole } from "@/context/AuthContext";
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Building,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    signIn,
    signUp,
    continueAsGuest,
    quickDemoLogin,
  } = useAuth();

  const [tab, setTab] = useState<"signin" | "signup">(authModalTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState<UserRole>("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync internal tab if opened with specific tab
  React.useEffect(() => {
    setTab(authModalTab);
    setError(null);
    setSuccessMsg(null);
  }, [authModalTab, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);
    const res = await signIn(email.trim(), password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to sign in. Please verify your credentials.");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !fullName.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);
    const res = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      role,
      organization: organization.trim() || "Independent Workspace",
    });
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to create account.");
    } else {
      setSuccessMsg("Account created! Check your email for confirmation if required, or sign in.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[#0f172a] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Top Gradient Banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-3 text-indigo-400">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              SpendSense Workspace
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Sign in to save datasets, audit histories, and team review actions.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-slate-900/80 p-1 border border-slate-800 mb-5">
            <button
              type="button"
              onClick={() => { setTab("signin"); setError(null); }}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
                tab === "signin"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab("signup"); setError(null); }}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
                tab === "signup"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Create Team Account
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Forms */}
          {tab === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="auditor@company.com"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2 pl-9 pr-9 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{loading ? "Authenticating..." : "Sign In to Workspace"}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Bhumil Sojitra"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Company / Team
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Acme Financial"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Your Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="admin">Admin / Lead</option>
                    <option value="analyst">Risk Analyst</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="bhumil@company.com"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password (min 6 chars)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{loading ? "Creating Account..." : "Create Team Workspace"}</span>
              </button>
            </form>
          )}

          {/* Quick Demo Access (1-Click Viva Shortcuts) */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-400" />
                Quick 1-Click Role Login (Viva / Demo)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => quickDemoLogin("admin", "Bhumil Sojitra (Admin)")}
                className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 p-2 text-center transition-all group"
              >
                <p className="text-[11px] font-bold text-indigo-300">Admin</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Full Control</p>
              </button>

              <button
                type="button"
                onClick={() => quickDemoLogin("analyst", "Risk Analyst (Reviewer)")}
                className="rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 p-2 text-center transition-all group"
              >
                <p className="text-[11px] font-bold text-purple-300">Analyst</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Review & Flag</p>
              </button>

              <button
                type="button"
                onClick={() => quickDemoLogin("viewer", "Auditor (Viewer)")}
                className="rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 p-2 text-center transition-all group"
              >
                <p className="text-[11px] font-bold text-slate-300">Viewer</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Read-Only</p>
              </button>
            </div>
          </div>

          {/* Guest Demo option */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={continueAsGuest}
              className="text-xs text-slate-400 hover:text-white transition-colors underline decoration-slate-600 underline-offset-4"
            >
              Continue in Guest Demo Mode (No Login Required) →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
