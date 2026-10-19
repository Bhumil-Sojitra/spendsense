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
  isUploading: boolean;
  isValidating: boolean;
  uploadProgress: number;
  uploadStatus: string | null;

  // Actions
  setIsValidating: (v: boolean) => void;
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
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const checkBackend = useCallback(async () => {
    try {
      const health = await api.getHealth();
      setBackendConnected(true);
      setDemoMode(health.demo_mode);
    } catch {
      setBackendConnected(false);
    }
  }, []);

  const handleDatasetNotFound = useCallback(() => {
    setCurrentDatasetId(null);
    setDataset(null);
    setAnalysisResult(null);
    setDashboardData(null);
    setTransactions(null);
    setReviewLogs([]);
    setError("The active dataset is no longer available on the server (server reloaded). Please upload a file or load demo data.");
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!currentDatasetId) return;
    try {
      const data = await api.getDashboard(currentDatasetId);
      setDashboardData(data);
    } catch (e) {
      if (e instanceof api.ApiError && (e.status === 404 || e.message?.toLowerCase().includes("dataset not found"))) {
        handleDatasetNotFound();
        return;
      }
      console.warn("Failed to refresh dashboard:", e);
    }
  }, [currentDatasetId, handleDatasetNotFound]);

  const lastTxnParamsRef = React.useRef<Record<string, unknown>>({});

  const refreshTransactions = useCallback(
    async (params?: Record<string, unknown>) => {
      if (!currentDatasetId) return;
      if (params) {
        lastTxnParamsRef.current = params;
      }
      try {
        const queryParams = params || lastTxnParamsRef.current;
        const data = await api.getTransactions(
          currentDatasetId,
          queryParams as Record<string, string | number | boolean | undefined>
        );
        setTransactions(data);
      } catch (e) {
        if (e instanceof api.ApiError && (e.status === 404 || e.message?.toLowerCase().includes("dataset not found"))) {
          handleDatasetNotFound();
          return;
        }
        console.warn("Failed to refresh transactions:", e);
      }
    },
    [currentDatasetId, handleDatasetNotFound]
  );

  const refreshReviewLogs = useCallback(async () => {
    if (!currentDatasetId) return;
    try {
      const data = await api.getReviewLogs(currentDatasetId);
      setReviewLogs(data.logs);
    } catch (e) {
      if (e instanceof api.ApiError && (e.status === 404 || e.message?.toLowerCase().includes("dataset not found"))) {
        handleDatasetNotFound();
        return;
      }
      console.warn("Failed to refresh review logs:", e);
    }
  }, [currentDatasetId, handleDatasetNotFound]);

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
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("Starting upload...");
    setError(null);

    let processingInterval: ReturnType<typeof setInterval> | null = null;

    try {
      const res = await api.uploadDatasetWithProgress(file, (percent, loaded, total) => {
        const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
        const totalMB = (total / (1024 * 1024)).toFixed(1);

        if (percent < 100) {
          // Map file transmission to 0% - 70%
          const mappedProgress = Math.min(70, Math.round(percent * 0.7));
          setUploadProgress(mappedProgress);
          setUploadStatus(`Uploading file... ${loadedMB} MB of ${totalMB} MB (${percent}%)`);
        } else {
          // Transmission is 100% complete! Switch to server processing progression
          if (!processingInterval) {
            setUploadProgress(74);
            setUploadStatus("Upload complete. Processing & indexing transactions in memory...");

            let currentProgress = 74;
            const stages = [
              "Parsing CSV data into high-speed memory buffers...",
              "Mapping transaction columns & validating schema...",
              "Indexing transactions & computing distributions...",
              "Building in-memory search indexes...",
              "Finalizing dataset metrics and summary...",
            ];
            let stageIndex = 0;

            processingInterval = setInterval(() => {
              currentProgress = Math.min(95, currentProgress + 3);
              setUploadProgress(currentProgress);
              if (stageIndex < stages.length) {
                setUploadStatus(stages[stageIndex]);
                stageIndex++;
              }
            }, 1000);
          }
        }
      });

      if (processingInterval) {
        clearInterval(processingInterval);
        processingInterval = null;
      }

      setUploadProgress(98);
      setUploadStatus("Loading dataset into dashboard...");

      const datasetId = res.data?.dataset_id as string;
      setCurrentDatasetId(datasetId);
      const ds = await api.getDataset(datasetId);
      setDataset(ds);

      setUploadProgress(100);
      setUploadStatus(`✓ Ingestion complete! ${ds.total_rows.toLocaleString()} transactions loaded.`);

      // Brief transition delay so user sees 100% completion
      await new Promise((resolve) => setTimeout(resolve, 600));

      setActiveTab("dashboard");
    } catch (e) {
      if (processingInterval) {
        clearInterval(processingInterval);
      }
      setError(e instanceof Error ? e.message : "Failed to upload file");
    } finally {
      if (processingInterval) {
        clearInterval(processingInterval);
      }
      setLoading(false);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus(null);
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
        if (e instanceof api.ApiError && (e.status === 404 || e.message?.toLowerCase().includes("dataset not found"))) {
          handleDatasetNotFound();
          return;
        }
        setError(e instanceof Error ? e.message : "Analysis failed");
      } finally {
        setAnalysisRunning(false);
      }
    },
    [currentDatasetId, handleDatasetNotFound]
  );

  const updateTransaction = useCallback(
    async (txnId: string, update: Record<string, unknown>) => {
      if (!currentDatasetId) return;
      try {
        await api.updateTransaction(currentDatasetId, txnId, update);
        // Refresh both dashboard and transactions to reflect the change
        await Promise.all([refreshDashboard(), refreshTransactions(), refreshReviewLogs()]);
      } catch (e) {
        if (e instanceof api.ApiError && (e.status === 404 || e.message?.toLowerCase().includes("dataset not found"))) {
          handleDatasetNotFound();
          return;
        }
        setError(e instanceof Error ? e.message : "Failed to update transaction");
      }
    },
    [currentDatasetId, refreshDashboard, refreshTransactions, refreshReviewLogs, handleDatasetNotFound]
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
        isUploading,
        isValidating,
        setIsValidating,
        uploadProgress,
        uploadStatus,
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
