#!/usr/bin/env python3
"""Generate sample financial transaction datasets for SpendSense testing."""

import os
import random
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_data")
os.makedirs(OUTPUT_DIR, exist_ok=True)

CATEGORIES = {
    "Groceries": {
        "merchants": ["Whole Foods", "Trader Joe's", "Kroger", "Safeway", "ALDI", "Costco"],
        "min": 15.0, "max": 250.0, "mean": 65.0, "std": 30.0,
    },
    "Dining": {
        "merchants": ["Starbucks", "Chipotle", "Sweetgreen", "Shake Shack", "Olive Garden", "Local Bistro"],
        "min": 4.5, "max": 120.0, "mean": 24.0, "std": 18.0,
    },
    "Transportation": {
        "merchants": ["Uber", "Lyft", "Shell Gas", "Chevron", "MTA Metro", "Amtrak"],
        "min": 3.0, "max": 95.0, "mean": 32.0, "std": 15.0,
    },
    "Utilities": {
        "merchants": ["ConEd Electric", "City Water & Power", "National Grid Gas", "Verizon Wireless", "AT&T"],
        "min": 45.0, "max": 220.0, "mean": 110.0, "std": 35.0,
    },
    "Entertainment": {
        "merchants": ["Netflix", "Spotify", "AMC Theatres", "Steam Games", "Nintendo eShop", "Ticketmaster"],
        "min": 10.0, "max": 180.0, "mean": 35.0, "std": 25.0,
    },
    "Shopping": {
        "merchants": ["Amazon", "Target", "Walmart", "Best Buy", "Apple Store", "Nike"],
        "min": 12.0, "max": 450.0, "mean": 85.0, "std": 60.0,
    },
    "Health & Fitness": {
        "merchants": ["CVS Pharmacy", "Walgreens", "Planet Fitness", "Equinox", "Quest Diagnostics"],
        "min": 15.0, "max": 250.0, "mean": 55.0, "std": 40.0,
    },
}

ACCOUNTS = ["Checking ...4910", "Credit Card ...8832", "Savings ...1029", "Sapphire ...9104"]


def generate_dataset(n_rows: int = 500, anomaly_rate: float = 0.05, seed: int = 42) -> pd.DataFrame:
    random.seed(seed)
    np.random.seed(seed)

    start_date = datetime(2026, 1, 1, 8, 0, 0)
    rows = []

    cat_keys = list(CATEGORIES.keys())
    n_anomalies = int(n_rows * anomaly_rate)
    n_normal = n_rows - n_anomalies

    # Normal transactions
    for i in range(n_normal):
        cat = random.choice(cat_keys)
        info = CATEGORIES[cat]
        merchant = random.choice(info["merchants"])
        amount = round(float(np.clip(np.random.normal(info["mean"], info["std"]), info["min"], info["max"])), 2)
        txn_date = start_date + timedelta(
            days=random.randint(0, 90),
            hours=random.randint(7, 22),
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59),
        )
        account = random.choice(ACCOUNTS)
        txn_type = "Debit" if amount < 300 else "Credit"
        desc = f"Purchase at {merchant}"

        rows.append({
            "date": txn_date.strftime("%Y-%m-%d %H:%M:%S"),
            "amount": amount,
            "description": desc,
            "category": cat,
            "merchant": merchant,
            "transaction_type": txn_type,
            "account": account,
        })

    # Anomaly transactions
    anomaly_types = [
        "extreme_amount",
        "unusual_hour",
        "micro_transaction_burst",
        "category_spike",
        "round_number_wire",
    ]

    for i in range(n_anomalies):
        atype = random.choice(anomaly_types)
        cat = random.choice(cat_keys)
        info = CATEGORIES[cat]
        merchant = random.choice(info["merchants"])
        account = random.choice(ACCOUNTS)

        if atype == "extreme_amount":
            amount = round(float(random.uniform(3500.0, 15000.0)), 2)
            txn_date = start_date + timedelta(days=random.randint(0, 90), hours=random.randint(10, 18))
            desc = f"Large authorization - {merchant}"
            txn_type = "Debit"
        elif atype == "unusual_hour":
            amount = round(float(random.uniform(400.0, 1200.0)), 2)
            txn_date = start_date + timedelta(days=random.randint(0, 90), hours=random.choice([2, 3, 4]))
            desc = f"Late-night transaction - {merchant}"
            txn_type = "Debit"
        elif atype == "round_number_wire":
            amount = float(random.choice([5000.0, 7500.0, 10000.0, 20000.0]))
            txn_date = start_date + timedelta(days=random.randint(0, 90), hours=14)
            desc = f"External wire transfer - {merchant}"
            txn_type = "Wire"
        else:
            amount = round(float(info["max"] * random.uniform(3.0, 7.0)), 2)
            txn_date = start_date + timedelta(days=random.randint(0, 90), hours=random.randint(9, 20))
            desc = f"Unusual spend volume - {merchant}"
            txn_type = "Debit"

        rows.append({
            "date": txn_date.strftime("%Y-%m-%d %H:%M:%S"),
            "amount": amount,
            "description": desc,
            "category": cat,
            "merchant": merchant,
            "transaction_type": txn_type,
            "account": account,
        })

    df = pd.DataFrame(rows)
    df = df.sort_values("date").reset_index(drop=True)
    return df


def main():
    print("Generating sample financial transaction datasets...")

    # 1. Standard benchmark dataset (500 rows, 5% anomalies)
    df_std = generate_dataset(500, anomaly_rate=0.05, seed=42)
    path_std = os.path.join(OUTPUT_DIR, "transactions_standard_500.csv")
    df_std.to_csv(path_std, index=False)
    print(f"Created: {path_std} ({len(df_std)} rows)")

    # 2. High anomaly dataset (1000 rows, 12% anomalies)
    df_high = generate_dataset(1000, anomaly_rate=0.12, seed=101)
    path_high = os.path.join(OUTPUT_DIR, "transactions_high_anomaly_1000.csv")
    df_high.to_csv(path_high, index=False)
    print(f"Created: {path_high} ({len(df_high)} rows)")

    # 3. Clean low anomaly dataset (250 rows, 2% anomalies)
    df_clean = generate_dataset(250, anomaly_rate=0.02, seed=202)
    path_clean = os.path.join(OUTPUT_DIR, "transactions_clean_250.csv")
    df_clean.to_csv(path_clean, index=False)
    print(f"Created: {path_clean} ({len(df_clean)} rows)")

    print("All sample datasets generated successfully!")


if __name__ == "__main__":
    main()
