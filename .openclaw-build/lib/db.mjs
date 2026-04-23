/**
 * OpenClaw Price Intelligence - Database Layer
 * SQLite database for current prices, change log, and source registry.
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DEFAULT_DB_PATH = join(DATA_DIR, 'prices.db');
const DB_PATH = process.env.OPENCLAW_DB_PATH || DEFAULT_DB_PATH;
const GOVERNANCE_SLICE_KEY = 'machine-readable-slice-registry-kpi-gate';
const GOVERNANCE_KPI_KEY = `${GOVERNANCE_SLICE_KEY}:registry_gate_readiness_rate`;
const SLICE_STATUSES = new Set([
  'planned',
  'ready',
  'in_progress',
  'paused',
  'completed',
  'archived',
]);
const GATED_SLICE_STATUSES = new Set(['ready', 'in_progress']);
const OWNER_CLASSIFICATIONS = new Set([
  'runtime-owned',
  'bridge-owned',
  'host-owned',
  'handshake-owned',
]);
const CALIBRATION_STATUSES = new Set(['pending', 'provisional', 'locked']);
const KPI_DIRECTIONS = new Set(['maximize', 'minimize']);
const KPI_LAG_TYPES = new Set(['leading', 'lagging']);
const AGENT_TYPES = new Set([
  'orchestrator',
  'discovery',
  'repair',
  'enrichment',
  'nutrition',
  'quality',
  'math',
  'coverage',
  'capacity',
  'goal_governor',
  'meta',
]);
const AGENT_RUN_STATUSES = new Set(['queued', 'running', 'succeeded', 'failed', 'partial', 'skipped']);
const AGENT_TASK_TYPES = new Set([
  'discover_source',
  'crawl_source',
  'repair_source',
  'infer_price',
  'recompute_cell',
  'verify_source',
  'verify_pingability',
  'enrich_metadata',
  'refresh_nutrition',
  'audit_quality',
  'recompute_metadata_heatmap',
  'sample_capacity',
  'rebalance_parallelism',
  'evaluate_kpi_drift',
  'recompute_goal_scorecard',
  'reprioritize_for_goal_alignment',
]);
const AGENT_TASK_STATUSES = new Set([
  'queued',
  'claimed',
  'running',
  'succeeded',
  'failed',
  'dead_letter',
  'skipped',
]);
const ACTIVE_AGENT_TASK_STATUSES = new Set(['queued', 'claimed', 'running']);
const LEASED_AGENT_TASK_STATUSES = new Set(['claimed', 'running']);
const INCIDENT_TYPES = new Set([
  'stale',
  'http',
  'schema',
  'auth',
  'empty',
  'quality',
  'anomaly',
  'metadata',
  'reliability',
]);
const INCIDENT_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const INCIDENT_STATUSES = new Set(['open', 'suppressed', 'resolved']);
const INCIDENT_TRUTH_LABELS = new Set(['observed', 'inferred', 'derived']);
const INFERENCE_GEOGRAPHY_TYPES = new Set(['zip', 'metro', 'state', 'region', 'national']);
const INFERENCE_METHODS = new Set([
  'regional_baseline',
  'nearest_neighbor',
  'chain_blend',
  'seasonal_adjustment',
  'hybrid_math',
]);
const INFERENCE_AUDIT_STATES = new Set(['active', 'expired', 'invalidated', 'all']);

// Ensure data directory exists
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(dirname(DB_PATH), { recursive: true });

let _db = null;

export function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  initSchema(_db);
  migrateSchema(_db);
  seedGoalGovernorDefaults(_db);
  seedRuntimeControlDefaults(_db);
  seedInferenceCacheDefaults(_db);
  return _db;
}

export function closeDb() {
  if (!_db) return;
  _db.close();
  _db = null;
}

function initSchema(db) {
  db.exec(`
    -- Source Registry: every place that sells food
    CREATE TABLE IF NOT EXISTS source_registry (
      source_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      chain_id TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      lat REAL,
      lon REAL,
      website TEXT,
      phone TEXT,
      scrape_method TEXT NOT NULL DEFAULT 'none',
      scrape_url TEXT,
      has_online_pricing INTEGER DEFAULT 0,
      pricing_tier TEXT NOT NULL DEFAULT 'retail',
      loyalty_card_available INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      discovery_source TEXT,
      last_scraped_at TEXT,
      last_discovery_check_at TEXT,
      scrape_interval_days INTEGER DEFAULT 4,
      scrape_failures_consecutive INTEGER DEFAULT 0,
      instacart_markup_pct REAL,
      notes TEXT,
      rate_limit_backoff_until TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Canonical Ingredients: the master list
    CREATE TABLE IF NOT EXISTS canonical_ingredients (
      ingredient_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      standard_unit TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Ingredient Variants
    CREATE TABLE IF NOT EXISTS ingredient_variants (
      variant_id TEXT PRIMARY KEY,
      ingredient_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      FOREIGN KEY (ingredient_id) REFERENCES canonical_ingredients(ingredient_id)
    );

    -- Current Snapshot: latest known price per product per source
    CREATE TABLE IF NOT EXISTS current_prices (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      canonical_ingredient_id TEXT NOT NULL,
      variant_id TEXT,
      raw_product_name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      price_unit TEXT NOT NULL,
      price_per_standard_unit_cents INTEGER,
      standard_unit TEXT,
      package_size TEXT,
      price_type TEXT NOT NULL DEFAULT 'regular',
      sale_start_date TEXT,
      sale_end_date TEXT,
      pricing_tier TEXT NOT NULL DEFAULT 'retail',
      confidence TEXT NOT NULL DEFAULT 'government_baseline',
      instacart_markup_applied_pct REAL,
      source_url TEXT,
      in_stock INTEGER NOT NULL DEFAULT 1,
      last_confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (source_id) REFERENCES source_registry(source_id),
      FOREIGN KEY (canonical_ingredient_id) REFERENCES canonical_ingredients(ingredient_id)
    );

    CREATE INDEX IF NOT EXISTS idx_cp_ingredient ON current_prices(canonical_ingredient_id);
    CREATE INDEX IF NOT EXISTS idx_cp_source ON current_prices(source_id);
    CREATE INDEX IF NOT EXISTS idx_cp_tier ON current_prices(pricing_tier);

    -- Change Log: records only actual price changes
    CREATE TABLE IF NOT EXISTS price_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      canonical_ingredient_id TEXT NOT NULL,
      variant_id TEXT,
      old_price_cents INTEGER,
      new_price_cents INTEGER NOT NULL,
      price_unit TEXT NOT NULL,
      price_type TEXT NOT NULL DEFAULT 'regular',
      pricing_tier TEXT NOT NULL DEFAULT 'retail',
      change_pct REAL,
      observed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_pc_ingredient_date ON price_changes(canonical_ingredient_id, observed_at);
    CREATE INDEX IF NOT EXISTS idx_pc_source_date ON price_changes(source_id, observed_at);

    -- Normalization mappings: cached rule + model results
    CREATE TABLE IF NOT EXISTS normalization_map (
      raw_name TEXT PRIMARY KEY,
      canonical_ingredient_id TEXT NOT NULL,
      variant_id TEXT,
      method TEXT NOT NULL,
      confidence REAL DEFAULT 1.0,
      confirmed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (canonical_ingredient_id) REFERENCES canonical_ingredients(ingredient_id)
    );

    -- Runtime Slice Registry: machine-readable control-plane slices
    CREATE TABLE IF NOT EXISTS slice_registry (
      slice_key TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      objective TEXT NOT NULL,
      owner_classification TEXT NOT NULL
        CHECK (owner_classification IN ('runtime-owned', 'bridge-owned', 'host-owned', 'handshake-owned')),
      status TEXT NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned', 'ready', 'in_progress', 'paused', 'completed', 'archived')),
      files_json TEXT NOT NULL DEFAULT '[]',
      schema_changes_json TEXT NOT NULL DEFAULT '[]',
      invariants_json TEXT NOT NULL DEFAULT '[]',
      non_goals_json TEXT NOT NULL DEFAULT '[]',
      baseline_plan TEXT,
      minimum_sample_size INTEGER,
      calibration_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (calibration_status IN ('pending', 'provisional', 'locked')),
      gate_status TEXT NOT NULL DEFAULT 'blocked'
        CHECK (gate_status IN ('ready', 'blocked')),
      gate_blockers_json TEXT NOT NULL DEFAULT '[]',
      last_gate_evaluated_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_slice_registry_status
      ON slice_registry(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_slice_registry_gate_status
      ON slice_registry(gate_status, updated_at DESC);

    -- KPI contracts: one or more metrics per registered runtime slice
    CREATE TABLE IF NOT EXISTS kpi_contracts (
      kpi_key TEXT PRIMARY KEY,
      slice_key TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      why_it_matters TEXT NOT NULL,
      formula TEXT NOT NULL,
      goal_direction TEXT NOT NULL
        CHECK (goal_direction IN ('maximize', 'minimize')),
      target_value REAL NOT NULL,
      warning_threshold REAL NOT NULL,
      failure_threshold REAL NOT NULL,
      measurement_window TEXT NOT NULL,
      data_source TEXT NOT NULL,
      owner TEXT NOT NULL,
      review_cadence TEXT NOT NULL,
      slice_phase TEXT NOT NULL,
      leading_or_lagging TEXT NOT NULL
        CHECK (leading_or_lagging IN ('leading', 'lagging')),
      baseline_value REAL,
      baseline_window TEXT,
      minimum_sample_size INTEGER NOT NULL,
      calibration_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (calibration_status IN ('pending', 'provisional', 'locked')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (slice_key) REFERENCES slice_registry(slice_key) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_kpi_contracts_slice
      ON kpi_contracts(slice_key, metric_name);

    CREATE TABLE IF NOT EXISTS agent_runs (
      run_id TEXT PRIMARY KEY,
      agent_type TEXT NOT NULL
        CHECK (agent_type IN ('orchestrator', 'discovery', 'repair', 'enrichment', 'nutrition', 'quality', 'math', 'coverage', 'capacity', 'goal_governor', 'meta')),
      status TEXT NOT NULL
        CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'partial', 'skipped')),
      queue_name TEXT NOT NULL DEFAULT 'default',
      started_at TEXT,
      finished_at TEXT,
      duration_ms INTEGER,
      parent_run_id TEXT,
      host_name TEXT,
      heartbeat_at TEXT,
      lease_expires_at TEXT,
      input_json TEXT,
      output_json TEXT,
      error_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_agent_runs_type_started
      ON agent_runs(agent_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_status
      ON agent_runs(status);

    CREATE TABLE IF NOT EXISTS agent_tasks (
      task_id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL
        CHECK (task_type IN ('discover_source', 'crawl_source', 'repair_source', 'infer_price', 'recompute_cell', 'verify_source', 'verify_pingability', 'enrich_metadata', 'refresh_nutrition', 'audit_quality', 'recompute_metadata_heatmap', 'sample_capacity', 'rebalance_parallelism', 'evaluate_kpi_drift', 'recompute_goal_scorecard', 'reprioritize_for_goal_alignment')),
      preferred_agent_type TEXT NOT NULL
        CHECK (preferred_agent_type IN ('discovery', 'repair', 'enrichment', 'nutrition', 'quality', 'math', 'coverage', 'capacity', 'goal_governor', 'meta', 'orchestrator')),
      queue_name TEXT NOT NULL DEFAULT 'default',
      status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'claimed', 'running', 'succeeded', 'failed', 'dead_letter', 'skipped')),
      priority INTEGER NOT NULL DEFAULT 50
        CHECK (priority BETWEEN 0 AND 100),
      pool_slots INTEGER NOT NULL DEFAULT 1,
      source_id TEXT,
      cell_id TEXT,
      canonical_ingredient_id TEXT,
      dedupe_key TEXT,
      payload_json TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      claimed_by_run_id TEXT,
      heartbeat_at TEXT,
      lease_expires_at TEXT,
      next_attempt_at TEXT,
      not_before TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_agent_tasks_status_priority
      ON agent_tasks(status, priority DESC, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_agent_tasks_source
      ON agent_tasks(source_id);
    CREATE INDEX IF NOT EXISTS idx_agent_tasks_cell
      ON agent_tasks(cell_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_tasks_active_dedupe
      ON agent_tasks(dedupe_key)
      WHERE dedupe_key IS NOT NULL
        AND status IN ('queued', 'claimed', 'running');

    CREATE TABLE IF NOT EXISTS source_incidents (
      incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      incident_type TEXT NOT NULL
        CHECK (incident_type IN ('stale', 'http', 'schema', 'auth', 'empty', 'quality', 'anomaly', 'metadata', 'reliability')),
      severity TEXT NOT NULL
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'suppressed', 'resolved')),
      summary TEXT NOT NULL,
      evidence_json TEXT,
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      opened_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_source_incidents_source
      ON source_incidents(source_id, status);
    CREATE INDEX IF NOT EXISTS idx_source_incidents_opened
      ON source_incidents(opened_at DESC);

    CREATE TABLE IF NOT EXISTS price_inference_cache (
      cache_id TEXT PRIMARY KEY,
      canonical_ingredient_id TEXT NOT NULL,
      geography_type TEXT NOT NULL
        CHECK (geography_type IN ('zip', 'metro', 'state', 'region', 'national')),
      geography_key TEXT NOT NULL,
      pricing_tier TEXT NOT NULL DEFAULT 'retail',
      price_cents INTEGER NOT NULL,
      price_unit TEXT NOT NULL,
      confidence REAL NOT NULL
        CHECK (confidence >= 0 AND confidence <= 1),
      method TEXT NOT NULL
        CHECK (method IN ('regional_baseline', 'nearest_neighbor', 'chain_blend', 'seasonal_adjustment', 'hybrid_math')),
      based_on_direct_count INTEGER NOT NULL DEFAULT 0,
      based_on_region TEXT,
      model_version TEXT NOT NULL,
      evidence_json TEXT NOT NULL DEFAULT '[]',
      computed_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      invalidated_at TEXT,
      invalidation_reason TEXT,
      UNIQUE (canonical_ingredient_id, geography_type, geography_key, pricing_tier, price_unit)
    );

    CREATE INDEX IF NOT EXISTS idx_price_inference_lookup
      ON price_inference_cache(canonical_ingredient_id, geography_type, geography_key, pricing_tier);
    CREATE INDEX IF NOT EXISTS idx_price_inference_expires
      ON price_inference_cache(expires_at);
    CREATE INDEX IF NOT EXISTS idx_price_inference_invalidated
      ON price_inference_cache(invalidated_at);
  `);
}

/**
 * Additive migrations for existing databases.
 * Each migration checks before applying (safe to re-run).
 */
