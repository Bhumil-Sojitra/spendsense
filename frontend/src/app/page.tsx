"use client";

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { AppProvider, useApp } from "@/context/AppContext";
import Sidebar from "@/components/Sidebar";
import UserHeader from "@/components/UserHeader";
import AuthModal from "@/components/AuthModal";
import Dashboard from "@/components/Dashboard";
import UploadSection from "@/components/UploadSection";
import AnalysisSection from "@/components/AnalysisSection";
import TransactionTable from "@/components/TransactionTable";
import ReviewHistory from "@/components/ReviewHistory";
import ExportsSection from "@/components/ExportsSection";
import { AlertCircle } from "lucide-react";

function AppContent() {
  const { activeTab, error } = useApp();

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "upload":
        return <UploadSection />;
      case "analysis":
        return <AnalysisSection />;
      case "transactions":
        return <TransactionTable />;
      case "excluded":
        return <TransactionTable showExcluded />;
      case "reviews":
        return <ReviewHistory />;
      case "exports":
        return <ExportsSection />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 lg:ml-64 transition-all">
        {/* Top Header with Role & Workspace context */}
        <UserHeader />

        {/* Global error banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 animate-fade-in">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {renderContent()}

        {/* Auth Modal (Sign In / Register / Role switch) */}
        <AuthModal />
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
