"""Generate deterministic synthetic financial transaction data for demo mode."""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta


def generate_demo_transactions(n_transactions: int = 200, seed: int = 42) -> pd.DataFrame:
    """Generate realistic-looking financial transactions with some obvious anomalies.

    Uses a fixed random seed for deterministic output across restarts.
    """
    rng = np.random.RandomState(seed)

    categories = [
        "Groceries", "Dining", "Transportation", "Entertainment",
        "Shopping", "Utilities", "Healthcare", "Travel",
        "Subscription", "Education",
    ]
    merchants = {
        "Groceries": ["Whole Foods", "Trader Joe's", "Safeway", "Costco", "Walmart"],
        "Dining": ["Starbucks", "Chipotle", "McDonald's", "Olive Garden", "Local Bistro"],
        "Transportation": ["Uber", "Lyft", "Shell Gas", "Chevron", "Parking Meter"],
        "Entertainment": ["Netflix", "Spotify", "AMC Theaters", "Steam", "Concert Venue"],
        "Shopping": ["Amazon", "Target", "Nike", "Best Buy", "Apple Store"],
        "Utilities": ["Electric Co", "Water Dept", "Internet ISP", "Phone Carrier", "Gas Company"],
        "Healthcare": ["CVS Pharmacy", "Dr. Smith Office", "Hospital ER", "Dental Care", "Vision Center"],
        "Travel": ["United Airlines", "Marriott Hotel", "Airbnb", "Hertz Rental", "Booking.com"],
        "Subscription": ["Adobe CC", "Microsoft 365", "Gym Membership", "Cloud Storage", "News Sub"],
        "Education": ["Udemy", "Coursera", "Bookstore", "School Supply", "Tutor Service"],
    }
    transaction_types = ["debit", "credit"]

    # Normal transaction amount ranges per category
    amount_ranges = {
        "Groceries": (15, 150),
        "Dining": (8, 80),
        "Transportation": (5, 60),
        "Entertainment": (10, 50),
        "Shopping": (20, 200),
        "Utilities": (30, 200),
        "Healthcare": (20, 300),
        "Travel": (100, 800),
        "Subscription": (5, 50),
        "Education": (15, 200),
    }

    base_date = datetime(2024, 1, 1)
    records = []

    for i in range(n_transactions):
        cat = rng.choice(categories)
        merchant = rng.choice(merchants[cat])
        low, high = amount_ranges[cat]

        # Most transactions are normal
        if i < int(n_transactions * 0.9):
            amount = round(rng.uniform(low, high), 2)
        else:
            # ~10% are potential anomalies (unusually high amounts)
            anomaly_type = rng.choice(["high", "very_high", "negative"])
            if anomaly_type == "high":
                amount = round(rng.uniform(high * 2, high * 5), 2)
            elif anomaly_type == "very_high":
                amount = round(rng.uniform(high * 5, high * 15), 2)
            else:
                amount = round(-rng.uniform(low, high * 2), 2)

        # Random date within a year
        days_offset = rng.randint(0, 365)
        hours = rng.randint(6, 23)
        minutes = rng.randint(0, 59)
        txn_date = base_date + timedelta(days=days_offset, hours=hours, minutes=minutes)

        txn_type = "credit" if amount < 0 else rng.choice(transaction_types, p=[0.85, 0.15])

        records.append({
            "date": txn_date.strftime("%Y-%m-%d %H:%M:%S"),
            "amount": amount,
            "description": f"{merchant} - {cat}",
            "category": cat,
            "merchant": merchant,
            "transaction_type": txn_type,
            "account": rng.choice(["Checking", "Savings", "Credit Card"]),
        })

    df = pd.DataFrame(records)
    # Shuffle so anomalies aren't all at the end
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    return df