function migrateSchema(db) {
  // Add in_stock column if it doesn't exist yet
  const cols = db.prepare("PRAGMA table_info(current_prices)").all();
  const colNames = new Set(cols.map(c => c.name));

  if (!colNames.has('in_stock')) {
    db.exec("ALTER TABLE current_prices ADD COLUMN in_stock INTEGER NOT NULL DEFAULT 1");
    db.exec("CREATE INDEX IF NOT EXISTS idx_cp_stock ON current_prices(in_stock)");
  }

  // Composite index for stock count queries (chef catalog)
  const idxCheck = db.prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_cp_ingredient_stock'").get();
  if (!idxCheck) {
    db.exec("CREATE INDEX idx_cp_ingredient_stock ON current_prices(canonical_ingredient_id, in_stock)");
  }

  // Phase 1: Total Catalog Intelligence - new columns for current_prices
  if (!colNames.has('image_url')) {
    db.exec("ALTER TABLE current_prices ADD COLUMN image_url TEXT");
  }
  if (!colNames.has('brand')) {
    db.exec("ALTER TABLE current_prices ADD COLUMN brand TEXT");
  }
  if (!colNames.has('aisle_category')) {
    db.exec("ALTER TABLE current_prices ADD COLUMN aisle_category TEXT");
  }

  // Phase 1: source_registry new columns
  const srcCols = db.prepare("PRAGMA table_info(source_registry)").all();
  const srcColNames = new Set(srcCols.map(c => c.name));

  if (!srcColNames.has('logo_url')) {
    db.exec("ALTER TABLE source_registry ADD COLUMN logo_url TEXT");
  }
  if (!srcColNames.has('store_color')) {
    db.exec("ALTER TABLE source_registry ADD COLUMN store_color TEXT");
  }
  if (!srcColNames.has('region')) {
    db.exec("ALTER TABLE source_registry ADD COLUMN region TEXT");
  }
  if (!srcColNames.has('rate_limit_backoff_until')) {
    db.exec("ALTER TABLE source_registry ADD COLUMN rate_limit_backoff_until TEXT");
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => normalizeText(item)).filter(Boolean))];
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeArray(value) {
  return JSON.stringify(normalizeStringArray(value));
}

