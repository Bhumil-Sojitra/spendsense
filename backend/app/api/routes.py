"""API routes for SpendSense backend."""

import uuid
import io
import csv
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
import pandas as pd
import logging

from app.core.config import settings
from app.schemas.schemas import (
    AnalysisRequest,
    AnalysisResult,
    AnalysisStatus,
    TransactionUpdate,
    TransactionBulkUpdate,
    DatasetValidationResult,
    ColumnMappingRequest,
    DashboardData,
    HealthResponse,
    ApiResponse,
    PaginatedResponse,
    ReviewStatus,
)
from app.services.csv_validator import validate_csv, process_csv_to_dataframe
from app.services.anomaly_detector import AnomalyDetector
from app.services.data_manager import data_manager
from app.services.demo_data import generate_demo_transactions

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Health ──────────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        supabase_connected=settings.supabase_configured,
        demo_mode=not settings.supabase_configured,
    )


# ─── Demo Data ───────────────────────────────────────────────────────────────

@router.post("/demo/load", response_model=ApiResponse)
async def load_demo_data():
    """Load deterministic synthetic transaction data for demonstration.

    WARNING: In demo mode, all data is stored in-memory and lost on restart.
    """
    df = generate_demo_transactions(n_transactions=200)

    dataset = data_manager.store_dataset(
        df=df,
        file_name="demo_transactions.csv",
        column_mapping={
            "date": "date",
            "amount": "amount",
            "description": "description",
            "category": "category",
            "merchant": "merchant",
            "transaction_type": "transaction_type",
            "account": "account",
        },
        columns=list(df.columns),
    )

    return ApiResponse(
        success=True,
        message=f"Loaded {len(df)} demo transactions. Data is stored in-memory and will be lost on restart.",
        data={"dataset_id": dataset.id, "total_rows": len(df)},
    )


# ─── Dataset Upload & Validation ────────────────────────────────────────────

@router.post("/datasets/validate", response_model=DatasetValidationResult)
async def validate_dataset(file: UploadFile = File(...)):
    """Validate an uploaded CSV file without storing it."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    result = validate_csv(
        file_content=content,
        file_name=file.filename,
        max_size_mb=settings.MAX_FILE_SIZE_MB,
        max_rows=settings.MAX_TRANSACTIONS,
    )

    return DatasetValidationResult(**result)


@router.post("/datasets/upload", response_model=ApiResponse)
async def upload_dataset(
    file: UploadFile = File(...),
):
    """Upload and store a CSV dataset."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Validate first
    validation = validate_csv(
        file_content=content,
        file_name=file.filename,
        max_size_mb=settings.MAX_FILE_SIZE_MB,
        max_rows=settings.MAX_TRANSACTIONS,
    )

    if not validation["is_valid"]:
        raise HTTPException(
            status_code=400,
            detail=f"CSV validation failed: {'; '.join(validation['errors'])}",
        )

    # Process and store
    df = process_csv_to_dataframe(content)
    dataset = data_manager.store_dataset(
        df=df,
        file_name=file.filename,
        column_mapping=validation["columns_mapped"],
        columns=validation["columns_found"],
    )

    return ApiResponse(
        success=True,
        message=f"Dataset '{file.filename}' uploaded successfully with {len(df)} transactions.",
        data={
            "dataset_id": dataset.id,
            "total_rows": dataset.total_rows,
            "columns_mapped": validation["columns_mapped"],
            "warnings": validation["warnings"],
        },
    )


@router.get("/datasets")
async def list_datasets():
    """List all stored datasets."""
    datasets = data_manager.get_all_datasets()
    return {"datasets": [d.model_dump() for d in datasets]}


@router.get("/datasets/{dataset_id}")
async def get_dataset(dataset_id: str):
    """Get dataset info by ID."""
    dataset = data_manager.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset.model_dump()


# ─── Analysis ────────────────────────────────────────────────────────────────

