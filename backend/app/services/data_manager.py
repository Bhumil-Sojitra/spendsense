"""In-memory data manager for demo mode.

Stores datasets, transactions, analysis results, and review logs in memory.
When Supabase credentials are configured, this is replaced by database persistence.

WARNING: All data is lost when the backend restarts in demo mode.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
import pandas as pd
import numpy as np
import logging

from app.schemas.schemas import (
    TransactionRecord,
    DatasetInfo,
    AnalysisResult,
    ReviewLogEntry,
    ReviewStatus,
    AnalysisStatus,
    DetectionMethod,
    DashboardMetrics,
    DashboardData,
    AmountDistribution,
    CategoryBreakdown,
    TimeSeriesPoint,
)

logger = logging.getLogger(__name__)


class DataManager:
    """In-memory data store for demo mode. Thread-safe for single-process uvicorn."""

    def __init__(self):
        self.datasets: dict[str, DatasetInfo] = {}
        self.transactions: dict[str, list[TransactionRecord]] = {}  # dataset_id -> list
        self.analysis_results: dict[str, AnalysisResult] = {}  # analysis_id -> result
        self.review_logs: list[ReviewLogEntry] = []
        self._raw_dataframes: dict[str, pd.DataFrame] = {}  # dataset_id -> original df

    def clear(self):
        """Clear all stored data."""
        self.datasets.clear()
        self.transactions.clear()
        self.analysis_results.clear()
        self.review_logs.clear()
        self._raw_dataframes.clear()

    # ─── Dataset operations ──────────────────────────────────────────────

    def store_dataset(
        self,
        df: pd.DataFrame,
        file_name: str,
        column_mapping: dict[str, str],
        columns: list[str],
    ) -> DatasetInfo:
        """Store a dataset and create transaction records."""
        dataset_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        dataset = DatasetInfo(
            id=dataset_id,
            name=file_name.rsplit(".", 1)[0],
            file_name=file_name,
            total_rows=len(df),
            valid_rows=len(df),
            invalid_rows=0,
            columns=columns,
            column_mapping=column_mapping,
            created_at=now,
        )
        self.datasets[dataset_id] = dataset
        self._raw_dataframes[dataset_id] = df.copy()

        # Create transaction records
        txns: list[TransactionRecord] = []
        for idx, row in df.iterrows():
            raw_data = {}
            for col in df.columns:
                val = row[col]
                if pd.isna(val):
                    raw_data[col] = None
                elif isinstance(val, (pd.Timestamp, datetime)):
                    raw_data[col] = str(val)
                elif isinstance(val, (np.integer,)):
                    raw_data[col] = int(val)
                elif isinstance(val, (np.floating,)):
                    raw_data[col] = float(val)
                else:
                    raw_data[col] = val

            txn = TransactionRecord(
                id=str(uuid.uuid4()),
                dataset_id=dataset_id,
                row_index=int(idx),
                date=str(row.get("date", "")) if pd.notna(row.get("date")) else None,
                amount=float(row["amount"]) if pd.notna(row.get("amount")) else None,
                description=str(row.get("description", "")) if row.get("description") else None,
                category=str(row.get("category", "")) if row.get("category") else None,
                merchant=str(row.get("merchant", "")) if row.get("merchant") else None,
                transaction_type=str(row.get("transaction_type", "")) if row.get("transaction_type") else None,
                account=str(row.get("account", "")) if row.get("account") else None,
                raw_data=raw_data,
                created_at=now,
                updated_at=now,
            )
            txns.append(txn)

        self.transactions[dataset_id] = txns
        return dataset

    def get_dataset(self, dataset_id: str) -> Optional[DatasetInfo]:
        return self.datasets.get(dataset_id)

    def get_all_datasets(self) -> list[DatasetInfo]:
        return list(self.datasets.values())

    def get_raw_dataframe(self, dataset_id: str) -> Optional[pd.DataFrame]:
        return self._raw_dataframes.get(dataset_id)

    # ─── Transaction operations ──────────────────────────────────────────

    def get_transactions(
        self,
        dataset_id: str,
        page: int = 1,
        page_size: int = 50,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        filter_anomaly: Optional[bool] = None,
        filter_included: Optional[bool] = None,
        filter_review_status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> tuple[list[TransactionRecord], int]:
        """Get transactions with filtering, sorting, and pagination."""
        txns = self.transactions.get(dataset_id, [])

        # Filtering
        if filter_anomaly is not None:
            txns = [t for t in txns if t.is_anomaly == filter_anomaly]
        if filter_included is not None:
            txns = [t for t in txns if t.is_included == filter_included]
        if filter_review_status:
            txns = [t for t in txns if t.review_status.value == filter_review_status]
        if search:
            search_lower = search.lower()
            txns = [
                t for t in txns
                if (t.description and search_lower in t.description.lower())
                or (t.merchant and search_lower in t.merchant.lower())
                or (t.category and search_lower in t.category.lower())
            ]

        total = len(txns)

        # Sorting
        if sort_by:
            reverse = sort_order == "desc"
            try:
                txns = sorted(
                    txns,
                    key=lambda t: getattr(t, sort_by, None) or "",
                    reverse=reverse,
                )
            except (AttributeError, TypeError):
                pass

        # Pagination
        start = (page - 1) * page_size
        end = start + page_size
        return txns[start:end], total

    def get_transaction_by_id(self, dataset_id: str, transaction_id: str) -> Optional[TransactionRecord]:
        txns = self.transactions.get(dataset_id, [])
        for t in txns:
            if t.id == transaction_id:
                return t
        return None

    def update_transaction(
        self,
        dataset_id: str,
        transaction_id: str,
        is_included: Optional[bool] = None,
        review_status: Optional[ReviewStatus] = None,
        review_note: Optional[str] = None,
    ) -> Optional[TransactionRecord]:
        """Update a transaction's review or inclusion state."""
        txns = self.transactions.get(dataset_id, [])
        for i, t in enumerate(txns):
            if t.id == transaction_id:
                now = datetime.now(timezone.utc)
                old_status = t.review_status.value
                old_included = t.is_included

                if is_included is not None:
                    t.is_included = is_included
                if review_status is not None:
                    t.review_status = review_status
                    t.reviewed_at = now
                if review_note is not None:
                    t.review_note = review_note
                t.updated_at = now

                # Create review log entry
                action_parts = []
                if is_included is not None and is_included != old_included:
                    action_parts.append("included" if is_included else "excluded")
                if review_status is not None and review_status.value != old_status:
                    action_parts.append(f"reviewed as {review_status.value}")

                if action_parts:
                    log_entry = ReviewLogEntry(
                        id=str(uuid.uuid4()),
                        transaction_id=transaction_id,
                        action=", ".join(action_parts),
                        previous_status=old_status,
                        new_status=review_status.value if review_status else old_status,
                        note=review_note,
                        created_at=now,
                    )
                    self.review_logs.append(log_entry)

                self.transactions[dataset_id][i] = t
                return t
        return None

    def bulk_update_transactions(
        self,
        dataset_id: str,
        transaction_ids: list[str],
        is_included: Optional[bool] = None,
        review_status: Optional[ReviewStatus] = None,
        review_note: Optional[str] = None,
    ) -> int:
        """Bulk update multiple transactions. Returns count updated."""
        count = 0
        for tid in transaction_ids:
            result = self.update_transaction(
                dataset_id, tid, is_included, review_status, review_note
            )
            if result:
                count += 1
        return count

    # ─── Analysis operations ─────────────────────────────────────────────

    def apply_analysis_results(
        self,
        dataset_id: str,
        scores: list[float],
        anomaly_flags: list[bool],
        analysis_result: AnalysisResult,
    ):
        """Apply ML results to transactions and store analysis."""
        txns = self.transactions.get(dataset_id, [])
        for i, txn in enumerate(txns):
            if i < len(scores):
                txn.anomaly_score = float(scores[i])
                txn.is_anomaly = bool(anomaly_flags[i])
                txn.updated_at = datetime.now(timezone.utc)

        self.analysis_results[analysis_result.id] = analysis_result

    def get_analysis_results(self, dataset_id: str) -> list[AnalysisResult]:
        return [r for r in self.analysis_results.values() if r.dataset_id == dataset_id]

    def get_latest_analysis(self, dataset_id: str) -> Optional[AnalysisResult]:
        results = self.get_analysis_results(dataset_id)
        if not results:
            return None
        return max(results, key=lambda r: r.completed_at or r.started_at or datetime.min.replace(tzinfo=timezone.utc))

    # ─── Review logs ─────────────────────────────────────────────────────

    def get_review_logs(
        self, dataset_id: Optional[str] = None, limit: int = 100
    ) -> list[ReviewLogEntry]:
        logs = self.review_logs
        if dataset_id:
            txn_ids = {t.id for t in self.transactions.get(dataset_id, [])}
            logs = [l for l in logs if l.transaction_id in txn_ids]
        return sorted(logs, key=lambda l: l.created_at, reverse=True)[:limit]

    # ─── Dashboard metrics ───────────────────────────────────────────────

    def get_dashboard_data(self, dataset_id: str) -> DashboardData:
        """Compute dashboard metrics and chart data from current transaction state."""
        txns = self.transactions.get(dataset_id, [])

        if not txns:
            return DashboardData(metrics=DashboardMetrics())

        included = [t for t in txns if t.is_included]
        excluded = [t for t in txns if not t.is_included]
        flagged = [t for t in txns if t.is_anomaly]
        flagged_included = [t for t in included if t.is_anomaly]
        reviewed = [t for t in txns if t.review_status != ReviewStatus.PENDING]
        pending = [t for t in flagged if t.review_status == ReviewStatus.PENDING]

        amounts = [t.amount for t in included if t.amount is not None]

        metrics = DashboardMetrics(
            total_transactions=len(txns),
            included_transactions=len(included),
            excluded_transactions=len(excluded),
            flagged_anomalies=len(flagged),
            reviewed_count=len(reviewed),
            pending_review_count=len(pending),
            total_amount=sum(amounts) if amounts else 0,
            average_amount=sum(amounts) / len(amounts) if amounts else 0,
            max_amount=max(amounts) if amounts else 0,
            min_amount=min(amounts) if amounts else 0,
            anomaly_percentage=round(len(flagged) / len(txns) * 100, 2) if txns else 0,
        )

        # Amount distribution histogram
        amount_dist = self._compute_amount_distribution(included)

        # Category breakdown
        cat_breakdown = self._compute_category_breakdown(txns)

        # Time series
        time_series = self._compute_time_series(txns)

        # Recent anomalies
        recent_anomalies = sorted(
            flagged_included,
            key=lambda t: t.anomaly_score or 0,
            reverse=True,
        )[:10]

        return DashboardData(
            metrics=metrics,
            amount_distribution=amount_dist,
            category_breakdown=cat_breakdown,
            time_series=time_series,
            recent_anomalies=recent_anomalies,
        )

    def _compute_amount_distribution(self, txns: list[TransactionRecord]) -> list[AmountDistribution]:
        """Create amount histogram buckets."""
        amounts = [t.amount for t in txns if t.amount is not None]
        if not amounts:
            return []

        min_amt = min(amounts)
        max_amt = max(amounts)

        if min_amt == max_amt:
            return [AmountDistribution(
                range_label=f"${min_amt:.0f}",
                count=len(amounts),
                anomaly_count=sum(1 for t in txns if t.is_anomaly and t.amount is not None),
            )]

        # Create 8 buckets
        n_buckets = min(8, len(set(amounts)))
        bucket_size = (max_amt - min_amt) / n_buckets

        dist: list[AmountDistribution] = []
        for i in range(n_buckets):
            lower = min_amt + i * bucket_size
            upper = lower + bucket_size if i < n_buckets - 1 else max_amt + 1

            bucket_txns = [t for t in txns if t.amount is not None and lower <= t.amount < upper]
            dist.append(AmountDistribution(
                range_label=f"${lower:,.0f}-${upper:,.0f}",
                count=len(bucket_txns),
                anomaly_count=sum(1 for t in bucket_txns if t.is_anomaly),
            ))

        return dist

    def _compute_category_breakdown(self, txns: list[TransactionRecord]) -> list[CategoryBreakdown]:
        """Compute anomaly rates per category."""
        categories: dict[str, dict] = {}
        for t in txns:
            cat = t.category or "Uncategorized"
            if cat not in categories:
                categories[cat] = {"total": 0, "anomalies": 0}
            categories[cat]["total"] += 1
            if t.is_anomaly:
                categories[cat]["anomalies"] += 1

        return [
            CategoryBreakdown(
                category=cat,
                total=data["total"],
                anomalies=data["anomalies"],
                anomaly_rate=round(data["anomalies"] / data["total"] * 100, 2) if data["total"] > 0 else 0,
            )
            for cat, data in sorted(categories.items(), key=lambda x: x[1]["anomalies"], reverse=True)
        ]

    def _compute_time_series(self, txns: list[TransactionRecord]) -> list[TimeSeriesPoint]:
        """Compute daily time series for transaction trends."""
        daily: dict[str, dict] = {}
        for t in txns:
            if t.date:
                try:
                    date_str = str(t.date).split(" ")[0].split("T")[0]
                    if date_str and date_str != "None" and date_str != "NaT":
                        if date_str not in daily:
                            daily[date_str] = {"count": 0, "anomaly_count": 0, "total_amount": 0}
                        daily[date_str]["count"] += 1
                        if t.is_anomaly:
                            daily[date_str]["anomaly_count"] += 1
                        if t.amount:
                            daily[date_str]["total_amount"] += t.amount
                except (ValueError, IndexError):
                    pass

        return [
            TimeSeriesPoint(
                date=date,
                count=data["count"],
                anomaly_count=data["anomaly_count"],
                total_amount=round(data["total_amount"], 2),
            )
            for date, data in sorted(daily.items())
        ]

    # ─── Export helpers ──────────────────────────────────────────────────

    def export_transactions(
        self,
        dataset_id: str,
        scope: str = "all",
    ) -> list[dict]:
        """Export transactions as list of dicts.

        Scope: "all", "included", "excluded", "flagged"
        """
        txns = self.transactions.get(dataset_id, [])

        if scope == "included":
            txns = [t for t in txns if t.is_included]
        elif scope == "excluded":
            txns = [t for t in txns if not t.is_included]
        elif scope == "flagged":
            txns = [t for t in txns if t.is_anomaly]

        return [
            {
                "id": t.id,
                "date": t.date,
                "amount": t.amount,
                "description": t.description,
                "category": t.category,
                "merchant": t.merchant,
                "transaction_type": t.transaction_type,
                "anomaly_score": round(t.anomaly_score, 4) if t.anomaly_score is not None else None,
                "is_anomaly": t.is_anomaly,
                "review_status": t.review_status.value,
                "review_note": t.review_note,
                "is_included": t.is_included,
            }
            for t in txns
        ]

    def export_review_logs(self, dataset_id: Optional[str] = None) -> list[dict]:
        """Export review logs as list of dicts."""
        logs = self.get_review_logs(dataset_id, limit=10000)
        return [
            {
                "id": l.id,
                "transaction_id": l.transaction_id,
                "action": l.action,
                "previous_status": l.previous_status,
                "new_status": l.new_status,
                "note": l.note,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ]


# Singleton instance for demo mode
data_manager = DataManager()
