-- SpendSense Database Schema
-- Migration: 001_initial_schema
-- Apply this migration to your Supabase project via the SQL Editor

-- ═══════════════════════════════════════════════════════════════════════════
-- Enable UUID generation
-- ═══════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
-- PROFILES
-- Extends Supabase auth.users with application-specific profile data
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- DATASETS
-- Represents an uploaded CSV file / dataset
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    invalid_rows INTEGER NOT NULL DEFAULT 0,
    columns JSONB NOT NULL DEFAULT '[]'::JSONB,
    column_mapping JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_datasets_user_id ON datasets(user_id);
CREATE INDEX idx_datasets_created_at ON datasets(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRANSACTIONS
-- Individual financial transactions with ML prediction and review state
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,

    -- Original transaction data
    date TIMESTAMPTZ,
    amount NUMERIC(15, 2),
    description TEXT,
    category TEXT,
    merchant TEXT,
    transaction_type TEXT,
    account TEXT,
    raw_data JSONB DEFAULT '{}'::JSONB,

    -- ML prediction (set by analysis, not user-editable)
    anomaly_score NUMERIC(10, 6),
    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,

    -- User review state (independent of ML prediction)
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'reviewed_ok', 'reviewed_suspicious', 'reviewed_false_positive')),
    review_note TEXT,
    reviewed_at TIMESTAMPTZ,

    -- Inclusion state (independent of anomaly and review)
    is_included BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_dataset_id ON transactions(dataset_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_is_anomaly ON transactions(dataset_id, is_anomaly);
CREATE INDEX idx_transactions_is_included ON transactions(dataset_id, is_included);
CREATE INDEX idx_transactions_review_status ON transactions(dataset_id, review_status);
CREATE INDEX idx_transactions_amount ON transactions(dataset_id, amount);
CREATE INDEX idx_transactions_date ON transactions(dataset_id, date);

-- ═══════════════════════════════════════════════════════════════════════════
-- ANALYSIS_RUNS
-- Records of each anomaly detection analysis execution
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS analysis_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    method TEXT NOT NULL CHECK (method IN ('isolation_forest', 'statistical_iqr', 'combined')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed')),

    total_transactions INTEGER NOT NULL DEFAULT 0,
    anomalies_detected INTEGER NOT NULL DEFAULT 0,
    anomaly_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,

    parameters_used JSONB DEFAULT '{}'::JSONB,
    features_used JSONB DEFAULT '[]'::JSONB,
    model_info JSONB DEFAULT '{}'::JSONB,

    error_message TEXT,

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analysis_runs_dataset_id ON analysis_runs(dataset_id);
CREATE INDEX idx_analysis_runs_user_id ON analysis_runs(user_id);
CREATE INDEX idx_analysis_runs_created_at ON analysis_runs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- REVIEW_LOGS
-- Audit trail for all review / exclude / restore actions
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS review_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    action TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    note TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_logs_transaction_id ON review_logs(transaction_id);
CREATE INDEX idx_review_logs_user_id ON review_logs(user_id);
CREATE INDEX idx_review_logs_created_at ON review_logs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Each user can only access their own data
-- ═══════════════════════════════════════════════════════════════════════════

-- Profiles: users can only read/update their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Datasets: users can only access their own datasets
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own datasets"
    ON datasets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own datasets"
    ON datasets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own datasets"
    ON datasets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own datasets"
    ON datasets FOR DELETE
    USING (auth.uid() = user_id);

-- Transactions: users can only access their own transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
    ON transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
    ON transactions FOR DELETE
    USING (auth.uid() = user_id);

-- Analysis runs: users can only access their own analysis runs
ALTER TABLE analysis_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis runs"
    ON analysis_runs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis runs"
    ON analysis_runs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Review logs: users can only access their own review logs
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own review logs"
    ON review_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own review logs"
    ON review_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Updated-at trigger function
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at
    BEFORE UPDATE ON datasets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
