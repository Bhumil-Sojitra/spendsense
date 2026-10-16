"""Pydantic schemas for SpendSense AI API contracts."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# ─── Enums ───────────────────────────────────────────────────────────────────

class ReviewStatus(str, Enum):
    PENDING = "pending"
    REVIEWED_OK = "reviewed_ok"
    REVIEWED_SUSPICIOUS = "reviewed_suspicious"
    REVIEWED_FALSE_POSITIVE = "reviewed_false_positive"


class DetectionMethod(str, Enum):
    ISOLATION_FOREST = "isolation_forest"
    STATISTICAL_IQR = "statistical_iqr"
    COMBINED = "combined"


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# ─── Transaction Schemas ─────────────────────────────────────────────────────

class TransactionBase(BaseModel):
    """Base transaction fields from CSV data."""
    date: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    merchant: Optional[str] = None
    transaction_type: Optional[str] = None
    account: Optional[str] = None


class TransactionRecord(TransactionBase):
    """A transaction with anomaly detection results and review state."""
    id: str
    dataset_id: str
    row_index: int

    # ML prediction (set by the model, not user-editable)
    anomaly_score: Optional[float] = None
    is_anomaly: bool = False

    # User review state (independent of ML prediction)
    review_status: ReviewStatus = ReviewStatus.PENDING
    review_note: Optional[str] = None
    reviewed_at: Optional[datetime] = None

    # Inclusion state (independent of anomaly flag and review)
    is_included: bool = True

    # Original raw data preserved
    raw_data: Optional[dict] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TransactionUpdate(BaseModel):
    """Fields that can be updated by the user."""
    is_included: Optional[bool] = None
    review_status: Optional[ReviewStatus] = None
    review_note: Optional[str] = None


class TransactionBulkUpdate(BaseModel):
    """Bulk update for multiple transactions."""
    transaction_ids: list[str]
    update: TransactionUpdate


# ─── Dataset Schemas ─────────────────────────────────────────────────────────

class DatasetInfo(BaseModel):
    """Metadata about an uploaded dataset."""
    id: str
    name: str
    file_name: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    columns: list[str]
    column_mapping: Optional[dict[str, str]] = None
    created_at: Optional[datetime] = None
    user_id: Optional[str] = None


class DatasetValidationResult(BaseModel):
    """Result of CSV validation."""
    is_valid: bool
    total_rows: int
    valid_rows: int
    invalid_rows: int
    columns_found: list[str]
    columns_mapped: dict[str, str]
    errors: list[str] = []
    warnings: list[str] = []
    preview_rows: list[dict] = []
    dataset_id: Optional[str] = None


class ColumnMappingRequest(BaseModel):
    """User-specified column mapping for CSV import."""
    date: Optional[str] = None
    amount: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    merchant: Optional[str] = None
    transaction_type: Optional[str] = None
    account: Optional[str] = None


# ─── Analysis Schemas ────────────────────────────────────────────────────────

class AnalysisRequest(BaseModel):
    """Request to run anomaly detection."""
    dataset_id: str
    method: DetectionMethod = DetectionMethod.ISOLATION_FOREST
    contamination: Optional[float] = Field(None, ge=0.01, le=0.5)
    iqr_multiplier: Optional[float] = Field(None, ge=1.0, le=5.0)
    n_estimators: Optional[int] = Field(None, ge=10, le=500)


class AnalysisResult(BaseModel):
    """Result of an analysis run."""
    id: str
    dataset_id: str
    method: DetectionMethod
    status: AnalysisStatus
    total_transactions: int
    anomalies_detected: int
    anomaly_percentage: float
    parameters_used: dict
    features_used: list[str]
    model_info: dict = {}
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


# ─── Dashboard Schemas ───────────────────────────────────────────────────────

class DashboardMetrics(BaseModel):
    """Dashboard summary metrics."""
    total_transactions: int = 0
    included_transactions: int = 0
    excluded_transactions: int = 0
    flagged_anomalies: int = 0
    reviewed_count: int = 0
    pending_review_count: int = 0
    total_amount: float = 0.0
    average_amount: float = 0.0
    max_amount: float = 0.0
    min_amount: float = 0.0
    anomaly_percentage: float = 0.0


class AmountDistribution(BaseModel):
    """Distribution bucket for amount histogram."""
    range_label: str
    count: int
    anomaly_count: int


class CategoryBreakdown(BaseModel):
    """Anomaly breakdown by category."""
    category: str
    total: int
    anomalies: int
    anomaly_rate: float


class TimeSeriesPoint(BaseModel):
    """Time series data point for trend charts."""
    date: str
    count: int
    anomaly_count: int
    total_amount: float


class DashboardData(BaseModel):
    """Complete dashboard data."""
    metrics: DashboardMetrics
    amount_distribution: list[AmountDistribution] = []
    category_breakdown: list[CategoryBreakdown] = []
    time_series: list[TimeSeriesPoint] = []
    recent_anomalies: list[TransactionRecord] = []


# ─── Review Schemas ──────────────────────────────────────────────────────────

class ReviewLogEntry(BaseModel):
    """A single review action log entry."""
    id: str
    transaction_id: str
    action: str
    previous_status: Optional[str] = None
    new_status: str
    note: Optional[str] = None
    created_at: datetime


# ─── API Response Wrappers ───────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    """Paginated response wrapper."""
    items: list = []
    total: int = 0
    page: int = 1
    page_size: int = 50
    total_pages: int = 0


class ApiResponse(BaseModel):
    """Standard API response wrapper."""
    success: bool
    message: str = ""
    data: Optional[dict] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str
    environment: str
    supabase_connected: bool = False
    demo_mode: bool = True
