"""Tests for DataManager and in-memory persistence."""

import pytest
import pandas as pd
from app.services.data_manager import DataManager
from app.schemas.schemas import ReviewStatus


@pytest.fixture
def fresh_data_manager():
    dm = DataManager()
    dm.clear()
    return dm


def test_store_and_retrieve_dataset(fresh_data_manager):
    df = pd.DataFrame({
        "amount": [10.0, 50.0, 100.0],
        "description": ["Item 1", "Item 2", "Item 3"],
    })
    dataset = fresh_data_manager.store_dataset(
        df=df,
        file_name="test.csv",
        column_mapping={"amount": "amount", "description": "description"},
        columns=["amount", "description"],
    )
    assert dataset.id in fresh_data_manager.datasets
    assert dataset.total_rows == 3
    assert len(fresh_data_manager.transactions[dataset.id]) == 3


def test_exclude_and_restore_transaction(fresh_data_manager):
    df = pd.DataFrame({"amount": [10.0, 20.0, 30.0]})
    dataset = fresh_data_manager.store_dataset(
        df=df,
        file_name="test.csv",
        column_mapping={"amount": "amount"},
        columns=["amount"],
    )
    txn_id = fresh_data_manager.transactions[dataset.id][0].id
    
    # Exclude
    updated = fresh_data_manager.update_transaction(
        dataset_id=dataset.id,
        transaction_id=txn_id,
        is_included=False,
        review_note="Test exclusion",
    )
    assert updated is not None
    assert updated.is_included is False
    assert len(fresh_data_manager.review_logs) > 0
    assert fresh_data_manager.review_logs[-1].action == "excluded"
    
    # Check filtered query
    active_txns, total = fresh_data_manager.get_transactions(dataset_id=dataset.id, filter_included=True)
    assert len(active_txns) == 2
    assert total == 2
    
    # Restore
    restored = fresh_data_manager.update_transaction(
        dataset_id=dataset.id,
        transaction_id=txn_id,
        is_included=True,
        review_note="Restored back",
    )
    assert restored is not None
    assert restored.is_included is True
    assert fresh_data_manager.review_logs[-1].action == "included"


def test_review_status_update(fresh_data_manager):
    df = pd.DataFrame({"amount": [10.0]})
    dataset = fresh_data_manager.store_dataset(
        df=df,
        file_name="test.csv",
        column_mapping={"amount": "amount"},
        columns=["amount"],
    )
    txn_id = fresh_data_manager.transactions[dataset.id][0].id
    
    updated = fresh_data_manager.update_transaction(
        dataset_id=dataset.id,
        transaction_id=txn_id,
        review_status=ReviewStatus.REVIEWED_SUSPICIOUS,
        review_note="Confirmed fraud pattern",
    )
    assert updated is not None
    assert updated.review_status == ReviewStatus.REVIEWED_SUSPICIOUS
    assert updated.review_note == "Confirmed fraud pattern"
    assert "reviewed as" in fresh_data_manager.review_logs[-1].action
