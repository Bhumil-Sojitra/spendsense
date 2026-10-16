"""Tests for Machine Learning anomaly detection algorithms."""

import pytest
import numpy as np
import pandas as pd
from app.services.anomaly_detector import AnomalyDetector


@pytest.fixture
def sample_transactions_df():
    """Create a sample dataset with known normal transactions and outliers."""
    np.random.seed(42)
    n_normal = 100
    normal_amounts = np.random.normal(loc=50.0, scale=15.0, size=n_normal)
    
    # 5 extreme outliers
    outlier_amounts = [2500.0, 3200.0, 5000.0, 8900.0, 12000.0]
    
    amounts = np.concatenate([normal_amounts, outlier_amounts])
    n_total = len(amounts)
    
    dates = pd.date_range("2026-01-01", periods=n_total, freq="h").strftime("%Y-%m-%d %H:%M:%S")
    categories = np.random.choice(["Groceries", "Dining", "Utilities", "Travel", "Electronics"], size=n_total)
    merchants = np.random.choice(["Amazon", "Uber", "Walmart", "Apple", "Target"], size=n_total)
    
    df = pd.DataFrame({
        "amount": amounts,
        "date": dates,
        "category": categories,
        "merchant": merchants,
        "description": [f"Transaction {i}" for i in range(n_total)],
    })
    return df


def test_isolation_forest_detection(sample_transactions_df):
    detector = AnomalyDetector(contamination=0.05, random_state=42)
    scores, is_anomaly = detector.detect_isolation_forest(sample_transactions_df)
    
    assert len(scores) == len(sample_transactions_df)
    assert len(is_anomaly) == len(sample_transactions_df)
    assert is_anomaly.sum() > 0
    # Check that scores are normalized between 0 and 1
    assert scores.min() >= 0.0
    assert scores.max() <= 1.0
    # Extreme outliers should receive high anomaly scores
    assert scores[-1] > scores[0]


def test_statistical_iqr_detection(sample_transactions_df):
    detector = AnomalyDetector(iqr_multiplier=1.5)
    scores, is_anomaly = detector.detect_statistical_iqr(sample_transactions_df)
    
    assert len(scores) == len(sample_transactions_df)
    assert len(is_anomaly) == len(sample_transactions_df)
    assert is_anomaly.sum() > 0
    # The extreme values (last 5) must be flagged by IQR
    assert all(is_anomaly[-5:])


def test_combined_detection(sample_transactions_df):
    detector = AnomalyDetector(contamination=0.05, iqr_multiplier=1.5, random_state=42)
    scores, is_anomaly = detector.detect_combined(sample_transactions_df)
    
    assert len(scores) == len(sample_transactions_df)
    assert len(is_anomaly) == len(sample_transactions_df)
    assert is_anomaly.sum() >= 5
    assert scores.min() >= 0.0
    assert scores.max() <= 1.0


def test_detect_entrypoint(sample_transactions_df):
    detector = AnomalyDetector(contamination=0.05)
    scores, is_anomaly, info = detector.detect(sample_transactions_df, method="isolation_forest")
    
    assert "method" in info
    assert "anomalies_detected" in info
    assert "anomaly_percentage" in info
    assert "features_used" in info
    assert info["anomalies_detected"] == int(is_anomaly.sum())


def test_edge_case_minimal_dataset():
    """Test handling of very small datasets without crashing."""
    df = pd.DataFrame({
        "amount": [10.0, 12.0, 15.0],
        "date": ["2026-01-01", "2026-01-02", "2026-01-03"],
        "category": ["Food", "Food", "Food"],
    })
    detector = AnomalyDetector(contamination=0.1)
    scores, is_anomaly, info = detector.detect(df, method="statistical_iqr")
    assert len(scores) == 3
    assert len(is_anomaly) == 3
