// ─── Enums ──────────────────────────────────────────────────────────────────

export type ReviewStatus =
  | "pending"
  | "reviewed_ok"
  | "reviewed_suspicious"
  | "reviewed_false_positive";

export const ReviewStatus = {
  PENDING: "pending" as ReviewStatus,
  REVIEWED_OK: "reviewed_ok" as ReviewStatus,
  REVIEWED_SUSPICIOUS: "reviewed_suspicious" as ReviewStatus,
  REVIEWED_FALSE_POSITIVE: "reviewed_false_positive" as ReviewStatus,
} as const;

export type DetectionMethod =
  | "isolation_forest"
  | "statistical_iqr"
  | "combined";

export const DetectionMethod = {
  ISOLATION_FOREST: "isolation_forest" as DetectionMethod,
  STATISTICAL_IQR: "statistical_iqr" as DetectionMethod,
  COMBINED: "combined" as DetectionMethod,
} as const;

export type AnalysisStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export const AnalysisStatus = {
  PENDING: "pending" as AnalysisStatus,
  RUNNING: "running" as AnalysisStatus,
  COMPLETED: "completed" as AnalysisStatus,
  FAILED: "failed" as AnalysisStatus,
} as const;

// ─── Transaction ────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  dataset_id: string;
  row_index: number;
  date: string | null;
  amount: number | null;
  description: string | null;
  category: string | null;
  merchant: string | null;
  transaction_type: string | null;
  account: string | null;
  anomaly_score: number | null;
  is_anomaly: boolean;
  primary_reason?: string | null;
  anomaly_reasons?: string[];
  review_status: ReviewStatus;
  review_note: string | null;
  reviewed_at: string | null;
  is_included: boolean;
  raw_data: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TransactionUpdate {
  is_included?: boolean;
  review_status?: ReviewStatus;
  review_note?: string;
}

// ─── Dataset ────────────────────────────────────────────────────────────────

export interface DatasetInfo {
  id: string;
  name: string;
  file_name: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  columns: string[];
  column_mapping: Record<string, string> | null;
  created_at: string | null;
}

export interface DatasetValidationResult {
  is_valid: boolean;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  columns_found: string[];
  columns_mapped: Record<string, string>;
  errors: string[];
  warnings: string[];
  preview_rows: Record<string, unknown>[];
  dataset_id: string | null;
}

// ─── Analysis ───────────────────────────────────────────────────────────────

export interface AnalysisRequest {
  dataset_id: string;
  method: DetectionMethod;
  contamination?: number;
  iqr_multiplier?: number;
  n_estimators?: number;
}

export interface AnalysisResult {
  id: string;
  dataset_id: string;
  method: DetectionMethod;
  status: AnalysisStatus;
  total_transactions: number;
  anomalies_detected: number;
  anomaly_percentage: number;
  parameters_used: Record<string, unknown>;
  features_used: string[];
  model_info: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  total_transactions: number;
  included_transactions: number;
  excluded_transactions: number;
  flagged_anomalies: number;
  reviewed_count: number;
  pending_review_count: number;
  total_amount: number;
  average_amount: number;
  max_amount: number;
  min_amount: number;
  anomaly_percentage: number;
}

export interface AmountDistribution {
  range_label: string;
  count: number;
  anomaly_count: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  anomalies: number;
  anomaly_rate: number;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
  anomaly_count: number;
  total_amount: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  amount_distribution: AmountDistribution[];
  category_breakdown: CategoryBreakdown[];
  time_series: TimeSeriesPoint[];
  recent_anomalies: Transaction[];
}

// ─── Review Log ─────────────────────────────────────────────────────────────

export interface ReviewLogEntry {
  id: string;
  transaction_id: string;
  action: string;
  previous_status: string | null;
  new_status: string;
  previous_included?: boolean | null;
  new_included?: boolean | null;
  transaction_description?: string | null;
  transaction_amount?: number | null;
  transaction_category?: string | null;
  note: string | null;
  created_at: string;
}

// ─── API Responses ──────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
  supabase_connected: boolean;
  demo_mode: boolean;
}