function parseJsonValue(value, fallback = null) {
  try {
    const parsed = JSON.parse(value ?? 'null');
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function serializeJsonValue(value) {
  return JSON.stringify(value ?? null);
}

function optionalText(value) {
  const text = normalizeText(value);
  return text || null;
}

function cloneJsonValue(value, fieldName) {
  if (value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    throw new Error(`${fieldName} must be JSON-serializable`);
  }
}

function normalizeInteger(value, fieldName, options = {}) {
  const {
    minimum = Number.NEGATIVE_INFINITY,
    maximum = Number.POSITIVE_INFINITY,
    allowNull = true,
    defaultValue = null,
  } = options;

  if (value === undefined || value === null || value === '') {
    if (!allowNull && defaultValue === null) {
      throw new Error(`${fieldName} is required`);
    }
    return defaultValue;
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${fieldName} must be an integer between ${minimum} and ${maximum}`);
  }

  return number;
}

function normalizeIsoTimestamp(value, fieldName) {
  const text = normalizeText(value);
  if (!text) return null;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO timestamp`);
  }

  return date.toISOString();
}

function getNowIso(now) {
  return normalizeIsoTimestamp(now, 'now') || new Date().toISOString();
}

function addSeconds(isoTimestamp, seconds) {
  return new Date(new Date(isoTimestamp).getTime() + (seconds * 1000)).toISOString();
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function normalizeSliceInput(input = {}) {
  const status = normalizeText(input.status) || 'planned';
  const ownerClassification = normalizeText(input.ownerClassification);
  const calibrationStatus = normalizeText(input.calibrationStatus) || 'pending';
  const minimumSampleSize =
    input.minimumSampleSize === null || input.minimumSampleSize === undefined
      ? null
      : Number(input.minimumSampleSize);

  if (!SLICE_STATUSES.has(status)) {
    throw new Error(`Invalid slice status: ${status || '(empty)'}`);
  }

  if (!OWNER_CLASSIFICATIONS.has(ownerClassification)) {
    throw new Error(`Invalid owner classification: ${ownerClassification || '(empty)'}`);
  }

  if (!CALIBRATION_STATUSES.has(calibrationStatus)) {
    throw new Error(`Invalid calibration status: ${calibrationStatus || '(empty)'}`);
  }

  if (minimumSampleSize !== null && (!Number.isFinite(minimumSampleSize) || minimumSampleSize <= 0)) {
    throw new Error('minimumSampleSize must be a positive number when provided');
  }

  const sliceKey = normalizeText(input.sliceKey);
  const displayName = normalizeText(input.displayName);
  const objective = normalizeText(input.objective);

  if (!sliceKey) throw new Error('sliceKey is required');
  if (!displayName) throw new Error('displayName is required');
  if (!objective) throw new Error('objective is required');

  return {
    sliceKey,
    displayName,
    objective,
    ownerClassification,
    status,
    files: normalizeStringArray(input.files),
    schemaChanges: normalizeStringArray(input.schemaChanges),
    invariants: normalizeStringArray(input.invariants),
    nonGoals: normalizeStringArray(input.nonGoals),
    baselinePlan: normalizeText(input.baselinePlan) || null,
    minimumSampleSize,
    calibrationStatus,
  };
}

function normalizeKpiInput(input = {}) {
  const sliceKey = normalizeText(input.sliceKey);
  const metricName = normalizeText(input.metricName);
  const whyItMatters = normalizeText(input.whyItMatters);
  const formula = normalizeText(input.formula);
  const goalDirection = normalizeText(input.goalDirection);
  const measurementWindow = normalizeText(input.measurementWindow);
  const dataSource = normalizeText(input.dataSource);
  const owner = normalizeText(input.owner);
  const reviewCadence = normalizeText(input.reviewCadence);
  const slicePhase = normalizeText(input.slicePhase);
  const leadingOrLagging = normalizeText(input.leadingOrLagging);
  const calibrationStatus = normalizeText(input.calibrationStatus) || 'pending';

  if (!sliceKey) throw new Error('sliceKey is required for KPI contracts');
  if (!metricName) throw new Error('metricName is required');
  if (!whyItMatters) throw new Error('whyItMatters is required');
  if (!formula) throw new Error('formula is required');
  if (!KPI_DIRECTIONS.has(goalDirection)) {
    throw new Error('goalDirection must be "maximize" or "minimize"');
  }
  if (!measurementWindow) throw new Error('measurementWindow is required');
  if (!dataSource) throw new Error('dataSource is required');
  if (!owner) throw new Error('owner is required');
  if (!reviewCadence) throw new Error('reviewCadence is required');
  if (!slicePhase) throw new Error('slicePhase is required');
  if (!KPI_LAG_TYPES.has(leadingOrLagging)) {
    throw new Error('leadingOrLagging must be "leading" or "lagging"');
  }
  if (!CALIBRATION_STATUSES.has(calibrationStatus)) {
    throw new Error(`Invalid KPI calibration status: ${calibrationStatus || '(empty)'}`);
  }

  const targetValue = Number(input.targetValue);
  const warningThreshold = Number(input.warningThreshold);
  const failureThreshold = Number(input.failureThreshold);
  const minimumSampleSize = Number(input.minimumSampleSize);
  const baselineValue =
    input.baselineValue === null || input.baselineValue === undefined
      ? null
      : Number(input.baselineValue);
  const baselineWindow = normalizeText(input.baselineWindow) || null;

  if (!Number.isFinite(targetValue)) throw new Error('targetValue must be a finite number');
  if (!Number.isFinite(warningThreshold)) {
    throw new Error('warningThreshold must be a finite number');
  }
  if (!Number.isFinite(failureThreshold)) {
    throw new Error('failureThreshold must be a finite number');
  }
  if (!Number.isFinite(minimumSampleSize) || minimumSampleSize <= 0) {
    throw new Error('minimumSampleSize must be a positive number');
  }

  if (goalDirection === 'maximize') {
    if (!(failureThreshold < warningThreshold && warningThreshold < targetValue)) {
      throw new Error(
        'For maximize KPIs, failureThreshold < warningThreshold < targetValue is required'
      );
    }
  } else if (!(targetValue < warningThreshold && warningThreshold < failureThreshold)) {
    throw new Error(
      'For minimize KPIs, targetValue < warningThreshold < failureThreshold is required'
    );
  }

  if (calibrationStatus !== 'pending') {
    if (baselineValue === null || !Number.isFinite(baselineValue)) {
      throw new Error('baselineValue is required once calibrationStatus is provisional or locked');
    }
    if (!baselineWindow) {
      throw new Error('baselineWindow is required once calibrationStatus is provisional or locked');
    }
  }

  return {
    kpiKey: normalizeText(input.kpiKey) || `${sliceKey}:${slugify(metricName)}`,
    sliceKey,
    metricName,
    whyItMatters,
    formula,
    goalDirection,
    targetValue,
    warningThreshold,
    failureThreshold,
    measurementWindow,
    dataSource,
    owner,
    reviewCadence,
    slicePhase,
    leadingOrLagging,
    baselineValue,
    baselineWindow,
    minimumSampleSize,
    calibrationStatus,
    notes: normalizeText(input.notes) || null,
  };
}

function writeSliceRow(db, slice) {
  db.prepare(`
    INSERT INTO slice_registry (
      slice_key, display_name, objective, owner_classification, status,
      files_json, schema_changes_json, invariants_json, non_goals_json,
      baseline_plan, minimum_sample_size, calibration_status,
      gate_status, gate_blockers_json, last_gate_evaluated_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'blocked', '[]', NULL, datetime('now'))
    ON CONFLICT(slice_key) DO UPDATE SET
      display_name = excluded.display_name,
      objective = excluded.objective,
      owner_classification = excluded.owner_classification,
      status = excluded.status,
      files_json = excluded.files_json,
      schema_changes_json = excluded.schema_changes_json,
      invariants_json = excluded.invariants_json,
      non_goals_json = excluded.non_goals_json,
      baseline_plan = excluded.baseline_plan,
      minimum_sample_size = excluded.minimum_sample_size,
      calibration_status = excluded.calibration_status,
      updated_at = datetime('now')
  `).run(
    slice.sliceKey,
    slice.displayName,
    slice.objective,
    slice.ownerClassification,
    slice.status,
    serializeArray(slice.files),
    serializeArray(slice.schemaChanges),
    serializeArray(slice.invariants),
    serializeArray(slice.nonGoals),
    slice.baselinePlan,
    slice.minimumSampleSize,
    slice.calibrationStatus
  );
}

function writeKpiRow(db, kpi) {
  db.prepare(`
    INSERT INTO kpi_contracts (
      kpi_key, slice_key, metric_name, why_it_matters, formula, goal_direction,
      target_value, warning_threshold, failure_threshold, measurement_window,
      data_source, owner, review_cadence, slice_phase, leading_or_lagging,
      baseline_value, baseline_window, minimum_sample_size, calibration_status,
      notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(kpi_key) DO UPDATE SET
      slice_key = excluded.slice_key,
      metric_name = excluded.metric_name,
      why_it_matters = excluded.why_it_matters,
      formula = excluded.formula,
      goal_direction = excluded.goal_direction,
      target_value = excluded.target_value,
      warning_threshold = excluded.warning_threshold,
      failure_threshold = excluded.failure_threshold,
      measurement_window = excluded.measurement_window,
      data_source = excluded.data_source,
      owner = excluded.owner,
      review_cadence = excluded.review_cadence,
      slice_phase = excluded.slice_phase,
      leading_or_lagging = excluded.leading_or_lagging,
      baseline_value = excluded.baseline_value,
      baseline_window = excluded.baseline_window,
      minimum_sample_size = excluded.minimum_sample_size,
      calibration_status = excluded.calibration_status,
      notes = excluded.notes,
      updated_at = datetime('now')
  `).run(
    kpi.kpiKey,
    kpi.sliceKey,
    kpi.metricName,
    kpi.whyItMatters,
    kpi.formula,
    kpi.goalDirection,
    kpi.targetValue,
    kpi.warningThreshold,
    kpi.failureThreshold,
    kpi.measurementWindow,
    kpi.dataSource,
    kpi.owner,
    kpi.reviewCadence,
    kpi.slicePhase,
    kpi.leadingOrLagging,
    kpi.baselineValue,
    kpi.baselineWindow,
    kpi.minimumSampleSize,
    kpi.calibrationStatus,
    kpi.notes
  );
}

function serializeKpiRow(row) {
  return {
    kpiKey: row.kpi_key,
    sliceKey: row.slice_key,
    metricName: row.metric_name,
    whyItMatters: row.why_it_matters,
    formula: row.formula,
    goalDirection: row.goal_direction,
    targetValue: row.target_value,
    warningThreshold: row.warning_threshold,
    failureThreshold: row.failure_threshold,
    measurementWindow: row.measurement_window,
    dataSource: row.data_source,
    owner: row.owner,
    reviewCadence: row.review_cadence,
    slicePhase: row.slice_phase,
    leadingOrLagging: row.leading_or_lagging,
    baselineValue: row.baseline_value,
    baselineWindow: row.baseline_window,
    minimumSampleSize: row.minimum_sample_size,
    calibrationStatus: row.calibration_status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeSliceRow(db, row) {
  const kpis = db
    .prepare('SELECT * FROM kpi_contracts WHERE slice_key = ? ORDER BY metric_name ASC')
    .all(row.slice_key)
    .map(serializeKpiRow);

  return {
    sliceKey: row.slice_key,
    displayName: row.display_name,
    objective: row.objective,
    ownerClassification: row.owner_classification,
    status: row.status,
    files: parseJsonArray(row.files_json),
    schemaChanges: parseJsonArray(row.schema_changes_json),
    invariants: parseJsonArray(row.invariants_json),
    nonGoals: parseJsonArray(row.non_goals_json),
    baselinePlan: row.baseline_plan,
    minimumSampleSize: row.minimum_sample_size,
    calibrationStatus: row.calibration_status,
    gateStatus: row.gate_status,
    gateBlockers: parseJsonArray(row.gate_blockers_json),
    lastGateEvaluatedAt: row.last_gate_evaluated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    kpis,
  };
}

export function evaluateSliceGate(db, sliceKey) {
  const row = db.prepare('SELECT * FROM slice_registry WHERE slice_key = ?').get(sliceKey);
  if (!row) {
    return {
      sliceKey,
      status: 'blocked',
      blockers: ['Slice is not registered'],
      blockerCount: 1,
      kpiCount: 0,
      evaluatedAt: new Date().toISOString(),
    };
  }

  const blockers = [];
  const files = parseJsonArray(row.files_json);
  const invariants = parseJsonArray(row.invariants_json);
  const nonGoals = parseJsonArray(row.non_goals_json);
  const kpis = db
    .prepare('SELECT * FROM kpi_contracts WHERE slice_key = ? ORDER BY metric_name ASC')
    .all(sliceKey);

  if (!normalizeText(row.objective)) blockers.push('Objective is required');
  if (!OWNER_CLASSIFICATIONS.has(row.owner_classification)) {
    blockers.push('Owner classification must be explicit');
  }
  if (files.length === 0) blockers.push('At least one touched file must be registered');
  if (invariants.length === 0) blockers.push('At least one invariant must be registered');
  if (nonGoals.length === 0) blockers.push('At least one non-goal must be registered');
  if (!normalizeText(row.baseline_plan)) blockers.push('Baseline plan is required');
  if (
    row.minimum_sample_size === null ||
    row.minimum_sample_size === undefined ||
    Number(row.minimum_sample_size) <= 0
  ) {
    blockers.push('Slice minimum sample size must be a positive number');
  }
  if (!CALIBRATION_STATUSES.has(row.calibration_status)) {
    blockers.push('Slice calibration status is invalid');
  }

  if (kpis.length === 0) {
    blockers.push('No KPI contracts registered');
  }

  for (const kpi of kpis) {
    if (!KPI_DIRECTIONS.has(kpi.goal_direction)) {
      blockers.push(`${kpi.metric_name}: goal direction must be explicit`);
    }
    if (!kpi.formula) blockers.push(`${kpi.metric_name}: formula is required`);
    if (!kpi.why_it_matters) blockers.push(`${kpi.metric_name}: why_it_matters is required`);
    if (!kpi.measurement_window) {
      blockers.push(`${kpi.metric_name}: measurement window is required`);
    }
    if (!kpi.data_source) blockers.push(`${kpi.metric_name}: data source is required`);
    if (!kpi.owner) blockers.push(`${kpi.metric_name}: owner is required`);
    if (!kpi.review_cadence) blockers.push(`${kpi.metric_name}: review cadence is required`);
    if (!kpi.slice_phase) blockers.push(`${kpi.metric_name}: slice phase is required`);
    if (!KPI_LAG_TYPES.has(kpi.leading_or_lagging)) {
      blockers.push(`${kpi.metric_name}: leading_or_lagging must be explicit`);
    }
    if (
      kpi.minimum_sample_size === null ||
      kpi.minimum_sample_size === undefined ||
      Number(kpi.minimum_sample_size) <= 0
    ) {
      blockers.push(`${kpi.metric_name}: minimum sample size must be positive`);
    }
    if (!CALIBRATION_STATUSES.has(kpi.calibration_status)) {
      blockers.push(`${kpi.metric_name}: calibration status is invalid`);
    }

    if (kpi.goal_direction === 'maximize') {
      if (!(kpi.failure_threshold < kpi.warning_threshold && kpi.warning_threshold < kpi.target_value)) {
        blockers.push(
          `${kpi.metric_name}: maximize thresholds must satisfy failure < warning < target`
        );
      }
    } else if (kpi.goal_direction === 'minimize') {
      if (!(kpi.target_value < kpi.warning_threshold && kpi.warning_threshold < kpi.failure_threshold)) {
        blockers.push(
          `${kpi.metric_name}: minimize thresholds must satisfy target < warning < failure`
        );
      }
    }

    if (kpi.calibration_status !== 'pending') {
      if (kpi.baseline_value === null || kpi.baseline_value === undefined) {
        blockers.push(`${kpi.metric_name}: baseline value is required once calibrated`);
      }
      if (!normalizeText(kpi.baseline_window)) {
        blockers.push(`${kpi.metric_name}: baseline window is required once calibrated`);
      }
    }
  }

  return {
    sliceKey,
    status: blockers.length === 0 ? 'ready' : 'blocked',
    blockers,
    blockerCount: blockers.length,
    kpiCount: kpis.length,
    evaluatedAt: new Date().toISOString(),
  };
}

export function refreshSliceGate(db, sliceKey) {
  const gate = evaluateSliceGate(db, sliceKey);
  db.prepare(`
    UPDATE slice_registry
    SET gate_status = ?, gate_blockers_json = ?, last_gate_evaluated_at = ?, updated_at = datetime('now')
    WHERE slice_key = ?
  `).run(gate.status, JSON.stringify(gate.blockers), gate.evaluatedAt, sliceKey);
  return gate;
}

export function refreshAllSliceGates(db) {
  const rows = db.prepare('SELECT slice_key FROM slice_registry ORDER BY created_at ASC').all();
  return rows.map((row) => refreshSliceGate(db, row.slice_key));
}

export function getRuntimeSlice(db, sliceKey) {
  const row = db.prepare('SELECT * FROM slice_registry WHERE slice_key = ?').get(sliceKey);
  return row ? serializeSliceRow(db, row) : null;
}

export function listRuntimeSlices(db) {
  return db
    .prepare('SELECT * FROM slice_registry ORDER BY updated_at DESC, slice_key ASC')
    .all()
    .map((row) => serializeSliceRow(db, row));
}

export function upsertRuntimeSliceBundle(db, sliceInput, kpiInputs = [], options = {}) {
  const slice = normalizeSliceInput(sliceInput);
  const kpis = Array.isArray(kpiInputs) ? kpiInputs.map(normalizeKpiInput) : [];
  const enforceGate = options.enforceGate !== false;

  const tx = db.transaction(() => {
    writeSliceRow(db, slice);
    for (const kpi of kpis) {
      if (kpi.sliceKey !== slice.sliceKey) {
        throw new Error(`KPI contract ${kpi.kpiKey} does not belong to slice ${slice.sliceKey}`);
      }
      writeKpiRow(db, kpi);
    }

    const gate = refreshSliceGate(db, slice.sliceKey);
    if (enforceGate && GATED_SLICE_STATUSES.has(slice.status) && gate.status !== 'ready') {
      throw new Error(`KPI gate blocked: ${gate.blockers.join('; ')}`);
    }

    return getRuntimeSlice(db, slice.sliceKey);
  });

  return tx();
}

export function upsertSliceRegistration(db, sliceInput, options = {}) {
  return upsertRuntimeSliceBundle(db, sliceInput, [], options);
}

export function upsertSliceKpiContract(db, kpiInput) {
  const kpi = normalizeKpiInput(kpiInput);
  const tx = db.transaction(() => {
    const existingSlice = db
      .prepare('SELECT slice_key FROM slice_registry WHERE slice_key = ?')
      .get(kpi.sliceKey);
    if (!existingSlice) {
      throw new Error(`Slice ${kpi.sliceKey} must be registered before adding KPI contracts`);
    }
    writeKpiRow(db, kpi);
    refreshSliceGate(db, kpi.sliceKey);
    return getRuntimeSlice(db, kpi.sliceKey);
  });

  return tx();
}

function seedGoalGovernorDefaults(db) {
  const existing = db
    .prepare('SELECT slice_key FROM slice_registry WHERE slice_key = ?')
    .get(GOVERNANCE_SLICE_KEY);
  if (existing) {
    refreshSliceGate(db, GOVERNANCE_SLICE_KEY);
    return;
  }

  upsertRuntimeSliceBundle(
    db,
    {
      sliceKey: GOVERNANCE_SLICE_KEY,
      displayName: 'Machine-readable slice registry + KPI gate',
      objective:
        'Give OpenClaw a runtime-owned slice registry and deterministic KPI gate before larger control-plane slices are claimed.',
      ownerClassification: 'runtime-owned',
      status: 'ready',
      files: [
        '.openclaw-build/lib/db.mjs',
        '.openclaw-build/services/sync-api.mjs',
        '.openclaw-build/services/goal-governor-agent.mjs',
      ],
      schemaChanges: ['Create slice_registry table', 'Create kpi_contracts table'],
      invariants: [
        'Internal-only governance data',
        'No direct observations overwritten',
        'No chef-facing or public OpenClaw exposure',
      ],
      nonGoals: [
        'No durable task queue in this slice',
        'No inference cache in this slice',
        'No Pi host-operation changes in this slice',
      ],
      baselinePlan:
        'Use the seeded registry snapshot as the initial baseline and expand to additional slices as future runtime work is registered.',
      minimumSampleSize: 1,
      calibrationStatus: 'provisional',
    },
    [
      {
        kpiKey: GOVERNANCE_KPI_KEY,
        sliceKey: GOVERNANCE_SLICE_KEY,
        metricName: 'registry_gate_readiness_rate',
        whyItMatters:
          'The registry is only useful if active runtime slices carry structurally complete KPI contracts instead of vague intent.',
        formula: 'ready_slices / total_registered_slices',
        goalDirection: 'maximize',
        targetValue: 1,
        warningThreshold: 0.8,
        failureThreshold: 0.5,
        measurementWindow: 'current registry snapshot',
        dataSource: 'slice_registry.gate_status',
        owner: 'goal-governor-agent',
        reviewCadence: 'on slice mutation and daily governance sweep',
        slicePhase: 'governance',
        leadingOrLagging: 'leading',
        baselineValue: 1,
        baselineWindow: 'initial seeded registry snapshot',
        minimumSampleSize: 1,
        calibrationStatus: 'provisional',
        notes:
          'Deterministic structural metric. Remains provisional until at least three runtime slices are registered.',
      },
    ],
    { enforceGate: true }
  );
}

function seedRuntimeControlDefaults(db) {
  const sliceKey = 'durable-runtime-task-incident-dedupe-spine';
  const existing = db
    .prepare('SELECT slice_key FROM slice_registry WHERE slice_key = ?')
    .get(sliceKey);

  if (existing) {
    refreshSliceGate(db, sliceKey);
    return;
  }

  upsertRuntimeSliceBundle(
    db,
    {
      sliceKey,
      displayName: 'Durable runtime task / incident / dedupe spine',
      objective:
        'Give OpenClaw a runtime-owned durable task queue, lease recovery path, and incident spine before higher-order runtime agents land.',
      ownerClassification: 'runtime-owned',
      status: 'ready',
      files: [
        '.openclaw-build/lib/db.mjs',
        '.openclaw-build/services/sync-api.mjs',
        'tests/unit/openclaw-runtime-control-spine.test.ts',
      ],
      schemaChanges: [
        'Create agent_runs table',
        'Create agent_tasks table',
        'Create source_incidents table',
        'Add source_registry.rate_limit_backoff_until',
      ],
      invariants: [
        'Internal-only runtime control data',
        'At most one active task per dedupe key',
        'Lease-expired tasks remain auditable and recoverable',
        'Incident evidence carries explicit truth labels',
        'No chef-facing or public OpenClaw exposure',
      ],
      nonGoals: [
        'No runtime orchestrator scheduling policy',
        'No price inference cache',
        'No founder console UI',
      ],
      baselinePlan:
        'Keep the KPIs pending until the runtime records 14 days of queue traffic or reaches the stated sample floors, whichever is later.',
      minimumSampleSize: 200,
      calibrationStatus: 'pending',
    },
    [
      {
        sliceKey,
        metricName: 'active_task_duplication_rate',
        whyItMatters:
          'Repeated founder clicks, scheduler passes, or incident observations must not create unbounded duplicate active work.',
        formula: 'duplicate_active_task_rows / enqueue_attempts_with_dedupe_key',
        goalDirection: 'minimize',
        targetValue: 0,
        warningThreshold: 0.02,
        failureThreshold: 0.05,
        measurementWindow: '14 day rolling enqueue window',
        dataSource: 'agent_tasks.dedupe_key active-state uniqueness',
        owner: 'goal-governor-agent',
        reviewCadence: 'daily once queue traffic exists',
        slicePhase: 'control-plane',
        leadingOrLagging: 'leading',
        minimumSampleSize: 200,
        calibrationStatus: 'pending',
        notes:
          'Use targeted unit verification before live traffic exists; do not lock until real enqueue volume reaches the sample floor.',
      },
      {
        sliceKey,
        metricName: 'stalled_task_recovery_rate',
        whyItMatters:
          'Lease-expired tasks must be recovered or terminally surfaced instead of silently disappearing from the runtime.',
        formula: 'requeued_or_terminal_expired_tasks / expired_leased_tasks',
        goalDirection: 'maximize',
        targetValue: 1,
        warningThreshold: 0.95,
        failureThreshold: 0.8,
        measurementWindow: '14 day rolling lease-expiry window',
        dataSource: 'agent_tasks.status + lease_expires_at transitions',
        owner: 'goal-governor-agent',
        reviewCadence: 'daily once leased work exists',
        slicePhase: 'control-plane',
        leadingOrLagging: 'leading',
        minimumSampleSize: 50,
        calibrationStatus: 'pending',
        notes:
          'Pending until the runtime has enough leased work to observe real expiries instead of only synthetic verification events.',
      },
    ],
    { enforceGate: true }
  );
}

function seedInferenceCacheDefaults(db) {
  const sliceKey = 'explicit-inference-cache-audit-plane';
  const existing = db
    .prepare('SELECT slice_key FROM slice_registry WHERE slice_key = ?')
    .get(sliceKey);

  if (existing) {
    refreshSliceGate(db, sliceKey);
    return;
  }

  upsertRuntimeSliceBundle(
    db,
    {
      sliceKey,
      displayName: 'Explicit price inference cache + audit plane',
      objective:
        'Give OpenClaw a runtime-owned inferred-price plane with provenance, expiry, invalidation, and founder-auditable reads before broader coverage or frontier logic lands.',
      ownerClassification: 'runtime-owned',
      status: 'ready',
      files: [
        '.openclaw-build/lib/db.mjs',
        '.openclaw-build/services/sync-api.mjs',
        'tests/unit/openclaw-runtime-inference-cache.test.ts',
      ],
      schemaChanges: ['Create price_inference_cache table'],
      invariants: [
        'Inferred rows never overwrite current_prices',
        'Every inference row stays truth-labeled as inferred',
        'Inference provenance remains explicit and auditable',
        'Expired or invalidated inference rows are excluded from default active reads',
        'No chef-facing or public OpenClaw exposure',
      ],
      nonGoals: [
        'No coverage frontier planner in this slice',
        'No host capacity sampling in this slice',
        'No browser runtime console in this slice',
      ],
      baselinePlan:
        'Use synthetic verification immediately, then evaluate the first 14-day live write window once the runtime records at least 100 inference writes across 25 distinct ingredient/geography combinations.',
      minimumSampleSize: 100,
      calibrationStatus: 'pending',
    },
    [
      {
        sliceKey,
        metricName: 'active_inference_provenance_completeness_rate',
        whyItMatters:
          'The inference plane is only trustworthy if every active inferred price carries the method, confidence, model version, evidence, and expiry contract needed for audit.',
        formula:
          'active_inference_rows_with_method_confidence_model_version_evidence_and_expiry_contract / active_inference_rows',
        goalDirection: 'maximize',
        targetValue: 1,
        warningThreshold: 0.98,
        failureThreshold: 0.95,
        measurementWindow: '14 day rolling inference-write window',
        dataSource: 'price_inference_cache active rows',
        owner: 'goal-governor-agent',
        reviewCadence: 'daily once live inference writes exist',
        slicePhase: 'inference',
        leadingOrLagging: 'leading',
        minimumSampleSize: 100,
        calibrationStatus: 'pending',
        notes:
          'Keep pending until the runtime records 100 inference writes across at least 25 distinct ingredient/geography combinations.',
      },
    ],
    { enforceGate: true }
  );
}

function normalizeIncidentTruthLabel(value) {
  const label = normalizeText(value).toLowerCase();
  return INCIDENT_TRUTH_LABELS.has(label) ? label : 'derived';
}

function normalizeIncidentEvidence(value) {
  if (value === undefined || value === null) return [];

  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const cloned = cloneJsonValue(item, 'evidence');
      const truthLabel = normalizeIncidentTruthLabel(cloned.truthLabel);
      if ('truthLabel' in cloned) delete cloned.truthLabel;
      return { truthLabel, ...cloned };
    }

    return {
      truthLabel: 'derived',
      value: cloneJsonValue(item, 'evidence'),
    };
  });
}

function getIncidentSeverityRank(value) {
  return {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }[value] || 0;
}

function normalizeInferenceAuditState(value, fieldName = 'state') {
  const state = normalizeText(value).toLowerCase() || 'active';
  if (!INFERENCE_AUDIT_STATES.has(state)) {
    throw new Error(`Invalid ${fieldName}: ${state || '(empty)'}`);
  }
  return state;
}

function normalizePriceInferenceEvidence(value) {
  if (value === undefined || value === null) return [];

  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const cloned = cloneJsonValue(item, 'price inference evidence');
      const truthLabel = normalizeIncidentTruthLabel(cloned.truthLabel);
      if ('truthLabel' in cloned) delete cloned.truthLabel;
      if ('observedAt' in cloned) {
        cloned.observedAt = normalizeIsoTimestamp(
          cloned.observedAt,
          'price inference evidence.observedAt'
        );
      }
      if ('sourceId' in cloned) cloned.sourceId = optionalText(cloned.sourceId);
      if ('geographyType' in cloned) {
        const geographyType = optionalText(cloned.geographyType);
        if (geographyType && !INFERENCE_GEOGRAPHY_TYPES.has(geographyType)) {
          throw new Error(`Invalid price inference evidence geographyType: ${geographyType}`);
        }
        cloned.geographyType = geographyType;
      }
      if ('geographyKey' in cloned) cloned.geographyKey = optionalText(cloned.geographyKey);
      if ('priceUnit' in cloned) cloned.priceUnit = optionalText(cloned.priceUnit);
      if (
        'priceCents' in cloned &&
        cloned.priceCents !== null &&
        cloned.priceCents !== undefined &&
        cloned.priceCents !== ''
      ) {
        cloned.priceCents = normalizeInteger(cloned.priceCents, 'price inference evidence.priceCents', {
          minimum: 1,
          maximum: Number.MAX_SAFE_INTEGER,
          allowNull: false,
        });
      }
      return { truthLabel, ...cloned };
    }

    return {
      truthLabel: 'derived',
      value: cloneJsonValue(item, 'price inference evidence'),
    };
  });
}

