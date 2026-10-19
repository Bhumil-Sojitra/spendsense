"""Machine Learning anomaly detection service for SpendSense AI.

Implements:
- Isolation Forest (primary unsupervised anomaly detector)
- Statistical IQR-based detection (complementary baseline)
- Combined method (ensemble of both)
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """Anomaly detection engine using Isolation Forest and statistical methods."""

    def __init__(
        self,
        contamination: float = 0.1,
        n_estimators: int = 100,
        random_state: int = 42,
        iqr_multiplier: float = 1.5,
    ):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.iqr_multiplier = iqr_multiplier
        self.scaler = StandardScaler()
        self.label_encoders: dict[str, LabelEncoder] = {}
        self.model: Optional[IsolationForest] = None
        self.features_used: list[str] = []

    def preprocess(self, df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
        """Prepare features for anomaly detection.

        Returns the feature matrix and list of feature names used.
        """
        features = pd.DataFrame(index=df.index)
        feature_names: list[str] = []

        # ── Numerical features ────────────────────────────────────────────
        if "amount" in df.columns:
            amounts = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0)
            features["amount"] = amounts
            features["amount_abs"] = amounts.abs()
            features["amount_log"] = np.log1p(amounts.abs())
            feature_names.extend(["amount", "amount_abs", "amount_log"])

        # ── Date-derived features ─────────────────────────────────────────
        if "date" in df.columns:
            dates = pd.to_datetime(df["date"], errors="coerce")
            valid_dates = dates.notna()
            if valid_dates.sum() > 0:
                features.loc[valid_dates, "day_of_week"] = dates[valid_dates].dt.dayofweek
                features.loc[valid_dates, "day_of_month"] = dates[valid_dates].dt.day
                features.loc[valid_dates, "hour"] = dates[valid_dates].dt.hour
                features.loc[valid_dates, "month"] = dates[valid_dates].dt.month
                for col in ["day_of_week", "day_of_month", "hour", "month"]:
                    features[col] = features[col].fillna(features[col].median() if features[col].notna().any() else 0)
                feature_names.extend(["day_of_week", "day_of_month", "hour", "month"])

        # ── Categorical features (label-encoded) ─────────────────────────
        categorical_cols = ["category", "transaction_type", "merchant", "account"]
        for col in categorical_cols:
            if col in df.columns and df[col].notna().sum() > 0:
                le = LabelEncoder()
                filled = df[col].fillna("unknown").astype(str)
                features[f"{col}_encoded"] = le.fit_transform(filled)
                self.label_encoders[col] = le
                feature_names.append(f"{col}_encoded")

        # ── Amount-based derived features ─────────────────────────────────
        if "amount" in features.columns:
            amount_col = features["amount"]
            if len(amount_col) > 1:
                features["amount_zscore"] = (
                    (amount_col - amount_col.mean()) / amount_col.std()
                    if amount_col.std() > 0
                    else 0
                )
                feature_names.append("amount_zscore")

        # Fill any remaining NaN values
        features = features.fillna(0)

        self.features_used = feature_names
        return features[feature_names] if feature_names else features, feature_names

    def detect_isolation_forest(
        self, df: pd.DataFrame
    ) -> tuple[np.ndarray, np.ndarray]:
        """Run Isolation Forest anomaly detection.

        Returns (anomaly_scores, anomaly_labels).
        Scores: lower (more negative) = more anomalous.
        Labels: -1 = anomaly, 1 = normal (sklearn convention), mapped to True/False.
        """
        features_df, feature_names = self.preprocess(df)

        if features_df.empty or len(feature_names) == 0:
            logger.warning("No usable features for Isolation Forest")
            return np.zeros(len(df)), np.zeros(len(df), dtype=bool)

        # Scale features
        scaled = self.scaler.fit_transform(features_df)

        # Train and predict
        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            n_jobs=-1,
        )
        labels = self.model.fit_predict(scaled)  # -1 = anomaly, 1 = normal
        raw_scores = self.model.decision_function(scaled)  # lower = more anomalous

        # Normalize scores to 0–1 range where 1 = most anomalous
        if raw_scores.max() != raw_scores.min():
            normalized_scores = 1 - (raw_scores - raw_scores.min()) / (
                raw_scores.max() - raw_scores.min()
            )
        else:
            normalized_scores = np.zeros(len(raw_scores))

        is_anomaly = labels == -1

        return normalized_scores, is_anomaly

    def detect_statistical_iqr(
        self, df: pd.DataFrame
    ) -> tuple[np.ndarray, np.ndarray]:
        """Run IQR-based statistical anomaly detection on the amount field.

        Returns (anomaly_scores, anomaly_labels).
        """
        if "amount" not in df.columns:
            logger.warning("No 'amount' column for IQR detection")
            return np.zeros(len(df)), np.zeros(len(df), dtype=bool)

        amounts = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0)

        q1 = amounts.quantile(0.25)
        q3 = amounts.quantile(0.75)
        iqr = q3 - q1

        if iqr == 0:
            # All values are the same or nearly so; use std deviation fallback
            mean = amounts.mean()
            std = amounts.std()
            if std > 0:
                z_scores = ((amounts - mean) / std).abs()
                normalized_scores = np.clip(z_scores / z_scores.max(), 0, 1) if z_scores.max() > 0 else np.zeros(len(amounts))
                is_anomaly = z_scores > 3
            else:
                normalized_scores = np.zeros(len(amounts))
                is_anomaly = np.zeros(len(amounts), dtype=bool)
            return normalized_scores.values if hasattr(normalized_scores, 'values') else normalized_scores, is_anomaly.values if hasattr(is_anomaly, 'values') else is_anomaly

        lower_bound = q1 - self.iqr_multiplier * iqr
        upper_bound = q3 + self.iqr_multiplier * iqr

        # Distance from nearest bound, normalized
        distances = np.maximum(
            np.maximum(lower_bound - amounts, amounts - upper_bound), 0
        )
        max_dist = distances.max()
        normalized_scores = (distances / max_dist) if max_dist > 0 else np.zeros(len(amounts))

        is_anomaly = (amounts < lower_bound) | (amounts > upper_bound)

        scores = normalized_scores.values if hasattr(normalized_scores, "values") else np.asarray(normalized_scores)
        anomalies = is_anomaly.values if hasattr(is_anomaly, "values") else np.asarray(is_anomaly)
        return scores, anomalies

    def detect_combined(
        self, df: pd.DataFrame
    ) -> tuple[np.ndarray, np.ndarray]:
        """Combine Isolation Forest and IQR results.

        A transaction is flagged if either method flags it.
        The score is the average of both normalized scores.
        """
        if_scores, if_anomalies = self.detect_isolation_forest(df)
        iqr_scores, iqr_anomalies = self.detect_statistical_iqr(df)

        combined_scores = (if_scores + iqr_scores) / 2
        combined_anomalies = if_anomalies | iqr_anomalies

        return combined_scores, combined_anomalies

    def detect(
        self, df: pd.DataFrame, method: str = "isolation_forest"
    ) -> tuple[np.ndarray, np.ndarray, dict]:
        """Main detection entry point.

        Returns (scores, is_anomaly_flags, model_info_dict).
        """
        model_info = {
            "method": method,
            "n_samples": len(df),
            "contamination": self.contamination,
            "n_estimators": self.n_estimators,
            "iqr_multiplier": self.iqr_multiplier,
        }

        if len(df) < 3:
            logger.warning(f"Dataset too small ({len(df)} rows) for meaningful analysis")
            return (
                np.zeros(len(df)),
                np.zeros(len(df), dtype=bool),
                {**model_info, "warning": "Dataset too small for meaningful analysis"},
            )

        if method == "isolation_forest":
            scores, anomalies = self.detect_isolation_forest(df)
        elif method == "statistical_iqr":
            scores, anomalies = self.detect_statistical_iqr(df)
        elif method == "combined":
            scores, anomalies = self.detect_combined(df)
        else:
            raise ValueError(f"Unknown detection method: {method}")

        model_info["features_used"] = self.features_used
        model_info["anomalies_detected"] = int(anomalies.sum())
        model_info["anomaly_percentage"] = round(
            float(anomalies.sum()) / len(df) * 100, 2
        ) if len(df) > 0 else 0

        return scores, anomalies, model_info

    def explain_anomalies(
        self, df: pd.DataFrame, scores: np.ndarray, is_anomaly: np.ndarray
    ) -> tuple[list[list[str]], list[Optional[str]]]:
        """Generate human-readable explainable AI (XAI) diagnostic reasons for each transaction."""
        reasons_list: list[list[str]] = []
        primary_reasons: list[Optional[str]] = []

        amounts = pd.to_numeric(df.get("amount", pd.Series([0] * len(df))), errors="coerce").fillna(0.0)
        mean_amount = float(amounts.mean()) if len(amounts) > 0 else 0.0
        std_amount = float(amounts.std()) if len(amounts) > 1 else 0.0
        q1 = float(amounts.quantile(0.25)) if len(amounts) > 0 else 0.0
        q3 = float(amounts.quantile(0.75)) if len(amounts) > 0 else 0.0
        iqr = q3 - q1
        upper_iqr = q3 + self.iqr_multiplier * iqr
        lower_iqr = q1 - self.iqr_multiplier * iqr

        has_category = "category" in df.columns
        cat_medians: dict[str, float] = {}
        if has_category:
            try:
                cat_medians = df.groupby("category")["amount"].median().to_dict()
            except Exception:
                pass

        parsed_dates = None
        if "date" in df.columns:
            try:
                parsed_dates = pd.to_datetime(df["date"], errors="coerce")
            except Exception:
                pass

        merchant_counts: dict[str, int] = {}
        if "merchant" in df.columns:
            try:
                merchant_counts = df["merchant"].value_counts().to_dict()
            except Exception:
                pass

        for i in range(len(df)):
            amt = float(amounts.iloc[i]) if i < len(amounts) else 0.0
            flagged = bool(is_anomaly[i]) if i < len(is_anomaly) else False
            score = float(scores[i]) if i < len(scores) else 0.0

            row_reasons: list[str] = []
            primary: Optional[str] = None

            if flagged or score >= 0.5:
                # 1. Category-specific deviation
                if has_category:
                    cat = str(df.iloc[i].get("category", "") or "")
                    cat_med = float(cat_medians.get(cat, 0.0))
                    if cat_med > 0:
                        ratio = amt / cat_med
                        if ratio >= 2.5:
                            row_reasons.append(
                                f"Amount (${amt:,.2f}) is {ratio:.1f}x higher than {cat} median (${cat_med:,.2f})"
                            )
                            if not primary:
                                primary = f"{ratio:.1f}x Category Median"
                        elif ratio <= 0.1 and amt > 0:
                            row_reasons.append(
                                f"Amount is unusually low for {cat} (typical median: ${cat_med:,.2f})"
                            )

                # 2. Statistical IQR Boundary
                if iqr > 0 and amt > upper_iqr:
                    excess = amt - upper_iqr
                    row_reasons.append(
                        f"Exceeds statistical IQR threshold (${upper_iqr:,.2f}) by +${excess:,.2f}"
                    )
                    if not primary:
                        primary = "Statistical IQR Outlier"
                elif iqr > 0 and amt < lower_iqr:
                    row_reasons.append(
                        f"Falls below lower statistical boundary (${lower_iqr:,.2f})"
                    )
                    if not primary:
                        primary = "Statistical Lower Outlier"

                # 3. Z-Score extreme deviation
                if std_amount > 0:
                    z = (amt - mean_amount) / std_amount
                    if abs(z) >= 2.5:
                        row_reasons.append(f"High standard deviation deviation ({z:+.1f}σ from mean)")
                        if not primary and abs(z) >= 3.0:
                            primary = f"Extreme Amount ({z:+.1f}σ)"

                # 4. Off-Hours Temporal Anomaly (Midnight to 5:00 AM)
                if parsed_dates is not None and i < len(parsed_dates):
                    dt = parsed_dates.iloc[i]
                    if pd.notna(dt):
                        h = dt.hour
                        m = dt.minute
                        if 0 <= h <= 5:
                            row_reasons.append(f"Off-hours transaction initiated at {h:02d}:{m:02d} AM")
                            if not primary and amt > mean_amount:
                                primary = f"Off-Hours Activity ({h:02d}:{m:02d} AM)"

                # 5. Infrequent Merchant with High Charge
                if "merchant" in df.columns:
                    m_name = str(df.iloc[i].get("merchant", "") or "")
                    m_cnt = merchant_counts.get(m_name, 0)
                    if m_cnt == 1 and amt > mean_amount:
                        row_reasons.append(f"Single-occurrence merchant '{m_name}' with above-average charge")

                if not row_reasons:
                    row_reasons.append("Multi-dimensional behavioral anomaly isolated by random tree partition")
                if not primary:
                    primary = f"High Risk Score ({score:.0%})"
            else:
                primary = None

            reasons_list.append(row_reasons)
            primary_reasons.append(primary)

        return reasons_list, primary_reasons

