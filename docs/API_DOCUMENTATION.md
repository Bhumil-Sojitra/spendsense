# SpendSense AI — REST API Documentation

The SpendSense AI backend exposes a RESTful API powered by FastAPI.
Interactive OpenAPI docs are accessible at `http://localhost:8000/docs` and Redoc at `http://localhost:8000/redoc`.

All API endpoints are prefixed with `/api`.

---

## 1. System Endpoints

### `GET /api/health`
Checks server health, version, and database connectivity.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "development",
  "supabase_connected": false,
  "demo_mode": true
}
```

---

## 2. Demo Data

### `POST /api/demo/load`
Generates and loads a deterministic synthetic dataset of 200 transactions.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Loaded 200 demo transactions. Data is stored in-memory and will be lost on restart.",
  "data": {
    "dataset_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "total_rows": 200
  }
}
```

---

## 3. Dataset Management

### `POST /api/datasets/validate`
Validates a CSV file and suggests standard column mappings without persisting.

- **Content-Type**: `multipart/form-data`
- **Body**: `file` (CSV file)

**Response (200 OK):**
```json
{
  "is_valid": true,
  "total_rows": 500,
  "valid_rows": 500,
  "invalid_rows": 0,
  "columns_found": ["date", "amount", "description", "category", "merchant"],
  "columns_mapped": {
    "date": "date",
    "amount": "amount",
    "description": "description",
    "category": "category",
    "merchant": "merchant"
  },
  "errors": [],
  "warnings": [],
  "preview_rows": [...]
}
```

### `POST /api/datasets/upload`
Uploads and stores a CSV dataset.

- **Content-Type**: `multipart/form-data`
- **Body**: `file` (CSV file)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Dataset 'transactions.csv' uploaded successfully with 500 transactions.",
  "data": {
    "dataset_id": "uuid-string",
    "total_rows": 500,
    "columns_mapped": {...},
    "warnings": []
  }
}
```

### `GET /api/datasets`
Lists all available datasets.

---

## 4. Anomaly Detection Analysis

### `POST /api/analysis/run`
Runs machine learning anomaly detection on a dataset.

**Request Body:**
```json
{
  "dataset_id": "uuid-string",
  "method": "isolation_forest",
  "contamination": 0.1,
  "n_estimators": 100,
  "iqr_multiplier": 1.5
}
```

**Supported Methods**:
- `"isolation_forest"`
- `"statistical_iqr"`
- `"combined"`

**Response (200 OK):**
```json
{
  "id": "analysis-uuid",
  "dataset_id": "dataset-uuid",
  "method": "isolation_forest",
  "status": "completed",
  "total_transactions": 500,
  "anomalies_detected": 42,
  "anomaly_percentage": 8.4,
  "parameters_used": {
    "contamination": 0.1,
    "n_estimators": 100,
    "iqr_multiplier": 1.5
  },
  "features_used": ["amount", "amount_abs", "amount_log", "amount_zscore", "day_of_week"],
  "model_info": {...},
  "started_at": "2026-10-16T12:00:00Z",
  "completed_at": "2026-10-16T12:00:01Z"
}
```

---

## 5. Transactions

### `GET /api/transactions/{dataset_id}`
Returns paginated, searchable, sorted transactions.

**Query Parameters:**
- `page` (default 1)
- `page_size` (default 50, max 200)
- `sort_by` (e.g. `amount`, `anomaly_score`, `date`)
- `sort_order` (`asc` | `desc`)
- `is_anomaly` (`true` | `false`)
- `is_included` (`true` | `false`)
- `review_status` (`pending` | `reviewed_ok` | `reviewed_suspicious` | `reviewed_false_positive`)
- `search` (text query on merchant, description, category)

### `PATCH /api/transactions/{dataset_id}/{transaction_id}`
Updates review status, inclusion flag, and notes for an individual transaction.

**Request Body:**
```json
{
  "is_included": false,
  "review_status": "reviewed_suspicious",
  "review_note": "Suspicious midnight authorization"
}
```

---

## 6. Dashboard & Metrics

### `GET /api/dashboard/{dataset_id}`
Retrieves precalculated analytics and chart datasets for a dataset.

**Response Structure:**
- `metrics`: Total spend, anomaly count, anomaly volume, review progress percentage.
- `amount_distribution`: Normal vs anomalous amount histogram buckets.
- `category_breakdown`: Category spending breakdown and anomaly frequencies.
- `time_series`: Chronological spending trend with anomaly indicators.
- `recent_anomalies`: Top flagged transactions.

---

## 7. Exports

### `GET /api/export/{dataset_id}/transactions?scope={scope}`
Streams a formatted CSV download.
- Scope options: `all`, `included`, `excluded`, `flagged`.

### `GET /api/export/{dataset_id}/reviews`
Streams the audit history log of all reviewer adjustments as a CSV.
