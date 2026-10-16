"""Tests for CSV validation and processing."""

import pytest
import io
import pandas as pd
from app.services.csv_validator import (
    validate_csv,
    process_csv_to_dataframe,
    auto_map_columns,
    STANDARD_COLUMNS,
)


def test_auto_map_columns():
    csv_cols = ["Trans Date", "Amount ($)", "Store", "Notes", "Acct Num"]
    # Test case matching
    csv_cols_standard = ["date", "amount", "merchant", "description", "account"]
    mapping = auto_map_columns(csv_cols_standard)
    assert mapping["date"] == "date"
    assert mapping["amount"] == "amount"
    assert mapping["merchant"] == "merchant"
    assert mapping["description"] == "description"
    assert mapping["account"] == "account"


def test_validate_csv_valid():
    csv_data = """date,amount,description,category,merchant
2026-01-01,100.50,Grocery shopping,Food,Whole Foods
2026-01-02,45.00,Gasoline,Transportation,Shell
2026-01-03,12.99,Coffee,Dining,Starbucks
"""
    result = validate_csv(csv_data.encode("utf-8"), "test.csv")
    assert result["is_valid"] is True
    assert result["total_rows"] == 3
    assert result["valid_rows"] == 3
    assert result["invalid_rows"] == 0
    assert len(result["columns_found"]) == 5
    assert "amount" in result["columns_mapped"]
    assert len(result["preview_rows"]) == 3


def test_validate_csv_missing_amount():
    csv_data = """date,description,category
2026-01-01,Coffee,Dining
2026-01-02,Tea,Dining
"""
    result = validate_csv(csv_data.encode("utf-8"), "no_amount.csv")
    assert result["is_valid"] is False
    assert any("amount" in err.lower() for err in result["errors"])


def test_validate_csv_empty_file():
    result = validate_csv(b"", "empty.csv")
    assert result["is_valid"] is False
    assert any("empty" in err.lower() for err in result["errors"])


def test_validate_csv_invalid_amount_rows():
    csv_data = """date,amount,description
2026-01-01,100.00,Valid
2026-01-02,INVALID,Not a number
2026-01-03,50.00,Valid
"""
    result = validate_csv(csv_data.encode("utf-8"), "bad_amounts.csv")
    assert result["is_valid"] is True
    assert result["valid_rows"] == 2
    assert result["invalid_rows"] == 1
    assert len(result["warnings"]) > 0


def test_process_csv_to_dataframe():
    csv_data = """date,amount,desc,category
2026-01-01,123.45,Test,Electronics
2026-01-02,67.89,Test 2,Groceries
"""
    mapping = {
        "date": "date",
        "amount": "amount",
        "description": "desc",
        "category": "category",
    }
    df = process_csv_to_dataframe(csv_data.encode("utf-8"), mapping)
    assert len(df) == 2
    assert "amount" in df.columns
    assert "description" in df.columns
    assert df["amount"].iloc[0] == 123.45