function normalizePriceInferenceInput(input = {}, options = {}) {
  const now = getNowIso(options.now || input.computedAt);
  const geographyType = normalizeText(input.geographyType);
  const method = normalizeText(input.method);
  const canonicalIngredientId = normalizeText(input.canonicalIngredientId);
  const geographyKey = normalizeText(input.geographyKey);
  const priceUnit = normalizeText(input.priceUnit);
  const modelVersion = normalizeText(input.modelVersion);
  const confidence = Number(input.confidence);

  if (!canonicalIngredientId) throw new Error('canonicalIngredientId is required');
  if (!INFERENCE_GEOGRAPHY_TYPES.has(geographyType)) {
    throw new Error(`Invalid geographyType: ${geographyType || '(empty)'}`);
  }
  if (!geographyKey) throw new Error('geographyKey is required');
  if (!priceUnit) throw new Error('priceUnit is required');
  if (!INFERENCE_METHODS.has(method)) {
    throw new Error(`Invalid method: ${method || '(empty)'}`);
  }
  if (!modelVersion) throw new Error('modelVersion is required');
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('confidence must be a finite number between 0 and 1');
  }

  const invalidatedAt = normalizeIsoTimestamp(input.invalidatedAt, 'invalidatedAt');
  const invalidationReason = optionalText(input.invalidationReason);
  if (invalidatedAt && !invalidationReason) {
    throw new Error('invalidationReason is required when invalidatedAt is set');
  }

  return {
    cacheId: optionalText(input.cacheId),
    canonicalIngredientId,
    geographyType,
    geographyKey,
    pricingTier: normalizeText(input.pricingTier) || 'retail',
    priceCents: normalizeInteger(input.priceCents, 'priceCents', {
      minimum: 1,
      maximum: Number.MAX_SAFE_INTEGER,
      allowNull: false,
    }),
    priceUnit,
    confidence,
    method,
    basedOnDirectCount: normalizeInteger(input.basedOnDirectCount, 'basedOnDirectCount', {
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
      defaultValue: 0,
    }),
    basedOnRegion: optionalText(input.basedOnRegion),
    modelVersion,
    evidence: normalizePriceInferenceEvidence(input.evidence),
    computedAt: normalizeIsoTimestamp(input.computedAt, 'computedAt') || now,
    expiresAt: normalizeIsoTimestamp(input.expiresAt, 'expiresAt'),
    invalidatedAt,
    invalidationReason,
  };
}

