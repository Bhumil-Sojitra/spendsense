"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type {
  DatasetInfo,
  AnalysisResult,
  DashboardData,
  Transaction,
  PaginatedResponse,
  ReviewLogEntry,
} from "@/types";
import * as api from "@/lib/api";

interface AppState {
  // Connection
  backendConnected: boolean;
  demoMode: boolean;

  // Data
  currentDatasetId: string | null;
  dataset: DatasetInfo | null;
  analysisResult: AnalysisResult | null;
  dashboardData: DashboardData | null;
  transactions: PaginatedResponse<Transaction> | null;
  reviewLogs: ReviewLogEntry[];

  // UI
  loading: boolean;
  analysisRunning: boolean;
  error: string | null;
  activeTab: string;

  // Actions
  setActiveTab: (tab: string) => void;
  checkBackend: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  runAnalysis: (method: string, params?: Record<string, number>) => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshTransactions: (params?: Record<string, unknown>) => Promise<void>;
  updateTransaction: (
    txnId: string,
    update: Record<string, unknown>
  ) => Promise<void>;
  refreshReviewLogs: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [backendConnected, setBackendConnected] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [currentDatasetId, setCurrentDatasetId] = useState<string | null>(null);
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<PaginatedResponse<Transaction> | null>(null);
  const [reviewLogs, setReviewLogs] = useState<ReviewLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const checkBackend = useCallback(async () => {
    try {
      const health = await api.getHealth();
      setBackendConnected(true);
      setDemoMode(health.demo_mode);
    } catch {
      setBackendConnected(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!currentDatasetId) return;
    try {
      const data = await api.getDashboard(currentDatasetId);
      setDashboardData(data);
    } catch (e) {
      console.error("Failed to refresh dashboard:", e);
    }
  }, [currentDatasetId]);

  const refreshTransactions = useCallback(
    async (params?: Record<string, unknown>) => {
      if (!currentDatasetId) return;
      try {
        const data = await api.getTransactions(currentDatasetId, params as Record<string, string | number | boolean | undefined>);
        setTransactions(data);
      } catch (e) {
        console.error("Failed to refresh transactions:", e);
      }
    },
    [currentDatasetId]
  );

  const refreshReviewLogs = useCallback(async () => {
    if (!currentDatasetId) return;
    try {
      const data = await api.getReviewLogs(currentDatasetId);
      setReviewLogs(data.logs);
    } catch (e) {
      console.error("Failed to refresh review logs:", e);
    }
  }, [currentDatasetId]);

  const loadDemoData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.loadDemoData();
      const datasetId = res.data?.dataset_id as string;
      setCurrentDatasetId(datasetId);
      const ds = await api.getDataset(datasetId);
      setDataset(ds);
      setActiveTab("dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load demo data");
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.uploadDataset(file);
      const datasetId = res.data?.dataset_id as string;
      setCurrentDatasetId(datasetId);
      const ds = await api.getDataset(datasetId);
      setDataset(ds);
      setActiveTab("dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload file");
    } finally {
      setLoading(false);
    }
  }, []);

  const runAnalysis = useCallback(
    async (method: string, params?: Record<string, number>) => {
      if (!currentDatasetId) return;
      setAnalysisRunning(true);
      setError(null);
      try {
        const result = await api.runAnalysis({
          dataset_id: currentDatasetId,
          method: method as "isolation_forest" | "statistical_iqr" | "combined",
          ...params,
        });
        setAnalysisResult(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analysis failed");
      } finally {
        setAnalysisRunning(false);
      }
    },
    [currentDatasetId]
  );

  const updateTransaction = useCallback(
    async (txnId: string, update: Record<string, unknown>) => {
      if (!currentDatasetId) return;
      try {
        await api.updateTransaction(currentDatasetId, txnId, update);
        // Refresh both dashboard and transactions to reflect the change
        await Promise.all([refreshDashboard(), refreshTransactions(), refreshReviewLogs()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update transaction");
      }
    },
    [currentDatasetId, refreshDashboard, refreshTransactions, refreshReviewLogs]
  );

  // Auto-refresh dashboard when dataset or analysis changes
  useEffect(() => {
    if (currentDatasetId) {
      refreshDashboard();
      refreshTransactions();
      refreshReviewLogs();
    }
  }, [currentDatasetId, analysisResult, refreshDashboard, refreshTransactions, refreshReviewLogs]);

  // Check backend on mount
  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  return (
    <AppContext.Provider
      value={{
        backendConnected,
        demoMode,
        currentDatasetId,
        dataset,
        analysisResult,
        dashboardData,
        transactions,
        reviewLogs,
        loading,
        analysisRunning,
        error,
        activeTab,
        setActiveTab,
        checkBackend,
        loadDemoData,
        uploadFile,
        runAnalysis,
        refreshDashboard,
        refreshTransactions,
        updateTransaction,
        refreshReviewLogs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
