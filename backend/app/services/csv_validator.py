"""CSV validation and data processing service."""

import pandas as pd
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Standard column names that SpendSense AI works with
STANDARD_COLUMNS = {
    "date": [
        "date", "transaction_date", "trans_date", "txn_date", "datetime",
        "timestamp", "time", "trans_date_trans_time", "ref_date", "period", "year", "posting_date"
    ],
    "amount": [
        "amount", "amt", "expense", "expenses", "income", "expenditure", "expenditures",
        "transaction_amount", "value", "sum", "total", "price", "cost", "debit",
        "credit", "payment", "spend", "charge", "trans_amount", "tx_amount", "txn_amt"
    ],
    "description": [
        "description", "desc", "memo", "note", "notes", "narrative",
        "details", "transaction_description", "family type", "statistic", "job", "trans_num"
    ],
    "category": [
        "category", "cat", "household expenditures, summary-level categories",
        "type", "transaction_type", "trans_type", "group", "classification",
        "sector", "industry"
    ],
    "merchant": [
        "merchant", "vendor", "payee", "merchant_name", "store", "shop",
        "company", "name", "geo"
    ],
    "transaction_type": [
        "transaction_type", "type", "txn_type", "trans_type", "direction",
        "dr_cr", "uom"
    ],
    "account": [
        "account", "account_name", "account_number", "acct", "bank", "source", "coordinate", "cc_num", "card"
    ],
}

# Required: at least amount must be present
REQUIRED_COLUMNS = ["amount"]


def auto_map_columns(csv_columns: list[str]) -> dict[str, str]:
    """Automatically map CSV column names to standard SpendSense columns.

    Returns a dict of {standard_name: csv_column_name}.
    """
    mapping: dict[str, str] = {}
    csv_lower = {col.lower().strip(): col for col in csv_columns}

    for standard_name, aliases in STANDARD_COLUMNS.items():
        for alias in aliases:
            if alias in csv_lower:
                mapping[standard_name] = csv_lower[alias]
                break
        
        # Substring / partial matching fallback if exact match wasn't found
        if standard_name not in mapping:
            for csv_col_clean, orig_col in csv_lower.items():
                if any(alias in csv_col_clean for alias in ["amt", "expense", "amount", "income", "cost", "total"]) and standard_name == "amount":
                    mapping["amount"] = orig_col
                    break
                elif any(alias in csv_col_clean for alias in ["date", "period", "time"]) and standard_name == "date":
                    mapping["date"] = orig_col
                    break
                elif any(alias in csv_col_clean for alias in ["category", "expenditure"]) and standard_name == "category":
                    mapping["category"] = orig_col
                    break

    return mapping