function normalizeAgentRunInput(input = {}, options = {}) {
  const now = getNowIso(options.now || input.createdAt);
  const agentType = normalizeText(input.agentType);
  const status = normalizeText(input.status) || 'running';
  const leaseSeconds = normalizeInteger(input.leaseSeconds, 'leaseSeconds', {
    minimum: 1,
    maximum: 86400,
    defaultValue: null,
  });

  if (!AGENT_TYPES.has(agentType)) {
    throw new Error(`Invalid agent type: ${agentType || '(empty)'}`);
  }
  if (!AGENT_RUN_STATUSES.has(status)) {
    throw new Error(`Invalid agent run status: ${status || '(empty)'}`);
  }

  const startedAt = normalizeIsoTimestamp(input.startedAt, 'startedAt') || (status === 'running' ? now : null);
  const finishedAt = normalizeIsoTimestamp(input.finishedAt, 'finishedAt');
  const createdAt = normalizeIsoTimestamp(input.createdAt, 'createdAt') || now;

  return {
    runId: optionalText(input.runId) || `run_${randomUUID()}`,
    agentType,
    status,
    queueName: normalizeText(input.queueName) || 'default',
    startedAt,
    finishedAt,
    durationMs: normalizeInteger(input.durationMs, 'durationMs', {
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
      defaultValue: null,
    }),
    parentRunId: optionalText(input.parentRunId),
    hostName: optionalText(input.hostName),
    heartbeatAt: normalizeIsoTimestamp(input.heartbeatAt, 'heartbeatAt') || startedAt,
    leaseExpiresAt:
      normalizeIsoTimestamp(input.leaseExpiresAt, 'leaseExpiresAt') ||
      (startedAt && leaseSeconds ? addSeconds(startedAt, leaseSeconds) : null),
    input: cloneJsonValue(input.input, 'input'),
    output: cloneJsonValue(input.output, 'output'),
    error: cloneJsonValue(input.error, 'error'),
    createdAt,
  };
}

function normalizeAgentTaskInput(input = {}, options = {}) {
  const now = getNowIso(options.now || input.createdAt);
  const taskType = normalizeText(input.taskType);
  const preferredAgentType = normalizeText(input.preferredAgentType);
  const status = normalizeText(input.status) || 'queued';

  if (!AGENT_TASK_TYPES.has(taskType)) {
    throw new Error(`Invalid agent task type: ${taskType || '(empty)'}`);
  }
  if (!AGENT_TYPES.has(preferredAgentType)) {
    throw new Error(`Invalid preferred agent type: ${preferredAgentType || '(empty)'}`);
  }
  if (!AGENT_TASK_STATUSES.has(status)) {
    throw new Error(`Invalid agent task status: ${status || '(empty)'}`);
  }

  const attempts = normalizeInteger(input.attempts, 'attempts', {
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
    defaultValue: 0,
  });
  const maxAttempts = normalizeInteger(input.maxAttempts, 'maxAttempts', {
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
    defaultValue: 5,
  });

  if (attempts > maxAttempts) {
    throw new Error('attempts cannot exceed maxAttempts');
  }

  return {
    taskId: optionalText(input.taskId) || `task_${randomUUID()}`,
    taskType,
    preferredAgentType,
    queueName: normalizeText(input.queueName) || 'default',
    status,
    priority: normalizeInteger(input.priority, 'priority', {
      minimum: 0,
      maximum: 100,
      defaultValue: 50,
    }),
    poolSlots: normalizeInteger(input.poolSlots, 'poolSlots', {
      minimum: 1,
      maximum: 1000,
      defaultValue: 1,
    }),
    sourceId: optionalText(input.sourceId),
    cellId: optionalText(input.cellId),
    canonicalIngredientId: optionalText(input.canonicalIngredientId),
    dedupeKey: optionalText(input.dedupeKey),
    payload: cloneJsonValue(input.payload, 'payload'),
    attempts,
    maxAttempts,
    claimedByRunId: optionalText(input.claimedByRunId),
    heartbeatAt: normalizeIsoTimestamp(input.heartbeatAt, 'heartbeatAt'),
    leaseExpiresAt: normalizeIsoTimestamp(input.leaseExpiresAt, 'leaseExpiresAt'),
    nextAttemptAt: normalizeIsoTimestamp(input.nextAttemptAt, 'nextAttemptAt'),
    notBefore: normalizeIsoTimestamp(input.notBefore, 'notBefore'),
    lastError: optionalText(input.lastError),
    createdAt: normalizeIsoTimestamp(input.createdAt, 'createdAt') || now,
    updatedAt: normalizeIsoTimestamp(input.updatedAt, 'updatedAt') || now,
  };
}

function normalizeSourceIncidentInput(input = {}, options = {}) {
  const now = getNowIso(options.now || input.lastSeenAt || input.openedAt);
  const sourceId = normalizeText(input.sourceId);
  const incidentType = normalizeText(input.incidentType);
  const severity = normalizeText(input.severity);
  const status = normalizeText(input.status) || 'open';
  const summary = normalizeText(input.summary);

  if (!sourceId) throw new Error('sourceId is required');
  if (!INCIDENT_TYPES.has(incidentType)) {
    throw new Error(`Invalid incident type: ${incidentType || '(empty)'}`);
  }
  if (!INCIDENT_SEVERITIES.has(severity)) {
    throw new Error(`Invalid incident severity: ${severity || '(empty)'}`);
  }
  if (!INCIDENT_STATUSES.has(status)) {
    throw new Error(`Invalid incident status: ${status || '(empty)'}`);
  }
  if (!summary) throw new Error('summary is required');

  const defaultConsecutiveFailures =
    input.consecutiveFailures === undefined || input.consecutiveFailures === null
      ? (status === 'open' ? 1 : 0)
      : null;

  return {
    sourceId,
    incidentType,
    severity,
    status,
    summary,
    evidence: normalizeIncidentEvidence(input.evidence),
    consecutiveFailures: normalizeInteger(
      input.consecutiveFailures,
      'consecutiveFailures',
      {
        minimum: 0,
        maximum: Number.MAX_SAFE_INTEGER,
        defaultValue: defaultConsecutiveFailures,
      }
    ),
    openedAt: normalizeIsoTimestamp(input.openedAt, 'openedAt') || now,
    lastSeenAt: normalizeIsoTimestamp(input.lastSeenAt, 'lastSeenAt') || now,
    resolvedAt:
      normalizeIsoTimestamp(input.resolvedAt, 'resolvedAt') || (status === 'resolved' ? now : null),
  };
}

function serializeAgentRunRow(row) {
  return {
    runId: row.run_id,
    agentType: row.agent_type,
    status: row.status,
    queueName: row.queue_name,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms,
    parentRunId: row.parent_run_id,
    hostName: row.host_name,
    heartbeatAt: row.heartbeat_at,
    leaseExpiresAt: row.lease_expires_at,
    input: parseJsonValue(row.input_json),
    output: parseJsonValue(row.output_json),
    error: parseJsonValue(row.error_json),
    createdAt: row.created_at,
  };
}

