"""API integration tests for SpendSense FastAPI routes."""

import pytest
import io
from fastapi.testclient import TestClient
from app.main import app
from app.services.data_manager import data_manager

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_store():
    data_manager.clear()
    yield
    data_manager.clear()


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "demo_mode" in data


def test_load_demo_data_endpoint():
    response = client.post("/api/demo/load")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "dataset_id" in data["data"]
    assert data["data"]["total_rows"] == 200


def test_validate_and_upload_dataset():
    rows = [
        "date,amount,description,category,merchant",
        "2026-01-01,150.00,Grocery Store,Food,Whole Foods",
        "2026-01-02,30.00,Subway,Dining,Subway",
        "2026-01-03,4500.00,MacBook Pro,Electronics,Apple Store",
        "2026-01-04,45.00,Gas Station,Transport,Shell",
        "2026-01-05,25.50,Cinema,Entertainment,AMC",
        "2026-01-06,85.00,Supermarket,Food,Trader Joes",
        "2026-01-07,15.00,Coffee,Dining,Starbucks",
        "2026-01-08,60.00,Pharmacy,Health,CVS",
        "2026-01-09,120.00,Clothing,Shopping,Zara",
        "2026-01-10,35.00,Bookstore,Education,Barnes and Noble",
        "2026-01-11,210.00,Hotel,Travel,Hilton",
        "2026-01-12,18.00,Fast Food,Dining,McDonalds",
        "2026-01-13,75.00,Hardware,Home,Home Depot",
        "2026-01-14,95.00,Streaming,Subscriptions,Netflix",
        "2026-01-15,40.00,Bakery,Food,Local Bakery",
    ]
    csv_content = "\n".join(rows).encode("utf-8")
    # 1. Validate
    files = {"file": ("test.csv", io.BytesIO(csv_content), "text/csv")}
    val_resp = client.post("/api/datasets/validate", files=files)
    assert val_resp.status_code == 200
    val_data = val_resp.json()
    assert val_data["is_valid"] is True
    assert val_data["total_rows"] == 15

    # 2. Upload
    files = {"file": ("test.csv", io.BytesIO(csv_content), "text/csv")}
    upload_resp = client.post("/api/datasets/upload", files=files)
    upload_data = upload_resp.json()
    assert upload_data["success"] is True
    dataset_id = upload_data["data"]["dataset_id"]
    assert upload_data["data"]["total_rows"] == 15

    # 3. Run Analysis
    analysis_resp = client.post(
        "/api/analysis/run",
        json={
            "dataset_id": dataset_id,
            "method": "isolation_forest",
            "contamination": 0.33,
            "n_estimators": 50,
        },
    )
    assert analysis_resp.status_code == 200
    analysis = analysis_resp.json()
    assert analysis["dataset_id"] == dataset_id
    assert analysis["total_transactions"] == 15
    assert analysis["status"] == "completed"

    # 4. Get Transactions
    txns_resp = client.get(f"/api/transactions/{dataset_id}")
    assert txns_resp.status_code == 200
    txns_data = txns_resp.json()
    assert len(txns_data["items"]) == 15
    first_txn_id = txns_data["items"][0]["id"]

    # 5. Update transaction review status
    update_resp = client.patch(
        f"/api/transactions/{dataset_id}/{first_txn_id}",
        json={"review_status": "reviewed_ok", "review_note": "Verified genuine"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["transaction"]["review_status"] == "reviewed_ok"

    # 6. Exclude transaction
    exclude_resp = client.patch(
        f"/api/transactions/{dataset_id}/{first_txn_id}",
        json={"is_included": False, "review_note": "Excluding from model"},
    )
    assert exclude_resp.status_code == 200
    assert exclude_resp.json()["transaction"]["is_included"] is False

    # 7. Check Dashboard Metrics
    dash_resp = client.get(f"/api/dashboard/{dataset_id}")
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert "metrics" in dash_data
    assert "category_breakdown" in dash_data

    # 8. Export Transactions CSV
    export_resp = client.get(f"/api/export/{dataset_id}/transactions?scope=all")
    assert export_resp.status_code == 200
    assert export_resp.headers["content-type"].startswith("text/csv")
    csv_text = export_resp.text
    assert "amount" in csv_text


def test_upload_invalid_csv_rejected():
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    resp = client.post("/api/datasets/validate", files=files)
    assert resp.status_code == 400
