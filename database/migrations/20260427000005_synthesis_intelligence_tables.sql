-- Pi Data Synthesis Pipeline: ChefFlow-side tables
-- Receives synthesized intelligence from Pi's 24/7 data processing

-- Anomaly alerts (price spikes/drops classified by type)
CREATE TABLE IF NOT EXISTS openclaw.anomaly_alerts (
    id SERIAL PRIMARY KEY,
    pi_alert_id INTEGER,
    ingredient_name TEXT NOT NULL,
    category TEXT NOT NULL,
    severity INTEGER NOT NULL,
    direction TEXT NOT NULL,
    magnitude_pct NUMERIC NOT NULL,
    affected_stores JSONB,
    message TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_severity ON openclaw.anomaly_alerts(severity DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_expires ON openclaw.anomaly_alerts(expires_at);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_ingredient ON openclaw.anomaly_alerts(ingredient_name);

-- Seasonal intelligence scores
CREATE TABLE IF NOT EXISTS openclaw.seasonal_scores (
    id SERIAL PRIMARY KEY,
    ingredient_name TEXT NOT NULL,
    month INTEGER NOT NULL,
    availability_score NUMERIC,
    price_percentile NUMERIC,
    value_score NUMERIC,
    status TEXT,
    region TEXT DEFAULT 'northeast',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ingredient_name, month, region)
);
CREATE INDEX IF NOT EXISTS idx_seasonal_month_status ON openclaw.seasonal_scores(month, status);

-- Store rankings per ingredient
CREATE TABLE IF NOT EXISTS openclaw.store_rankings (
    id SERIAL PRIMARY KEY,
    ingredient_name TEXT NOT NULL,
    store_name TEXT NOT NULL,
    chain_slug TEXT,
    avg_price_cents INTEGER NOT NULL,
    vs_market_pct NUMERIC,
    rank INTEGER NOT NULL,
    sample_size INTEGER,
    category TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_rankings_ingredient ON openclaw.store_rankings(ingredient_name);
CREATE INDEX IF NOT EXISTS idx_store_rankings_rank ON openclaw.store_rankings(rank);

-- Price velocity / volatility per ingredient
CREATE TABLE IF NOT EXISTS openclaw.price_velocity (
    id SERIAL PRIMARY KEY,
    ingredient_name TEXT NOT NULL UNIQUE,
    stability_score INTEGER,
    status TEXT,
    trend_direction TEXT,
    volatility_30d NUMERIC,
    change_count_7d INTEGER,
    change_count_30d INTEGER,
    trend_acceleration NUMERIC,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_velocity_status ON openclaw.price_velocity(status);
CREATE INDEX IF NOT EXISTS idx_price_velocity_stability ON openclaw.price_velocity(stability_score);

-- Food recall alerts
CREATE TABLE IF NOT EXISTS openclaw.recall_alerts (
    id SERIAL PRIMARY KEY,
    ingredient_name TEXT NOT NULL,
    brand TEXT,
    severity TEXT NOT NULL,
    recall_class TEXT,
    reason TEXT NOT NULL,
    affected_products JSONB,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recall_severity ON openclaw.recall_alerts(severity);

-- Category cost benchmarks
CREATE TABLE IF NOT EXISTS openclaw.category_benchmarks (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL UNIQUE,
    median_price_cents INTEGER,
    p25_price_cents INTEGER,
    p75_price_cents INTEGER,
    trend_direction TEXT,
    trend_pct NUMERIC,
    vs_30d_pct NUMERIC,
    sample_size INTEGER,
    dinner_index_cents INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingredient substitutions
CREATE TABLE IF NOT EXISTS openclaw.substitutions (
    id SERIAL PRIMARY KEY,
    ingredient_name TEXT NOT NULL,
    substitute_name TEXT NOT NULL,
    category TEXT NOT NULL,
    price_delta_pct NUMERIC,
    seasonal_match BOOLEAN DEFAULT FALSE,
    confidence NUMERIC,
    reason TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_substitutions_ingredient ON openclaw.substitutions(ingredient_name);
CREATE INDEX IF NOT EXISTS idx_substitutions_confidence ON openclaw.substitutions(confidence DESC);

-- Local farmers markets (open this week)
CREATE TABLE IF NOT EXISTS openclaw.local_markets (
    id SERIAL PRIMARY KEY,
    market_name TEXT NOT NULL,
    lat NUMERIC,
    lng NUMERIC,
    open_season TEXT,
    open_days TEXT,
    product_count INTEGER,
    is_open_this_week BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_local_markets_open ON openclaw.local_markets(is_open_this_week);
CREATE INDEX IF NOT EXISTS idx_local_markets_geo ON openclaw.local_markets(lat, lng);