function serializeAgentTaskRow(row) {
  return {
    taskId: row.task_id,
    taskType: row.task_type,
    preferredAgentType: row.preferred_agent_type,
    queueName: row.queue_name,
    status: row.status,
    priority: row.priority,
    poolSlots: row.pool_slots,
    sourceId: row.source_id,
    cellId: row.cell_id,
    canonicalIngredientId: row.canonical_ingredient_id,
    dedupeKey: row.dedupe_key,
    payload: parseJsonValue(row.payload_json),
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    claimedByRunId: row.claimed_by_run_id,
    heartbeatAt: row.heartbeat_at,
    leaseExpiresAt: row.lease_expires_at,
    nextAttemptAt: row.next_attempt_at,
    notBefore: row.not_before,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeSourceIncidentRow(row) {
  return {
    incidentId: row.incident_id,
    sourceId: row.source_id,
    incidentType: row.incident_type,
    severity: row.severity,
    status: row.status,
    summary: row.summary,
    evidence: normalizeIncidentEvidence(parseJsonValue(row.evidence_json, [])),
    consecutiveFailures: row.consecutive_failures,
    openedAt: row.opened_at,
    lastSeenAt: row.last_seen_at,
    resolvedAt: row.resolved_at,
  };
}

function getPriceInferenceState(row, now = new Date().toISOString()) {
  if (row.invalidated_at) return 'invalidated';
  if (row.expires_at && row.expires_at <= now) return 'expired';
  return 'active';
}

function serializePriceInferenceRow(row, options = {}) {
  const now = getNowIso(options.now);
  return {
    cacheId: row.cache_id,
    canonicalIngredientId: row.canonical_ingredient_id,
    geographyType: row.geography_type,
    geographyKey: row.geography_key,
    pricingTier: row.pricing_tier,
    truthLabel: 'inferred',
    state: getPriceInferenceState(row, now),
    priceCents: row.price_cents,
    priceUnit: row.price_unit,
    confidence: row.confidence,
    method: row.method,
    basedOnDirectCount: row.based_on_direct_count,
    basedOnRegion: row.based_on_region,
    modelVersion: row.model_version,
    evidence: normalizePriceInferenceEvidence(parseJsonValue(row.evidence_json, [])),
    computedAt: row.computed_at,
    expiresAt: row.expires_at,
    invalidatedAt: row.invalidated_at,
    invalidationReason: row.invalidation_reason,
  };
}

function buildPriceInferenceWhere(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.cacheId) {
    clauses.push('cache_id = ?');
    params.push(normalizeText(filters.cacheId));
  }
  if (filters.canonicalIngredientId) {
    clauses.push('canonical_ingredient_id = ?');
    params.push(normalizeText(filters.canonicalIngredientId));
  }
  if (filters.geographyType) {
    const geographyType = normalizeText(filters.geographyType);
    if (!INFERENCE_GEOGRAPHY_TYPES.has(geographyType)) {
      throw new Error(`Invalid geographyType filter: ${geographyType || '(empty)'}`);
    }
    clauses.push('geography_type = ?');
    params.push(geographyType);
  }
  if (filters.geographyKey) {
    clauses.push('geography_key = ?');
    params.push(normalizeText(filters.geographyKey));
  }
  if (filters.pricingTier) {
    clauses.push('pricing_tier = ?');
    params.push(normalizeText(filters.pricingTier));
  }
  if (filters.method) {
    const method = normalizeText(filters.method);
    if (!INFERENCE_METHODS.has(method)) {
      throw new Error(`Invalid method filter: ${method || '(empty)'}`);
    }
    clauses.push('method = ?');
    params.push(method);
  }

  return {
    where: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function getActiveTaskByDedupeKey(db, dedupeKey) {
  if (!dedupeKey) return null;

  const row = db
    .prepare(`
      SELECT *
      FROM agent_tasks
      WHERE dedupe_key = ?
        AND status IN ('queued', 'claimed', 'running')
      ORDER BY created_at ASC
      LIMIT 1
    `)
    .get(dedupeKey);

  return row ? serializeAgentTaskRow(row) : null;
}

function getAgentTaskIdempotence(task) {
  const payload = task.payload ?? {};
  return payload?.idempotent !== false;
}

export function getAgentRun(db, runId) {
  const row = db.prepare('SELECT * FROM agent_runs WHERE run_id = ?').get(runId);
  return row ? serializeAgentRunRow(row) : null;
}

export function startAgentRun(db, runInput = {}, options = {}) {
  const run = normalizeAgentRunInput(runInput, options);

  db.prepare(`
    INSERT INTO agent_runs (
      run_id, agent_type, status, queue_name, started_at, finished_at, duration_ms,
      parent_run_id, host_name, heartbeat_at, lease_expires_at,
      input_json, output_json, error_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    run.runId,
    run.agentType,
    run.status,
    run.queueName,
    run.startedAt,
    run.finishedAt,
    run.durationMs,
    run.parentRunId,
    run.hostName,
    run.heartbeatAt,
    run.leaseExpiresAt,
    serializeJsonValue(run.input),
    serializeJsonValue(run.output),
    serializeJsonValue(run.error),
    run.createdAt
  );

  return getAgentRun(db, run.runId);
}

export function heartbeatAgentRun(db, runId, options = {}) {
  const now = getNowIso(options.now);
  const leaseSeconds = normalizeInteger(options.leaseSeconds, 'leaseSeconds', {
    minimum: 1,
    maximum: 86400,
    defaultValue: 300,
  });

  const update = db.prepare(`
    UPDATE agent_runs
    SET heartbeat_at = ?, lease_expires_at = ?, status = CASE WHEN status = 'queued' THEN 'running' ELSE status END
    WHERE run_id = ?
      AND status IN ('queued', 'running')
  `).run(now, addSeconds(now, leaseSeconds), runId);

  return update.changes > 0 ? getAgentRun(db, runId) : null;
}

export function finishAgentRun(db, runId, status = 'succeeded', output = null, error = null, options = {}) {
  const normalizedStatus = normalizeText(status) || 'succeeded';
  if (!AGENT_RUN_STATUSES.has(normalizedStatus) || normalizedStatus === 'running' || normalizedStatus === 'queued') {
    throw new Error('finishAgentRun requires a terminal run status');
  }

  const existing = db.prepare('SELECT * FROM agent_runs WHERE run_id = ?').get(runId);
  if (!existing) return null;

  const now = getNowIso(options.now);
  const startedAt = normalizeIsoTimestamp(existing.started_at, 'startedAt');
  const durationMs = startedAt
    ? Math.max(0, new Date(now).getTime() - new Date(startedAt).getTime())
    : existing.duration_ms;

  db.prepare(`
    UPDATE agent_runs
    SET status = ?, finished_at = ?, duration_ms = ?, output_json = ?, error_json = ?, heartbeat_at = ?, lease_expires_at = NULL
    WHERE run_id = ?
  `).run(
    normalizedStatus,
    now,
    durationMs,
    serializeJsonValue(cloneJsonValue(output, 'output')),
    serializeJsonValue(cloneJsonValue(error, 'error')),
    now,
    runId
  );

  return getAgentRun(db, runId);
}

export function listAgentRuns(db, filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.agentType) {
    const agentType = normalizeText(filters.agentType);
    if (!AGENT_TYPES.has(agentType)) {
      throw new Error(`Invalid agent type filter: ${agentType}`);
    }
    clauses.push('agent_type = ?');
    params.push(agentType);
  }

  if (filters.status) {
    const status = normalizeText(filters.status);
    if (!AGENT_RUN_STATUSES.has(status)) {
      throw new Error(`Invalid run status filter: ${status}`);
    }
    clauses.push('status = ?');
    params.push(status);
  }

  if (filters.queueName) {
    clauses.push('queue_name = ?');
    params.push(normalizeText(filters.queueName));
  }

  const limit = normalizeInteger(filters.limit, 'limit', {
    minimum: 1,
    maximum: 500,
    defaultValue: 100,
  });

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return db
    .prepare(`SELECT * FROM agent_runs ${where} ORDER BY created_at DESC LIMIT ?`)
    .all(...params, limit)
    .map(serializeAgentRunRow);
}

export function getAgentTask(db, taskId) {
  const row = db.prepare('SELECT * FROM agent_tasks WHERE task_id = ?').get(taskId);
  return row ? serializeAgentTaskRow(row) : null;
}

export function enqueueAgentTask(db, taskInput = {}, options = {}) {
  const task = normalizeAgentTaskInput(taskInput, options);
  const tx = db.transaction(() => {
    const existing = getActiveTaskByDedupeKey(db, task.dedupeKey);
    if (existing) {
      return { task: existing, deduped: true, created: false };
    }

    try {
      db.prepare(`
        INSERT INTO agent_tasks (
          task_id, task_type, preferred_agent_type, queue_name, status, priority, pool_slots,
          source_id, cell_id, canonical_ingredient_id, dedupe_key, payload_json,
          attempts, max_attempts, claimed_by_run_id, heartbeat_at, lease_expires_at,
          next_attempt_at, not_before, last_error, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        task.taskId,
        task.taskType,
        task.preferredAgentType,
        task.queueName,
        task.status,
        task.priority,
        task.poolSlots,
        task.sourceId,
        task.cellId,
        task.canonicalIngredientId,
        task.dedupeKey,
        serializeJsonValue(task.payload),
        task.attempts,
        task.maxAttempts,
        task.claimedByRunId,
        task.heartbeatAt,
        task.leaseExpiresAt,
        task.nextAttemptAt,
        task.notBefore,
        task.lastError,
        task.createdAt,
        task.updatedAt
      );
    } catch (error) {
      if (task.dedupeKey && String(error?.message || '').includes('idx_agent_tasks_active_dedupe')) {
        return {
          task: getActiveTaskByDedupeKey(db, task.dedupeKey),
          deduped: true,
          created: false,
        };
      }
      throw error;
    }

    return { task: getAgentTask(db, task.taskId), deduped: false, created: true };
  });

  return tx();
}

export function listAgentTasks(db, filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.status) {
    const status = normalizeText(filters.status);
    if (!AGENT_TASK_STATUSES.has(status)) {
      throw new Error(`Invalid task status filter: ${status}`);
    }
    clauses.push('status = ?');
    params.push(status);
  }

  if (filters.queueName) {
    clauses.push('queue_name = ?');
    params.push(normalizeText(filters.queueName));
  }

  if (filters.taskType) {
    const taskType = normalizeText(filters.taskType);
    if (!AGENT_TASK_TYPES.has(taskType)) {
      throw new Error(`Invalid task type filter: ${taskType}`);
    }
    clauses.push('task_type = ?');
    params.push(taskType);
  }

  if (filters.sourceId) {
    clauses.push('source_id = ?');
    params.push(normalizeText(filters.sourceId));
  }

  if (filters.claimedByRunId) {
    clauses.push('claimed_by_run_id = ?');
    params.push(normalizeText(filters.claimedByRunId));
  }

  const limit = normalizeInteger(filters.limit, 'limit', {
    minimum: 1,
    maximum: 500,
    defaultValue: 100,
  });
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db
    .prepare(`
      SELECT *
      FROM agent_tasks
      ${where}
      ORDER BY priority DESC, created_at ASC
      LIMIT ?
    `)
    .all(...params, limit)
    .map(serializeAgentTaskRow);
}

export function claimNextAgentTask(db, filters = {}, options = {}) {
  const now = getNowIso(options.now);
  const leaseSeconds = normalizeInteger(options.leaseSeconds, 'leaseSeconds', {
    minimum: 1,
    maximum: 86400,
    defaultValue: 300,
  });
  const clauses = [
    "status = 'queued'",
    '(next_attempt_at IS NULL OR next_attempt_at <= ?)',
    '(not_before IS NULL OR not_before <= ?)',
  ];
  const params = [now, now];

  if (filters.queueName) {
    clauses.push('queue_name = ?');
    params.push(normalizeText(filters.queueName));
  }

  if (filters.preferredAgentType) {
    const agentType = normalizeText(filters.preferredAgentType);
    if (!AGENT_TYPES.has(agentType)) {
      throw new Error(`Invalid preferred agent type filter: ${agentType}`);
    }
    clauses.push('preferred_agent_type = ?');
    params.push(agentType);
  }

  const tx = db.transaction(() => {
    const row = db
      .prepare(`
        SELECT *
        FROM agent_tasks
        WHERE ${clauses.join(' AND ')}
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `)
      .get(...params);

    if (!row) return null;

    const leaseExpiresAt = addSeconds(now, leaseSeconds);
    const runId = optionalText(options.runId);
    const update = db.prepare(`
      UPDATE agent_tasks
      SET status = 'claimed',
          claimed_by_run_id = ?,
          attempts = attempts + 1,
          heartbeat_at = ?,
          lease_expires_at = ?,
          updated_at = ?
      WHERE task_id = ?
        AND status = 'queued'
    `).run(runId, now, leaseExpiresAt, now, row.task_id);

    return update.changes > 0 ? getAgentTask(db, row.task_id) : null;
  });

  return tx();
}

export function markAgentTaskRunning(db, taskId, options = {}) {
  const now = getNowIso(options.now);
  const leaseSeconds = normalizeInteger(options.leaseSeconds, 'leaseSeconds', {
    minimum: 1,
    maximum: 86400,
    defaultValue: 300,
  });
  const update = db.prepare(`
    UPDATE agent_tasks
    SET status = 'running',
        claimed_by_run_id = COALESCE(?, claimed_by_run_id),
        heartbeat_at = ?,
        lease_expires_at = ?,
        updated_at = ?
    WHERE task_id = ?
      AND status IN ('claimed', 'running')
  `).run(optionalText(options.runId), now, addSeconds(now, leaseSeconds), now, taskId);

  return update.changes > 0 ? getAgentTask(db, taskId) : null;
}