@router.post("/analysis/run", response_model=AnalysisResult)
async def run_analysis(request: AnalysisRequest):
    """Run anomaly detection on a dataset."""
    dataset = data_manager.get_dataset(request.dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = data_manager.get_raw_dataframe(request.dataset_id)
    if df is None or df.empty:
        raise HTTPException(status_code=400, detail="Dataset has no data")

    if len(df) < settings.MIN_SAMPLES_FOR_ML:
        raise HTTPException(
            status_code=400,
            detail=f"Dataset has only {len(df)} rows. Minimum {settings.MIN_SAMPLES_FOR_ML} required for meaningful analysis.",
        )

    analysis_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc)

    try:
        contamination = request.contamination or settings.ISOLATION_FOREST_CONTAMINATION
        iqr_multiplier = request.iqr_multiplier or settings.IQR_MULTIPLIER
        n_estimators = request.n_estimators or settings.ISOLATION_FOREST_N_ESTIMATORS

        detector = AnomalyDetector(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=settings.ISOLATION_FOREST_RANDOM_STATE,
            iqr_multiplier=iqr_multiplier,
        )

        scores, anomaly_flags, model_info = detector.detect(
            df, method=request.method.value
        )
        reasons, primary_reasons = detector.explain_anomalies(
            df, scores, anomaly_flags
        )

        completed_at = datetime.now(timezone.utc)

        result = AnalysisResult(
            id=analysis_id,
            dataset_id=request.dataset_id,
            method=request.method,
            status=AnalysisStatus.COMPLETED,
            total_transactions=len(df),
            anomalies_detected=int(anomaly_flags.sum()),
            anomaly_percentage=round(float(anomaly_flags.sum()) / len(df) * 100, 2),
            parameters_used={
                "contamination": contamination,
                "n_estimators": n_estimators,
                "iqr_multiplier": iqr_multiplier,
            },
            features_used=model_info.get("features_used", []),
            model_info=model_info,
            started_at=started_at,
            completed_at=completed_at,
        )

        # Apply results to transaction records with Explainable AI reasons
        data_manager.apply_analysis_results(
            dataset_id=request.dataset_id,
            scores=scores.tolist(),
            anomaly_flags=anomaly_flags.tolist(),
            analysis_result=result,
            reasons=reasons,
            primary_reasons=primary_reasons,
        )

        return result

    except Exception as e:
        logger.exception("Analysis failed")
        result = AnalysisResult(
            id=analysis_id,
            dataset_id=request.dataset_id,
            method=request.method,
            status=AnalysisStatus.FAILED,
            total_transactions=len(df),
            anomalies_detected=0,
            anomaly_percentage=0,
            parameters_used={},
            features_used=[],
            started_at=started_at,
            completed_at=datetime.now(timezone.utc),
            error_message=str(e),
        )
        data_manager.analysis_results[analysis_id] = result
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/analysis/{dataset_id}/results")
async def get_analysis_results(dataset_id: str):
    """Get all analysis results for a dataset."""
    results = data_manager.get_analysis_results(dataset_id)
    return {"results": [r.model_dump() for r in results]}


@router.get("/analysis/{dataset_id}/latest")
async def get_latest_analysis(dataset_id: str):
    """Get the latest analysis result for a dataset."""
    result = data_manager.get_latest_analysis(dataset_id)
    if not result:
        raise HTTPException(status_code=404, detail="No analysis results found")
    return result.model_dump()


# ─── Transactions ────────────────────────────────────────────────────────────

@router.get("/transactions/{dataset_id}", response_model=PaginatedResponse)
async def get_transactions(
    dataset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: Optional[str] = None,
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    is_anomaly: Optional[bool] = None,
    is_included: Optional[bool] = None,
    review_status: Optional[str] = None,
    search: Optional[str] = None,
):
    """Get paginated, filtered transactions."""
    dataset = data_manager.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    items, total = data_manager.get_transactions(
        dataset_id=dataset_id,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        filter_anomaly=is_anomaly,
        filter_included=is_included,
        filter_review_status=review_status,
        search=search,
    )

    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=[t.model_dump() for t in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.patch("/transactions/{dataset_id}/{transaction_id}")
async def update_transaction(
    dataset_id: str,
    transaction_id: str,
    update: TransactionUpdate,
):
    """Update a transaction's review status or inclusion state."""
    result = data_manager.update_transaction(
        dataset_id=dataset_id,
        transaction_id=transaction_id,
        is_included=update.is_included,
        review_status=update.review_status,
        review_note=update.review_note,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return {"success": True, "transaction": result.model_dump()}


@router.patch("/transactions/{dataset_id}/bulk")
async def bulk_update_transactions(
    dataset_id: str,
    bulk: TransactionBulkUpdate,
):
    """Bulk update multiple transactions."""
    count = data_manager.bulk_update_transactions(
        dataset_id=dataset_id,
        transaction_ids=bulk.transaction_ids,
        is_included=bulk.update.is_included,
        review_status=bulk.update.review_status,
        review_note=bulk.update.review_note,
    )
    return {"success": True, "updated_count": count}


# ─── Dashboard ───────────────────────────────────────────────────────────────

@router.get("/dashboard/{dataset_id}", response_model=DashboardData)
async def get_dashboard(dataset_id: str):
    """Get dashboard metrics and chart data for a dataset."""
    dataset = data_manager.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return data_manager.get_dashboard_data(dataset_id)


# ─── Review Logs ─────────────────────────────────────────────────────────────

@router.get("/reviews/{dataset_id}")
async def get_review_logs(dataset_id: str, limit: int = Query(100, ge=1, le=1000)):
    """Get review action history for a dataset."""
    logs = data_manager.get_review_logs(dataset_id, limit=limit)
    return {"logs": [l.model_dump() for l in logs]}


# ─── Exports ─────────────────────────────────────────────────────────────────

@router.get("/export/{dataset_id}/transactions")
async def export_transactions(
    dataset_id: str,
    scope: str = Query("all", pattern="^(all|included|excluded|flagged)$"),
):
    """Export transactions as CSV download."""
    dataset = data_manager.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    records = data_manager.export_transactions(dataset_id, scope=scope)
    if not records:
        raise HTTPException(status_code=404, detail="No transactions to export")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=records[0].keys())
    writer.writeheader()
    writer.writerows(records)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="spendsense_{scope}_transactions.csv"'
        },
    )


@router.get("/export/{dataset_id}/reviews")
async def export_review_logs(dataset_id: str):
    """Export review audit log as CSV download."""
    dataset = data_manager.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    records = data_manager.export_review_logs(dataset_id)
    if not records:
        raise HTTPException(status_code=404, detail="No review logs to export")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=records[0].keys())
    writer.writeheader()
    writer.writerows(records)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="spendsense_review_logs.csv"'
        },
    )