def validate_csv(
    file_content: bytes,
    file_name: str,
    max_size_mb: int = 500,
    max_rows: Optional[int] = None,
    column_mapping: Optional[dict[str, str]] = None,
) -> dict:
    """Validate a CSV file and return validation results with preview data.

    Returns a dict matching DatasetValidationResult schema.
    """
    errors: list[str] = []
    warnings: list[str] = []

    # ── Empty file check ──────────────────────────────────────────────────
    if not file_content or len(file_content.strip()) == 0:
        return {
            "is_valid": False,
            "total_rows": 0,
            "valid_rows": 0,
            "invalid_rows": 0,
            "columns_found": [],
            "columns_mapped": {},
            "errors": ["Uploaded CSV file is empty"],
            "warnings": [],
            "preview_rows": [],
        }

    # ── Parse CSV ─────────────────────────────────────────────────────────
    try:
        # Try UTF-8 first, then latin-1 as fallback
        try:
            text = file_content.decode("utf-8")
        except UnicodeDecodeError:
            text = file_content.decode("latin-1")
            warnings.append("File was decoded using latin-1 encoding (not UTF-8)")

        df = pd.read_csv(io.StringIO(text))
    except Exception as e:
        return {
            "is_valid": False,
            "total_rows": 0,
            "valid_rows": 0,
            "invalid_rows": 0,
            "columns_found": [],
            "columns_mapped": {},
            "errors": [f"Failed to parse CSV: {str(e)}"],
            "warnings": [],
            "preview_rows": [],
        }

    if df.empty:
        return {
            "is_valid": False,
            "total_rows": 0,
            "valid_rows": 0,
            "invalid_rows": 0,
            "columns_found": list(df.columns),
            "columns_mapped": {},
            "errors": ["CSV file contains no data rows"],
            "warnings": [],
            "preview_rows": [],
        }

    # ── Row count check (only truncate if max_rows > 0) ──────────────────
    if max_rows is not None and max_rows > 0 and len(df) > max_rows:
        warnings.append(f"File has {len(df)} rows. Only the first {max_rows} rows will be processed.")
        df = df.head(max_rows)

    columns_found = list(df.columns)

    # ── Column mapping ───────────────────────────────────────────────────
    if column_mapping:
        mapped = {k: v for k, v in column_mapping.items() if v in df.columns}
    else:
        mapped = auto_map_columns(columns_found)

    # ── Required column check ────────────────────────────────────────────
    for req in REQUIRED_COLUMNS:
        if req not in mapped:
            errors.append(f"Required column '{req}' could not be identified. Available columns: {columns_found}")

    if errors and any("Required column" in e for e in errors):
        return {
            "is_valid": False,
            "total_rows": len(df),
            "valid_rows": 0,
            "invalid_rows": len(df),
            "columns_found": columns_found,
            "columns_mapped": mapped,
            "errors": errors,
            "warnings": warnings,
            "preview_rows": df.head(5).to_dict(orient="records"),
        }

    # ── Data validation ──────────────────────────────────────────────────
    # Rename columns to standard names
    reverse_map = {v: k for k, v in mapped.items()}
    df_standard = df.rename(columns=reverse_map)

    valid_mask = pd.Series(True, index=df_standard.index)

    # Validate amounts
    if "amount" in df_standard.columns:
        amounts = pd.to_numeric(df_standard["amount"], errors="coerce")
        invalid_amounts = amounts.isna() & df_standard["amount"].notna()
        if invalid_amounts.sum() > 0:
            warnings.append(f"{invalid_amounts.sum()} rows have non-numeric amount values")
            valid_mask &= ~invalid_amounts

        zero_amounts = amounts == 0
        if zero_amounts.sum() > 0:
            warnings.append(f"{zero_amounts.sum()} rows have zero amounts")

    # Validate dates if present
    if "date" in df_standard.columns:
        dates = pd.to_datetime(df_standard["date"], errors="coerce")
        invalid_dates = dates.isna() & df_standard["date"].notna()
        if invalid_dates.sum() > 0:
            warnings.append(f"{invalid_dates.sum()} rows have unparseable date values")

    # Check for completely empty rows
    empty_rows = df.isna().all(axis=1).sum()
    if empty_rows > 0:
        warnings.append(f"{empty_rows} completely empty rows found and will be excluded")
        valid_mask &= ~df.isna().all(axis=1)

    # Check for duplicates
    duplicate_count = df.duplicated().sum()
    if duplicate_count > 0:
        warnings.append(f"{duplicate_count} potential duplicate rows detected")

    valid_rows = int(valid_mask.sum())
    invalid_rows = int((~valid_mask).sum())

    # ── Build preview ────────────────────────────────────────────────────
    preview = df.head(10).fillna("").to_dict(orient="records")

    is_valid = valid_rows > 0 and not any("Required column" in e for e in errors)

    return {
        "is_valid": is_valid,
        "total_rows": len(df),
        "valid_rows": valid_rows,
        "invalid_rows": invalid_rows,
        "columns_found": columns_found,
        "columns_mapped": mapped,
        "errors": errors,
        "warnings": warnings,
        "preview_rows": preview,
    }


def process_csv_to_dataframe(
    file_content: bytes,
    column_mapping: Optional[dict[str, str]] = None,
) -> pd.DataFrame:
    """Parse CSV content into a standardized DataFrame.

    Renames columns per the mapping, converts types, and cleans data.
    """
    try:
        text = file_content.decode("utf-8")
    except UnicodeDecodeError:
        text = file_content.decode("latin-1")

    df = pd.read_csv(io.StringIO(text))

    # Remove completely empty rows
    df = df.dropna(how="all").reset_index(drop=True)

    # Apply column mapping
    if column_mapping is None:
        column_mapping = auto_map_columns(list(df.columns))

    reverse_map = {v: k for k, v in column_mapping.items()}
    df = df.rename(columns=reverse_map)

    # Convert amount to numeric
    if "amount" in df.columns:
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce")

    # Parse dates
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    # Fill string columns
    for col in ["description", "category", "merchant", "transaction_type", "account"]:
        if col in df.columns:
            df[col] = df[col].fillna("").astype(str)

    return df