export function heartbeatAgentTask(db, taskId, options = {}) {
  const now = getNowIso(options.now);
  const leaseSeconds = normalizeInteger(options.leaseSeconds, 'leaseSeconds', {
    minimum: 1,
    maximum: 86400,
    defaultValue: 300,
  });
  const params = [now, addSeconds(now, leaseSeconds), now, taskId];
  let sql = `
    UPDATE agent_tasks
    SET heartbeat_at = ?, lease_expires_at = ?, updated_at = ?
    WHERE task_id = ?
      AND status IN ('claimed', 'running')
  `;

  if (options.runId) {
    sql += ' AND claimed_by_run_id = ?';
    params.push(optionalText(options.runId));
  }

  const update = db.prepare(sql).run(...params);
  return update.changes > 0 ? getAgentTask(db, taskId) : null;
}

export function completeAgentTask(db, taskId, output = null, options = {}) {
  const now = getNowIso(options.now);
  const update = db.prepare(`
    UPDATE agent_tasks
    SET status = 'succeeded',
        heartbeat_at = ?,
        lease_expires_at = NULL,
        last_error = NULL,
        updated_at = ?
    WHERE task_id = ?
  `).run(now, now, taskId);

  if (update.changes === 0) return null;

  if (options.runId) {
    finishAgentRun(db, options.runId, 'succeeded', output, null, { now });
  }

  return getAgentTask(db, taskId);
}

export function failAgentTask(db, taskId, errorMessage, options = {}) {
  const existing = db.prepare('SELECT * FROM agent_tasks WHERE task_id = ?').get(taskId);
  if (!existing) return null;

  const now = getNowIso(options.now);
  const errorText = normalizeText(errorMessage);
  if (!errorText) {
    throw new Error('errorMessage is required');
  }

  const retryable = options.retryable !== false;
  const backoffSeconds = normalizeInteger(options.backoffSeconds, 'backoffSeconds', {
    minimum: 0,
    maximum: 86400,
    defaultValue: 60,
  });

  const nextAttemptCount = Number(existing.attempts) || 0;
  const shouldDeadLetter = !retryable || nextAttemptCount >= Number(existing.max_attempts);

  db.prepare(`
    UPDATE agent_tasks
    SET status = ?,
        heartbeat_at = ?,
        lease_expires_at = NULL,
        next_attempt_at = ?,
        last_error = ?,
        updated_at = ?,
        claimed_by_run_id = CASE WHEN ? = 'queued' THEN NULL ELSE claimed_by_run_id END
    WHERE task_id = ?
  `).run(
    shouldDeadLetter ? 'dead_letter' : 'queued',
    now,
    shouldDeadLetter ? null : addSeconds(now, backoffSeconds),
    errorText,
    now,
    shouldDeadLetter ? 'dead_letter' : 'queued',
    taskId
  );

  if (options.runId) {
    finishAgentRun(db, options.runId, shouldDeadLetter ? 'failed' : 'partial', null, { message: errorText }, { now });
  }

  return getAgentTask(db, taskId);
}

export function recoverExpiredAgentTasks(db, options = {}) {
  const now = getNowIso(options.now);
  const expired = db
    .prepare(`
      SELECT *
      FROM agent_tasks
      WHERE status IN ('claimed', 'running')
        AND lease_expires_at IS NOT NULL
        AND lease_expires_at < ?
      ORDER BY lease_expires_at ASC, created_at ASC
    `)
    .all(now);

  const summary = {
    now,
    expiredCount: expired.length,
    requeuedCount: 0,
    deadLetterCount: 0,
    requeuedTaskIds: [],
    deadLetterTaskIds: [],
  };

  const tx = db.transaction(() => {
    for (const row of expired) {
      const task = serializeAgentTaskRow(row);
      const shouldRequeue = getAgentTaskIdempotence(task) && task.attempts < task.maxAttempts;
      const message = shouldRequeue
        ? `Lease expired at ${row.lease_expires_at}; task requeued for recovery`
        : `Lease expired at ${row.lease_expires_at}; task moved to dead_letter`;

      db.prepare(`
        UPDATE agent_tasks
        SET status = ?,
            claimed_by_run_id = NULL,
            heartbeat_at = ?,
            lease_expires_at = NULL,
            next_attempt_at = ?,
            last_error = ?,
            updated_at = ?
        WHERE task_id = ?
      `).run(
        shouldRequeue ? 'queued' : 'dead_letter',
        now,
        shouldRequeue ? now : null,
        message,
        now,
        row.task_id
      );

      if (shouldRequeue) {
        summary.requeuedCount += 1;
        summary.requeuedTaskIds.push(row.task_id);
      } else {
        summary.deadLetterCount += 1;
        summary.deadLetterTaskIds.push(row.task_id);
      }
    }
  });

  tx();
  return summary;
}

export function getSourceIncident(db, incidentId) {
  const row = db.prepare('SELECT * FROM source_incidents WHERE incident_id = ?').get(incidentId);
  return row ? serializeSourceIncidentRow(row) : null;
}

