/**
 * SpendSense API Client
 *
 * Communicates with the FastAPI backend for all data operations.
 */

import type {
  ApiResponse,
  AnalysisRequest,
  AnalysisResult,
  DashboardData,
  DatasetInfo,
  DatasetValidationResult,
  HealthResponse,
  PaginatedResponse,
  Transaction,
  TransactionUpdate,
  ReviewLogEntry,
} from "@/types";

const rawBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/+$/, "");
const API_BASE = rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail || body.message || message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }

  return res.json();
}

// ─── Health ─────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

// ─── Demo Data ──────────────────────────────────────────────────────────────

export async function loadDemoData(): Promise<ApiResponse> {
  return request<ApiResponse>("/demo/load", { method: "POST" });
}

// ─── Datasets ───────────────────────────────────────────────────────────────

export async function validateDataset(
  file: File
): Promise<DatasetValidationResult> {
  const form = new FormData();
  form.append("file", file);
  return request<DatasetValidationResult>("/datasets/validate", {
    method: "POST",
    body: form,
  });
}

export async function uploadDataset(file: File): Promise<ApiResponse> {
  const form = new FormData();
  form.append("file", file);
  return request<ApiResponse>("/datasets/upload", {
    method: "POST",
    body: form,
  });
}

export function uploadDatasetWithProgress(
  file: File,
  onProgress?: (percent: number, loaded: number, total: number) => void
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress?.(percent, event.loaded, event.total);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          resolve({ success: true, message: "Upload complete" });
        }
      } else {
        let errorMsg = `Upload failed with status ${xhr.status}`;
        try {
          const response = JSON.parse(xhr.responseText);
          errorMsg = response.detail || response.message || errorMsg;
        } catch {}
        reject(new Error(errorMsg));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network connection error during file upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("File upload was cancelled"));
    });

    xhr.open("POST", `${API_BASE}/datasets/upload`);
    xhr.send(form);
  });
}

export async function listDatasets(): Promise<{ datasets: DatasetInfo[] }> {
  return request<{ datasets: DatasetInfo[] }>("/datasets");
}

export async function getDataset(id: string): Promise<DatasetInfo> {
  return request<DatasetInfo>(`/datasets/${id}`);
}

// ─── Analysis ───────────────────────────────────────────────────────────────

export async function runAnalysis(
  req: AnalysisRequest
): Promise<AnalysisResult> {
  return request<AnalysisResult>("/analysis/run", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getAnalysisResults(
  datasetId: string
): Promise<{ results: AnalysisResult[] }> {
  return request<{ results: AnalysisResult[] }>(
    `/analysis/${datasetId}/results`
  );
}

export async function getLatestAnalysis(
  datasetId: string
): Promise<AnalysisResult> {
  return request<AnalysisResult>(`/analysis/${datasetId}/latest`);
}

// ─── Transactions ───────────────────────────────────────────────────────────

export async function getTransactions(
  datasetId: string,
  params: {
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    is_anomaly?: boolean;
    is_included?: boolean;
    review_status?: string;
    search?: string;
  } = {}
): Promise<PaginatedResponse<Transaction>> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return request<PaginatedResponse<Transaction>>(
    `/transactions/${datasetId}${qs ? `?${qs}` : ""}`
  );
}

export async function updateTransaction(
  datasetId: string,
  transactionId: string,
  update: TransactionUpdate
): Promise<{ success: boolean; transaction: Transaction }> {
  return request<{ success: boolean; transaction: Transaction }>(
    `/transactions/${datasetId}/${transactionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(update),
    }
  );
}

export async function bulkUpdateTransactions(
  datasetId: string,
  transactionIds: string[],
  update: TransactionUpdate
): Promise<{ success: boolean; updated_count: number }> {
  return request<{ success: boolean; updated_count: number }>(
    `/transactions/${datasetId}/bulk`,
    {
      method: "PATCH",
      body: JSON.stringify({ transaction_ids: transactionIds, update }),
    }
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export async function getDashboard(
  datasetId: string
): Promise<DashboardData> {
  return request<DashboardData>(`/dashboard/${datasetId}`);
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export async function getReviewLogs(
  datasetId: string,
  limit: number = 100
): Promise<{ logs: ReviewLogEntry[] }> {
  return request<{ logs: ReviewLogEntry[] }>(
    `/reviews/${datasetId}?limit=${limit}`
  );
}

// ─── Exports ────────────────────────────────────────────────────────────────

export function getExportUrl(
  datasetId: string,
  scope: "all" | "included" | "excluded" | "flagged" = "all"
): string {
  return `${API_BASE}/export/${datasetId}/transactions?scope=${scope}`;
}

export function getReviewExportUrl(datasetId: string): string {
  return `${API_BASE}/export/${datasetId}/reviews`;
}