export function upsertSourceIncident(db, incidentInput = {}, options = {}) {
  const incident = normalizeSourceIncidentInput(incidentInput, options);
  const tx = db.transaction(() => {
    if (incident.status === 'open') {
      const existing = db
        .prepare(`
          SELECT *
          FROM source_incidents
          WHERE source_id = ?
            AND incident_type = ?
            AND status = 'open'
          ORDER BY opened_at ASC
          LIMIT 1
        `)
        .get(incident.sourceId, incident.incidentType);

      if (existing) {
        const existingEvidence = normalizeIncidentEvidence(parseJsonValue(existing.evidence_json, []));
        const mergedEvidence = [...existingEvidence, ...incident.evidence];
        const severity =
          getIncidentSeverityRank(incident.severity) >= getIncidentSeverityRank(existing.severity)
            ? incident.severity
            : existing.severity;

        db.prepare(`
          UPDATE source_incidents
          SET severity = ?,
              summary = ?,
              evidence_json = ?,
              consecutive_failures = ?,
              last_seen_at = ?,
              resolved_at = NULL
          WHERE incident_id = ?
        `).run(
          severity,
          incident.summary,
          serializeJsonValue(mergedEvidence),
          Number(existing.consecutive_failures || 0) + incident.consecutiveFailures,
          incident.lastSeenAt,
          existing.incident_id
        );

        return getSourceIncident(db, existing.incident_id);
      }
    }

    const result = db.prepare(`
      INSERT INTO source_incidents (
        source_id, incident_type, severity, status, summary, evidence_json,
        consecutive_failures, opened_at, last_seen_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      incident.sourceId,
      incident.incidentType,
      incident.severity,
      incident.status,
      incident.summary,
      serializeJsonValue(incident.evidence),
      incident.consecutiveFailures,
      incident.openedAt,
      incident.lastSeenAt,
      incident.resolvedAt
    );

    return getSourceIncident(db, result.lastInsertRowid);
  });

  return tx();
}

export function resolveSourceIncident(db, incidentId, options = {}) {
  const existing = db.prepare('SELECT * FROM source_incidents WHERE incident_id = ?').get(incidentId);
  if (!existing) return null;

  const now = getNowIso(options.now);
  const existingEvidence = normalizeIncidentEvidence(parseJsonValue(existing.evidence_json, []));
  const resolutionEvidence = normalizeIncidentEvidence(options.evidence);
  const mergedEvidence = [...existingEvidence, ...resolutionEvidence];

  db.prepare(`
    UPDATE source_incidents
    SET status = 'resolved',
        summary = ?,
        evidence_json = ?,
        last_seen_at = ?,
        resolved_at = ?
    WHERE incident_id = ?
  `).run(
    optionalText(options.summary) || existing.summary,
    serializeJsonValue(mergedEvidence),
    now,
    now,
    incidentId
  );

  return getSourceIncident(db, incidentId);
}

export function listSourceIncidents(db, filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.sourceId) {
    clauses.push('source_id = ?');
    params.push(normalizeText(filters.sourceId));
  }

  if (filters.status) {
    const status = normalizeText(filters.status);
    if (!INCIDENT_STATUSES.has(status)) {
      throw new Error(`Invalid incident status filter: ${status}`);
    }
    clauses.push('status = ?');
    params.push(status);
  }

  if (filters.severity) {
    const severity = normalizeText(filters.severity);
    if (!INCIDENT_SEVERITIES.has(severity)) {
      throw new Error(`Invalid incident severity filter: ${severity}`);
    }
    clauses.push('severity = ?');
    params.push(severity);
  }

  const limit = normalizeInteger(filters.limit, 'limit', {
    minimum: 1,
    maximum: 500,
    defaultValue: 100,
  });
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db
    .prepare(`
      SELECT *
      FROM source_incidents
      ${where}
      ORDER BY opened_at DESC, incident_id DESC
      LIMIT ?
    `)
    .all(...params, limit)
    .map(serializeSourceIncidentRow);
}

export function getPriceInferenceCacheEntry(db, cacheId, options = {}) {
  const row = db
    .prepare('SELECT * FROM price_inference_cache WHERE cache_id = ?')
    .get(normalizeText(cacheId));
  return row ? serializePriceInferenceRow(row, options) : null;
}

export function upsertPriceInferenceCacheEntry(db, input = {}, options = {}) {
  const inference = normalizePriceInferenceInput(input, options);

  const tx = db.transaction(() => {
    const existing = db.prepare(`
      SELECT cache_id
      FROM price_inference_cache
      WHERE canonical_ingredient_id = ?
        AND geography_type = ?
        AND geography_key = ?
        AND pricing_tier = ?
        AND price_unit = ?
      LIMIT 1
    `).get(
      inference.canonicalIngredientId,
      inference.geographyType,
      inference.geographyKey,
      inference.pricingTier,
      inference.priceUnit
    );

    const cacheId = existing?.cache_id || inference.cacheId || `infer_${randomUUID()}`;

    db.prepare(`
      INSERT INTO price_inference_cache (
        cache_id, canonical_ingredient_id, geography_type, geography_key, pricing_tier,
        price_cents, price_unit, confidence, method, based_on_direct_count,
        based_on_region, model_version, evidence_json, computed_at, expires_at,
        invalidated_at, invalidation_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(canonical_ingredient_id, geography_type, geography_key, pricing_tier, price_unit) DO UPDATE SET
        cache_id = excluded.cache_id,
        price_cents = excluded.price_cents,
        confidence = excluded.confidence,
        method = excluded.method,
        based_on_direct_count = excluded.based_on_direct_count,
        based_on_region = excluded.based_on_region,
        model_version = excluded.model_version,
        evidence_json = excluded.evidence_json,
        computed_at = excluded.computed_at,
        expires_at = excluded.expires_at,
        invalidated_at = excluded.invalidated_at,
        invalidation_reason = excluded.invalidation_reason
    `).run(
      cacheId,
      inference.canonicalIngredientId,
      inference.geographyType,
      inference.geographyKey,
      inference.pricingTier,
      inference.priceCents,
      inference.priceUnit,
      inference.confidence,
      inference.method,
      inference.basedOnDirectCount,
      inference.basedOnRegion,
      inference.modelVersion,
      serializeJsonValue(inference.evidence),
      inference.computedAt,
      inference.expiresAt,
      inference.invalidatedAt,
      inference.invalidationReason
    );

    return getPriceInferenceCacheEntry(db, cacheId, { now: options.now });
  });

  return tx();
}

export function invalidatePriceInferenceCacheEntry(db, input = {}, options = {}) {
  const cacheId = normalizeText(input.cacheId);
  const invalidationReason = normalizeText(input.invalidationReason);
  if (!cacheId) throw new Error('cacheId is required');
  if (!invalidationReason) throw new Error('invalidationReason is required');

  const now = getNowIso(options.now);
  const update = db.prepare(`
    UPDATE price_inference_cache
    SET invalidated_at = ?, invalidation_reason = ?
    WHERE cache_id = ?
  `).run(now, invalidationReason, cacheId);

  return update.changes > 0 ? getPriceInferenceCacheEntry(db, cacheId, { now }) : null;
}

export function pruneExpiredPriceInferenceCacheEntries(db, options = {}) {
  const now = getNowIso(options.now);
  const result = db.prepare(`
    DELETE FROM price_inference_cache
    WHERE invalidated_at IS NULL
      AND expires_at IS NOT NULL
      AND expires_at <= ?
  `).run(now);

  return {
    prunedCount: result.changes,
    prunedAt: now,
  };
}

export function listPriceInferenceCacheEntries(db, filters = {}, options = {}) {
  const { where, params } = buildPriceInferenceWhere(filters);
  const state = normalizeInferenceAuditState(filters.state, 'state');
  const limit = normalizeInteger(filters.limit, 'limit', {
    minimum: 1,
    maximum: 500,
    defaultValue: 100,
  });
  const now = getNowIso(options.now);

  const rows = db.prepare(`
    SELECT *
    FROM price_inference_cache
    ${where}
    ORDER BY computed_at DESC, cache_id DESC
  `).all(...params);

  return rows
    .map((row) => serializePriceInferenceRow(row, { now }))
    .filter((row) => state === 'all' || row.state === state)
    .slice(0, limit);
}

export function getPriceInferenceAuditOverview(db, filters = {}, options = {}) {
  const { where, params } = buildPriceInferenceWhere(filters);
  const now = getNowIso(options.now);
  const rows = db.prepare(`
    SELECT *
    FROM price_inference_cache
    ${where}
  `).all(...params);

  const serialized = rows.map((row) => serializePriceInferenceRow(row, { now }));
  const counts = {
    active: 0,
    expired: 0,
    invalidated: 0,
  };
  const byMethod = {};
  const distinctIngredients = new Set();
  let newestComputedAt = null;
  let soonestExpiryAt = null;

  for (const row of serialized) {
    counts[row.state] += 1;
    byMethod[row.method] = (byMethod[row.method] || 0) + 1;
    distinctIngredients.add(row.canonicalIngredientId);
    if (!newestComputedAt || row.computedAt > newestComputedAt) {
      newestComputedAt = row.computedAt;
    }
    if (
      row.state === 'active' &&
      row.expiresAt &&
      (!soonestExpiryAt || row.expiresAt < soonestExpiryAt)
    ) {
      soonestExpiryAt = row.expiresAt;
    }
  }

  return {
    generatedAt: now,
    totalCount: serialized.length,
    activeCount: counts.active,
    expiredCount: counts.expired,
    invalidatedCount: counts.invalidated,
    distinctIngredientCount: distinctIngredients.size,
    newestComputedAt,
    soonestExpiryAt,
    byMethod: Object.entries(byMethod)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([method, count]) => ({ method, count })),
  };
}

export function setSourceRateLimitBackoff(db, input = {}, options = {}) {
  const sourceId = normalizeText(input.sourceId);
  const backoffUntil = normalizeIsoTimestamp(input.backoffUntil, 'backoffUntil');
  if (!sourceId) throw new Error('sourceId is required');
  if (!backoffUntil) throw new Error('backoffUntil is required');

  const source = db.prepare('SELECT source_id FROM source_registry WHERE source_id = ?').get(sourceId);
  if (!source) {
    throw new Error(`Source ${sourceId} is not registered`);
  }

  const now = getNowIso(options.now);
  db.prepare(`
    UPDATE source_registry
    SET rate_limit_backoff_until = ?, updated_at = ?
    WHERE source_id = ?
  `).run(backoffUntil, now, sourceId);

  if (input.recordIncident !== false) {
    upsertSourceIncident(
      db,
      {
        sourceId,
        incidentType: optionalText(input.incidentType) || 'http',
        severity: optionalText(input.severity) || 'medium',
        summary: optionalText(input.summary) || 'Source is temporarily rate limited',
        evidence: input.evidence,
      },
      { now }
    );
  }

  return db
    .prepare('SELECT source_id as sourceId, rate_limit_backoff_until as rateLimitBackoffUntil FROM source_registry WHERE source_id = ?')
    .get(sourceId);
}

export function getRuntimeQueueOverview(db, options = {}) {
  const now = getNowIso(options.now);
  const taskStatusCounts = {};
  const runStatusCounts = {};
  const incidentSeverityCounts = {};

  for (const row of db.prepare('SELECT status, COUNT(*) as count FROM agent_tasks GROUP BY status').all()) {
    taskStatusCounts[row.status] = row.count;
  }
  for (const row of db.prepare('SELECT status, COUNT(*) as count FROM agent_runs GROUP BY status').all()) {
    runStatusCounts[row.status] = row.count;
  }
  for (const row of db.prepare("SELECT severity, COUNT(*) as count FROM source_incidents WHERE status = 'open' GROUP BY severity").all()) {
    incidentSeverityCounts[row.severity] = row.count;
  }

  const queueCounts = db.prepare(`
    SELECT
      queue_name,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued_count,
      SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) as claimed_count,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_count
    FROM agent_tasks
    GROUP BY queue_name
    ORDER BY queue_name ASC
  `).all();

  const openIncidents = db.prepare("SELECT COUNT(*) as count FROM source_incidents WHERE status = 'open'").get();
  const stalledTasks = db.prepare(`
    SELECT COUNT(*) as count
    FROM agent_tasks
    WHERE status IN ('claimed', 'running')
      AND lease_expires_at IS NOT NULL
      AND lease_expires_at < ?
  `).get(now);
  const activeBackoffSources = db.prepare(`
    SELECT COUNT(*) as count
    FROM source_registry
    WHERE rate_limit_backoff_until IS NOT NULL
      AND rate_limit_backoff_until > ?
  `).get(now);
  const inferenceCounts = db.prepare(`
    SELECT
      SUM(CASE WHEN invalidated_at IS NOT NULL THEN 1 ELSE 0 END) as invalidated_count,
      SUM(CASE WHEN invalidated_at IS NULL AND expires_at IS NOT NULL AND expires_at <= ? THEN 1 ELSE 0 END) as expired_count,
      SUM(CASE WHEN invalidated_at IS NULL AND (expires_at IS NULL OR expires_at > ?) THEN 1 ELSE 0 END) as active_count
    FROM price_inference_cache
  `).get(now, now);

  return {
    generatedAt: now,
    taskStatusCounts,
    runStatusCounts,
    incidentSeverityCounts,
    queueCounts: queueCounts.map((row) => ({
      queueName: row.queue_name,
      total: row.total,
      queued: row.queued_count,
      claimed: row.claimed_count,
      running: row.running_count,
    })),
    openIncidentCount: openIncidents.count,
    stalledTaskCount: stalledTasks.count,
    activeBackoffSourceCount: activeBackoffSources.count,
    activeInferenceCount: Number(inferenceCounts?.active_count || 0),
    expiredInferenceCount: Number(inferenceCounts?.expired_count || 0),
    invalidatedInferenceCount: Number(inferenceCounts?.invalidated_count || 0),
  };
}

/**
 * Upsert a price into current_prices. Returns 'new', 'changed', or 'unchanged'.
 */
export function upsertPrice(db, {
  sourceId, canonicalIngredientId, variantId, rawProductName,
  priceCents, priceUnit, pricePerStandardUnitCents, standardUnit,
  packageSize, priceType, pricingTier, confidence,
  instacartMarkupPct, sourceUrl, saleDates, inStock,
  imageUrl, brand, aisleCat
}) {
  const id = `${sourceId}:${canonicalIngredientId}:${variantId || 'default'}`;
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT price_cents FROM current_prices WHERE id = ?').get(id);

  if (!existing) {
    // New product
    db.prepare(`
      INSERT INTO current_prices (
        id, source_id, canonical_ingredient_id, variant_id, raw_product_name,
        price_cents, price_unit, price_per_standard_unit_cents, standard_unit,
        package_size, price_type, pricing_tier, confidence,
        instacart_markup_applied_pct, source_url, in_stock,
        image_url, brand, aisle_category,
        sale_start_date, sale_end_date,
        last_confirmed_at, last_changed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, sourceId, canonicalIngredientId, variantId, rawProductName,
      priceCents, priceUnit, pricePerStandardUnitCents, standardUnit,
      packageSize, priceType || 'regular', pricingTier || 'retail', confidence,
      instacartMarkupPct, sourceUrl, inStock !== undefined ? (inStock ? 1 : 0) : 1,
      imageUrl || null, brand || null, aisleCat || null,
      saleDates?.start || null, saleDates?.end || null,
      now, now, now
    );

    // Log the change
    db.prepare(`
      INSERT INTO price_changes (source_id, canonical_ingredient_id, variant_id, old_price_cents, new_price_cents, price_unit, price_type, pricing_tier, observed_at)
      VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)
    `).run(sourceId, canonicalIngredientId, variantId, priceCents, priceUnit, priceType || 'regular', pricingTier || 'retail', now);

    return 'new';
  }

  if (existing.price_cents !== priceCents) {
    // Price changed
    const changePct = existing.price_cents > 0
      ? ((priceCents - existing.price_cents) / existing.price_cents) * 100
      : null;

    db.prepare(`
      UPDATE current_prices SET
        price_cents = ?, raw_product_name = ?,
        price_per_standard_unit_cents = ?, package_size = ?,
        price_type = ?, confidence = ?,
        instacart_markup_applied_pct = ?, source_url = ?,
        in_stock = ?,
        image_url = COALESCE(?, image_url), brand = COALESCE(?, brand),
        aisle_category = COALESCE(?, aisle_category),
        sale_start_date = ?, sale_end_date = ?,
        last_confirmed_at = ?, last_changed_at = ?
      WHERE id = ?
    `).run(
      priceCents, rawProductName,
      pricePerStandardUnitCents, packageSize,
      priceType || 'regular', confidence,
      instacartMarkupPct, sourceUrl,
      inStock !== undefined ? (inStock ? 1 : 0) : 1,
      imageUrl || null, brand || null, aisleCat || null,
      saleDates?.start || null, saleDates?.end || null,
      now, now, id
    );

    // Log the change
    db.prepare(`
      INSERT INTO price_changes (source_id, canonical_ingredient_id, variant_id, old_price_cents, new_price_cents, price_unit, price_type, pricing_tier, change_pct, observed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sourceId, canonicalIngredientId, variantId, existing.price_cents, priceCents, priceUnit, priceType || 'regular', pricingTier || 'retail', changePct, now);

    return 'changed';
  }

  // Price unchanged - update confirmation timestamp, stock status, and new metadata
  db.prepare(`
    UPDATE current_prices SET last_confirmed_at = ?, in_stock = ?,
    image_url = COALESCE(?, image_url), brand = COALESCE(?, brand),
    aisle_category = COALESCE(?, aisle_category)
    WHERE id = ?
  `).run(
    now, inStock !== undefined ? (inStock ? 1 : 0) : 1,
    imageUrl || null, brand || null, aisleCat || null, id
  );
  return 'unchanged';
}

export function getStats(db) {
  const sources = db.prepare('SELECT COUNT(*) as count FROM source_registry').get();
  const ingredients = db.prepare('SELECT COUNT(*) as count FROM canonical_ingredients').get();
  const prices = db.prepare('SELECT COUNT(*) as count FROM current_prices').get();
  const changes = db.prepare('SELECT COUNT(*) as count FROM price_changes').get();
  const normMaps = db.prepare('SELECT COUNT(*) as count FROM normalization_map').get();
  let inStockCount = prices.count;
  let outOfStockCount = 0;
  try {
    const inStock = db.prepare('SELECT COUNT(*) as count FROM current_prices WHERE in_stock = 1').get();
    const outOfStock = db.prepare('SELECT COUNT(*) as count FROM current_prices WHERE in_stock = 0').get();
    inStockCount = inStock.count;
    outOfStockCount = outOfStock.count;
  } catch { /* in_stock column may not exist yet */ }

  return {
    sources: sources.count,
    canonicalIngredients: ingredients.count,
    currentPrices: prices.count,
    inStock: inStockCount,
    outOfStock: outOfStockCount,
    priceChanges: changes.count,
    normalizationMappings: normMaps.count
  };
}

export { DB_PATH, DATA_DIR };
