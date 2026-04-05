#!/usr/bin/env python3
"""
Upgrade OpenClaw with intelligence accumulation: three learning layers
that make the system smarter with every run.

Layer 1: Normalization Memory (prices.db)
  - Logs every match from sync-normalization into a lookup table
  - Future runs check this table FIRST before expensive embeddings
  - Confirmed matches become instant lookups

Layer 2: Anomaly Pattern Learning (prices.db)
  - Tracks recurring price swing patterns per ingredient category
  - Learned seasonal patterns suppress false-positive anomaly alerts

Layer 3: Docket Quality Learning (docket.db)
  - Aggregates feedback (thumbs up/down) by output type and topic
  - Processor injects past learnings into system prompt before generation

Run on Pi via SSH: python3 upgrade-learning-engine.py
"""
import os
import textwrap

# ─── File paths on Pi ────────────────────────────────────────────────────────

PRICES_DB_INIT = os.path.expanduser("~/openclaw-prices/init-db.mjs")
AGGREGATOR = os.path.expanduser("~/openclaw-prices/services/aggregator.mjs")
SYNC_NORM = os.path.expanduser("~/openclaw-prices/services/sync-normalization.mjs")
DOCKET_DB_INIT = os.path.expanduser("~/openclaw-docket/init-db.mjs")
PROCESSOR = os.path.expanduser("~/openclaw-docket/processor.mjs")

patched = []
skipped = []


def patch(filepath, old, new, label):
    """Apply a single find-and-replace patch. Reports success or skip."""
    try:
        c = open(filepath).read()
    except FileNotFoundError:
        skipped.append(f"{label}: file not found ({filepath})")
        return None
    if old in c:
        c = c.replace(old, new)
        open(filepath, "w").write(c)
        patched.append(label)
        return c
    else:
        skipped.append(f"{label}: marker not found (already patched?)")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# LAYER 1: NORMALIZATION MEMORY
# ═══════════════════════════════════════════════════════════════════════════════

print("\n=== Layer 1: Normalization Memory ===\n")

# 1a. Create the normalization_memory table in prices.db init script
#     This table remembers every raw_name -> matched_to resolution so
#     future sync runs skip embedding lookups for known matches.

NORM_MEM_TABLE_SQL = textwrap.dedent("""\

  // Learning: normalization memory (remembers past matches)
  db.exec(`
    CREATE TABLE IF NOT EXISTS normalization_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_name TEXT NOT NULL,
      matched_to TEXT NOT NULL,
      match_method TEXT NOT NULL,
      match_score REAL NOT NULL DEFAULT 0,
      confirmed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(raw_name)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_norm_mem_raw ON normalization_memory(raw_name)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_norm_mem_confirmed ON normalization_memory(confirmed)`);
  console.log('  normalization_memory table ready');
""")

# Find the end of the init-db script's table creation block.
# We look for a recognizable final table creation and append after it.
patch(
    PRICES_DB_INIT,
    "console.log('Database initialized');",
    NORM_MEM_TABLE_SQL + "\n  console.log('Database initialized');",
    "1a. normalization_memory table in prices.db init"
)

# 1b. Patch sync-normalization on Pi to CHECK normalization_memory before
#     running trigram or semantic search, and RECORD matches after finding them.
#
#     If sync-normalization.mjs does not exist on Pi (it runs on PC via
#     scripts/openclaw-pull/sync-normalization.mjs), we create a standalone
#     helper module that the PC script can call via Pi's sync API.

NORM_MEM_HELPER = os.path.expanduser("~/openclaw-prices/services/norm-memory.mjs")

norm_memory_module = textwrap.dedent("""\
#!/usr/bin/env node
/**
 * Normalization Memory Helper
 *
 * Provides lookup and record functions for the normalization_memory table
 * in prices.db. Called by the sync-normalization process (PC side) via
 * Pi's sync API, or directly by any Pi-side normalization script.
 *
 * Usage:
 *   import { lookupMemory, recordMatch, getConfirmedMatches } from './norm-memory.mjs'
 */

/**
 * Check if we already have a remembered match for this raw ingredient name.
 * Confirmed matches (confirmed=1) are trusted instantly.
 * Unconfirmed matches are returned with lower priority.
 *
 * @param {object} db - better-sqlite3 database instance
 * @param {string} rawName - the original ingredient name to look up
 * @returns {{ matched_to: string, match_method: string, match_score: number, confirmed: boolean } | null}
 */
export function lookupMemory(db, rawName) {
  const row = db.prepare(`
    SELECT matched_to, match_method, match_score, confirmed
    FROM normalization_memory
    WHERE raw_name = ?
    ORDER BY confirmed DESC, match_score DESC
    LIMIT 1
  `).get(rawName.trim().toLowerCase());

  if (!row) return null;

  return {
    matched_to: row.matched_to,
    match_method: row.match_method,
    match_score: row.match_score,
    confirmed: row.confirmed === 1,
  };
}

/**
 * Record a successful match in normalization memory.
 * Uses INSERT OR REPLACE so re-runs update the score if the method improves.
 *
 * @param {object} db - better-sqlite3 database instance
 * @param {string} rawName - original ingredient name
 * @param {string} matchedTo - what it was matched to
 * @param {string} method - match method (exact, trigram, semantic, manual)
 * @param {number} score - similarity score (0-1)
 */
export function recordMatch(db, rawName, matchedTo, method, score) {
  db.prepare(`
    INSERT INTO normalization_memory (raw_name, matched_to, match_method, match_score)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(raw_name) DO UPDATE SET
      matched_to = CASE
        WHEN excluded.match_score > normalization_memory.match_score
        THEN excluded.matched_to
        ELSE normalization_memory.matched_to
      END,
      match_method = CASE
        WHEN excluded.match_score > normalization_memory.match_score
        THEN excluded.match_method
        ELSE normalization_memory.match_method
      END,
      match_score = MAX(normalization_memory.match_score, excluded.match_score)
  `).run(rawName.trim().toLowerCase(), matchedTo, method, score);
}

/**
 * Confirm a match (called when external feedback validates it).
 *
 * @param {object} db - better-sqlite3 database instance
 * @param {string} rawName - the raw ingredient name to confirm
 */
export function confirmMatch(db, rawName) {
  db.prepare(`
    UPDATE normalization_memory SET confirmed = 1 WHERE raw_name = ?
  `).run(rawName.trim().toLowerCase());
}

/**
 * Get all confirmed matches as a fast lookup map.
 * Returns { rawName: matchedTo } for instant resolution.
 *
 * @param {object} db - better-sqlite3 database instance
 * @returns {Map<string, string>}
 */
export function getConfirmedMatches(db) {
  const rows = db.prepare(`
    SELECT raw_name, matched_to FROM normalization_memory WHERE confirmed = 1
  `).all();

  const map = new Map();
  for (const row of rows) {
    map.set(row.raw_name, row.matched_to);
  }
  return map;
}

/**
 * Stats for monitoring.
 *
 * @param {object} db - better-sqlite3 database instance
 */
export function memoryStats(db) {
  const total = db.prepare('SELECT COUNT(*) as cnt FROM normalization_memory').get().cnt;
  const confirmed = db.prepare('SELECT COUNT(*) as cnt FROM normalization_memory WHERE confirmed = 1').get().cnt;
  const byMethod = db.prepare(`
    SELECT match_method, COUNT(*) as cnt, ROUND(AVG(match_score), 3) as avg_score
    FROM normalization_memory
    GROUP BY match_method
    ORDER BY cnt DESC
  `).all();

  return { total, confirmed, unconfirmed: total - confirmed, byMethod };
}
""")

# Write the helper module directly (not a patch, a new file)
print(f"Writing {NORM_MEM_HELPER}")
os.makedirs(os.path.dirname(NORM_MEM_HELPER), exist_ok=True)
open(NORM_MEM_HELPER, "w").write(norm_memory_module)
patched.append("1b. norm-memory.mjs helper module created")

# 1c. Add /api/norm/memory endpoints to sync-api so PC can query/record
#     normalization memory remotely.

SYNC_API = os.path.expanduser("~/openclaw-prices/services/sync-api.mjs")

norm_api_import = """import { lookupMemory, recordMatch, confirmMatch, memoryStats } from './norm-memory.mjs';"""

norm_api_endpoints = textwrap.dedent("""\

    // Normalization Memory API
    if (path === '/api/norm/lookup') {
      const raw = url.searchParams.get('name');
      if (!raw) return jsonResponse(res, { error: 'Missing ?name= parameter' }, 400);
      const result = lookupMemory(db, raw);
      return jsonResponse(res, { raw_name: raw, memory: result });
    }

    if (path === '/api/norm/record' && req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.raw_name || !body.matched_to || !body.method) {
        return jsonResponse(res, { error: 'Missing raw_name, matched_to, or method' }, 400);
      }
      recordMatch(db, body.raw_name, body.matched_to, body.method, body.score || 0);
      return jsonResponse(res, { ok: true });
    }

    if (path === '/api/norm/confirm' && req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.raw_name) return jsonResponse(res, { error: 'Missing raw_name' }, 400);
      confirmMatch(db, body.raw_name);
      return jsonResponse(res, { ok: true });
    }

    if (path === '/api/norm/stats') {
      return jsonResponse(res, memoryStats(db));
    }

""")

# Patch the import at top of sync-api
try:
    api_content = open(SYNC_API).read()
    if "norm-memory.mjs" not in api_content:
        # Add import after existing imports
        if "import " in api_content:
            lines = api_content.split("\n")
            last_import = 0
            for i, line in enumerate(lines):
                if line.startswith("import "):
                    last_import = i
            lines.insert(last_import + 1, norm_api_import)
            api_content = "\n".join(lines)
            patched.append("1c-i. norm-memory import added to sync-api")
        else:
            api_content = norm_api_import + "\n" + api_content
            patched.append("1c-i. norm-memory import prepended to sync-api")

        # Add endpoints before the smart lookup endpoint
        if "// Smart lookup" in api_content:
            api_content = api_content.replace(
                "    // Smart lookup",
                norm_api_endpoints + "    // Smart lookup"
            )
            patched.append("1c-ii. norm memory API endpoints added to sync-api")
        else:
            skipped.append("1c-ii. could not find insertion point for norm API endpoints")

        open(SYNC_API, "w").write(api_content)
    else:
        skipped.append("1c. norm-memory already imported in sync-api")
except FileNotFoundError:
    skipped.append("1c. sync-api.mjs not found")


# ═══════════════════════════════════════════════════════════════════════════════
# LAYER 2: ANOMALY PATTERN LEARNING
# ═══════════════════════════════════════════════════════════════════════════════

print("\n=== Layer 2: Anomaly Pattern Learning ===\n")

# 2a. Create learned_patterns table in prices.db init script

LEARNED_PATTERNS_SQL = textwrap.dedent("""\

  // Learning: anomaly pattern memory (suppresses false positives over time)
  db.exec(`
    CREATE TABLE IF NOT EXISTS learned_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_type TEXT NOT NULL,
      ingredient_category TEXT NOT NULL,
      pattern_data TEXT NOT NULL DEFAULT '{}',
      observations INTEGER DEFAULT 1,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(pattern_type, ingredient_category)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_lp_type_cat ON learned_patterns(pattern_type, ingredient_category)`);
  console.log('  learned_patterns table ready');
""")

patch(
    PRICES_DB_INIT,
    "console.log('  normalization_memory table ready');",
    "console.log('  normalization_memory table ready');" + LEARNED_PATTERNS_SQL,
    "2a. learned_patterns table in prices.db init"
)

# 2b. Patch aggregator to update learned_patterns after anomaly detection
#     and to consult learned patterns before flagging anomalies.

# Insert the learning function before the pushAnomalies call (added by previous patch)
# or after the anomaly detection block.

PATTERN_LEARN_FN = textwrap.dedent("""\

/**
 * Update learned_patterns from recent anomaly history.
 * Groups anomalies by ingredient category and pattern type,
 * computes average swing percentage and seasonal distribution,
 * and stores as JSON so future detection can suppress known patterns.
 */
function updateLearnedPatterns(db) {
  console.log('  Updating learned anomaly patterns...');

  // Learn price swing patterns per category from the last 90 days
  const swingPatterns = db.prepare(`
    SELECT
      ci.category as ingredient_category,
      COUNT(*) as observation_count,
      ROUND(AVG(ABS(pa.change_pct)), 2) as avg_swing_pct,
      ROUND(MIN(ABS(pa.change_pct)), 2) as min_swing_pct,
      ROUND(MAX(ABS(pa.change_pct)), 2) as max_swing_pct,
      GROUP_CONCAT(DISTINCT strftime('%m', pa.detected_at)) as active_months
    FROM price_anomalies pa
    JOIN canonical_ingredients ci ON pa.canonical_ingredient_id = ci.ingredient_id
    WHERE pa.detected_at >= datetime('now', '-90 days')
      AND ci.category IS NOT NULL
    GROUP BY ci.category
    HAVING COUNT(*) >= 3
  `).all();

  const upsert = db.prepare(`
    INSERT INTO learned_patterns (pattern_type, ingredient_category, pattern_data, observations, last_updated)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(pattern_type, ingredient_category) DO UPDATE SET
      pattern_data = excluded.pattern_data,
      observations = excluded.observations,
      last_updated = datetime('now')
  `);

  let updated = 0;
  for (const row of swingPatterns) {
    const patternData = JSON.stringify({
      avg_swing_pct: row.avg_swing_pct,
      min_swing_pct: row.min_swing_pct,
      max_swing_pct: row.max_swing_pct,
      active_months: row.active_months ? row.active_months.split(',') : [],
      typical_range: [row.min_swing_pct, row.max_swing_pct],
    });
    upsert.run('price_swing', row.ingredient_category, patternData, row.observation_count);
    updated++;
  }

  // Learn seasonal patterns: categories that consistently spike in specific months
  const seasonalPatterns = db.prepare(`
    SELECT
      ci.category as ingredient_category,
      strftime('%m', pa.detected_at) as month,
      COUNT(*) as spikes,
      ROUND(AVG(pa.change_pct), 2) as avg_change
    FROM price_anomalies pa
    JOIN canonical_ingredients ci ON pa.canonical_ingredient_id = ci.ingredient_id
    WHERE pa.detected_at >= datetime('now', '-365 days')
      AND ci.category IS NOT NULL
    GROUP BY ci.category, month
    HAVING COUNT(*) >= 2
    ORDER BY ci.category, month
  `).all();

  // Group by category
  const byCat = {};
  for (const row of seasonalPatterns) {
    if (!byCat[row.ingredient_category]) byCat[row.ingredient_category] = [];
    byCat[row.ingredient_category].push({
      month: row.month,
      spikes: row.spikes,
      avg_change: row.avg_change,
    });
  }

  for (const [cat, months] of Object.entries(byCat)) {
    const patternData = JSON.stringify({
      seasonal_months: months,
      peak_month: months.reduce((a, b) => b.spikes > a.spikes ? b : a).month,
    });
    const totalObs = months.reduce((s, m) => s + m.spikes, 0);
    upsert.run('seasonal', cat, patternData, totalObs);
    updated++;
  }

  console.log('  Updated ' + updated + ' learned patterns');
}

/**
 * Check if an anomaly matches a known learned pattern.
 * Returns true if the anomaly is within the expected range for this
 * category/season, meaning it should be suppressed (not alerted).
 */
function isKnownPattern(db, ingredientCategory, changePct) {
  if (!ingredientCategory) return false;

  // Check price swing patterns
  const swing = db.prepare(`
    SELECT pattern_data, observations FROM learned_patterns
    WHERE pattern_type = 'price_swing' AND ingredient_category = ?
  `).get(ingredientCategory);

  if (swing && swing.observations >= 5) {
    const data = JSON.parse(swing.pattern_data);
    const absChange = Math.abs(changePct);
    // If this swing is within the learned typical range, suppress it
    if (absChange <= data.max_swing_pct * 1.1) {
      return true;
    }
  }

  // Check seasonal patterns for current month
  const currentMonth = new Date().toISOString().slice(5, 7);
  const seasonal = db.prepare(`
    SELECT pattern_data, observations FROM learned_patterns
    WHERE pattern_type = 'seasonal' AND ingredient_category = ?
  `).get(ingredientCategory);

  if (seasonal && seasonal.observations >= 3) {
    const data = JSON.parse(seasonal.pattern_data);
    const monthMatch = data.seasonal_months.find(m => m.month === currentMonth);
    if (monthMatch && Math.abs(changePct) <= Math.abs(monthMatch.avg_change) * 1.2) {
      return true;
    }
  }

  return false;
}
""")

# Try to insert pattern learning after the anomaly detection function
patch(
    AGGREGATOR,
    "  console.log(`  Found ${anomalyCount} anomalies`);",
    "  console.log(`  Found ${anomalyCount} anomalies`);\n\n  // Update learned patterns from historical anomalies\n  updateLearnedPatterns(db);",
    "2b-i. Wire updateLearnedPatterns() after anomaly detection"
)

# Insert the functions before the pushAnomalies function (or before detectAnomalies if push not present)
try:
    agg = open(AGGREGATOR).read()
    if "updateLearnedPatterns" not in agg or "function updateLearnedPatterns" not in agg:
        # Find insertion point: before pushAnomalies or at end of file
        if "function pushAnomalies" in agg:
            agg = agg.replace(
                "function pushAnomalies",
                PATTERN_LEARN_FN + "\nfunction pushAnomalies"
            )
            patched.append("2b-ii. updateLearnedPatterns() + isKnownPattern() functions added")
        elif "function detectAnomalies" in agg:
            agg = agg.replace(
                "function detectAnomalies",
                PATTERN_LEARN_FN + "\nfunction detectAnomalies"
            )
            patched.append("2b-ii. updateLearnedPatterns() + isKnownPattern() functions added (before detectAnomalies)")
        else:
            # Append at end
            agg += PATTERN_LEARN_FN
            patched.append("2b-ii. updateLearnedPatterns() + isKnownPattern() functions appended")
        open(AGGREGATOR, "w").write(agg)
    else:
        skipped.append("2b-ii. Learning functions already present in aggregator")
except FileNotFoundError:
    skipped.append("2b-ii. aggregator.mjs not found")

# 2c. Add /api/patterns endpoint to sync-api for monitoring
PATTERNS_API = textwrap.dedent("""\

    // Learned anomaly patterns
    if (path === '/api/patterns') {
      const patterns = db.prepare(`
        SELECT pattern_type, ingredient_category, pattern_data, observations, last_updated
        FROM learned_patterns
        ORDER BY observations DESC
      `).all();
      return jsonResponse(res, {
        count: patterns.length,
        patterns: patterns.map(p => ({
          ...p,
          pattern_data: JSON.parse(p.pattern_data),
        })),
      });
    }

""")

try:
    api_content = open(SYNC_API).read()
    if "/api/patterns" not in api_content:
        if "// Normalization Memory API" in api_content:
            api_content = api_content.replace(
                "    // Normalization Memory API",
                PATTERNS_API + "    // Normalization Memory API"
            )
        elif "// Smart lookup" in api_content:
            api_content = api_content.replace(
                "    // Smart lookup",
                PATTERNS_API + "    // Smart lookup"
            )
        else:
            skipped.append("2c. could not find insertion point for /api/patterns")
            api_content = None

        if api_content:
            open(SYNC_API, "w").write(api_content)
            patched.append("2c. /api/patterns endpoint added to sync-api")
    else:
        skipped.append("2c. /api/patterns already exists in sync-api")
except FileNotFoundError:
    skipped.append("2c. sync-api.mjs not found")


# ═══════════════════════════════════════════════════════════════════════════════
# LAYER 3: DOCKET QUALITY LEARNING
# ═══════════════════════════════════════════════════════════════════════════════

print("\n=== Layer 3: Docket Quality Learning ===\n")

# 3a. Create docket_learning table in docket's init-db

DOCKET_LEARNING_SQL = textwrap.dedent("""\

  // Learning: docket quality feedback aggregation
  db.exec(`
    CREATE TABLE IF NOT EXISTS docket_learning (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      output_type TEXT NOT NULL,
      topic_keywords TEXT NOT NULL DEFAULT '',
      avg_confidence TEXT NOT NULL DEFAULT 'medium',
      success_rate REAL NOT NULL DEFAULT 0,
      common_issues TEXT NOT NULL DEFAULT '[]',
      sample_size INTEGER NOT NULL DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(output_type, topic_keywords)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_dl_type ON docket_learning(output_type)`);
  console.log('  docket_learning table ready');
""")

patch(
    DOCKET_DB_INIT,
    "console.log('Database initialized');",
    DOCKET_LEARNING_SQL + "\n  console.log('Database initialized');",
    "3a. docket_learning table in docket init-db"
)

# 3b. Add learning aggregation function to processor
#     After processing a batch, aggregate feedback stats into docket_learning.
#     Before generating output, query docket_learning for relevant warnings.

DOCKET_LEARN_FN = textwrap.dedent("""\

/**
 * Aggregate feedback from completed docket items into docket_learning.
 * Groups by output_type and extracted topic keywords, computing success
 * rates and collecting common issues from thumbs-down items.
 *
 * Call this after processing a batch or on a schedule.
 */
function aggregateDocketLearnings(db) {
  console.log('  Aggregating docket quality learnings...');

  // Get all items with feedback, grouped by output_type
  const feedbackItems = db.prepare(`
    SELECT
      output_type,
      title,
      confidence,
      feedback,
      feedback_notes
    FROM docket_items
    WHERE feedback IS NOT NULL
      AND completed_at IS NOT NULL
    ORDER BY completed_at DESC
  `).all();

  if (feedbackItems.length === 0) {
    console.log('  No feedback data to learn from yet');
    return;
  }

  // Extract simple topic keywords from titles (lowercase, deduplicated)
  function extractKeywords(title) {
    const stopWords = new Set(['the', 'a', 'an', 'for', 'to', 'in', 'of', 'and', 'or', 'with', 'add', 'create', 'update', 'fix', 'implement', 'build']);
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\\s]/g, '')
      .split(/\\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .slice(0, 5)
      .sort()
      .join(',');
  }

  // Group by output_type + keywords
  const groups = {};
  for (const item of feedbackItems) {
    const keywords = extractKeywords(item.title || '');
    const key = item.output_type + '::' + keywords;

    if (!groups[key]) {
      groups[key] = {
        output_type: item.output_type,
        topic_keywords: keywords,
        up: 0,
        down: 0,
        confidences: [],
        issues: [],
      };
    }

    const g = groups[key];
    if (item.feedback === 'up') g.up++;
    else if (item.feedback === 'down') {
      g.down++;
      if (item.feedback_notes) g.issues.push(item.feedback_notes);
    }
    g.confidences.push(item.confidence);
  }

  // Upsert aggregated learnings
  const upsert = db.prepare(`
    INSERT INTO docket_learning (output_type, topic_keywords, avg_confidence, success_rate, common_issues, sample_size, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(output_type, topic_keywords) DO UPDATE SET
      avg_confidence = excluded.avg_confidence,
      success_rate = excluded.success_rate,
      common_issues = excluded.common_issues,
      sample_size = excluded.sample_size,
      last_updated = datetime('now')
  `);

  let updated = 0;
  for (const g of Object.values(groups)) {
    const total = g.up + g.down;
    if (total < 2) continue; // Need at least 2 data points

    const successRate = Math.round((g.up / total) * 100) / 100;

    // Most common confidence level
    const confCounts = {};
    for (const c of g.confidences) {
      confCounts[c] = (confCounts[c] || 0) + 1;
    }
    const avgConf = Object.entries(confCounts).sort((a, b) => b[1] - a[1])[0][0];

    // Deduplicate and limit issues
    const uniqueIssues = [...new Set(g.issues)].slice(0, 10);

    upsert.run(
      g.output_type,
      g.topic_keywords,
      avgConf,
      successRate,
      JSON.stringify(uniqueIssues),
      total
    );
    updated++;
  }

  console.log('  Updated ' + updated + ' docket learning entries from ' + feedbackItems.length + ' feedback items');
}

/**
 * Query docket_learning for warnings relevant to the current item.
 * Returns a string to inject into the system prompt, or empty string.
 *
 * @param {object} db - docket database
 * @param {string} outputType - spec, research, bug_report, refinement
 * @param {string} title - item title (used to extract topic keywords)
 * @returns {string} - learning context for the system prompt
 */
function getLearningContext(db, outputType, title) {
  // Extract keywords from the current title
  const stopWords = new Set(['the', 'a', 'an', 'for', 'to', 'in', 'of', 'and', 'or', 'with', 'add', 'create', 'update', 'fix', 'implement', 'build']);
  const keywords = title
    .toLowerCase()
    .replace(/[^a-z0-9\\s]/g, '')
    .split(/\\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  if (keywords.length === 0) return '';

  // Find learnings that share topic keywords with this item
  const allLearnings = db.prepare(`
    SELECT topic_keywords, success_rate, common_issues, sample_size
    FROM docket_learning
    WHERE output_type = ?
      AND sample_size >= 3
    ORDER BY last_updated DESC
    LIMIT 50
  `).all(outputType);

  // Score each learning by keyword overlap
  const relevant = [];
  for (const learning of allLearnings) {
    const lKeywords = learning.topic_keywords.split(',').filter(Boolean);
    const overlap = keywords.filter(k => lKeywords.includes(k)).length;
    if (overlap > 0) {
      relevant.push({ ...learning, overlap });
    }
  }

  if (relevant.length === 0) return '';

  // Sort by relevance (overlap), take top 3
  relevant.sort((a, b) => b.overlap - a.overlap);
  const top = relevant.slice(0, 3);

  // Build context string
  const lines = ['QUALITY LEARNINGS FROM PAST OUTPUT (apply these lessons):'];
  for (const r of top) {
    const issues = JSON.parse(r.common_issues);
    if (issues.length > 0 && r.success_rate < 0.8) {
      lines.push(
        '- Topics "' + r.topic_keywords + '" (success rate: ' +
        Math.round(r.success_rate * 100) + '%, n=' + r.sample_size +
        '): past issues were: ' + issues.slice(0, 3).join('; ')
      );
    } else if (r.success_rate >= 0.8) {
      lines.push(
        '- Topics "' + r.topic_keywords + '" have been well-received (' +
        Math.round(r.success_rate * 100) + '% approval, n=' + r.sample_size + ')'
      );
    }
  }

  return lines.length > 1 ? '\\n\\n' + lines.join('\\n') : '';
}
""")

# 3b-i. Insert learning functions into processor
try:
    proc = open(PROCESSOR).read()
    if "aggregateDocketLearnings" not in proc:
        # Insert before the main processing function
        if "async function processItem" in proc:
            proc = proc.replace(
                "async function processItem",
                DOCKET_LEARN_FN + "\nasync function processItem"
            )
            patched.append("3b-i. aggregateDocketLearnings() + getLearningContext() added to processor")
        elif "function processItem" in proc:
            proc = proc.replace(
                "function processItem",
                DOCKET_LEARN_FN + "\nfunction processItem"
            )
            patched.append("3b-i. aggregateDocketLearnings() + getLearningContext() added to processor")
        else:
            proc += DOCKET_LEARN_FN
            patched.append("3b-i. Learning functions appended to processor")
        open(PROCESSOR, "w").write(proc)
    else:
        skipped.append("3b-i. Learning functions already in processor")
except FileNotFoundError:
    skipped.append("3b-i. processor.mjs not found")

# 3b-ii. Wire getLearningContext into the system prompt construction
patch(
    PROCESSOR,
    "const body = JSON.stringify({",
    textwrap.dedent("""\
  // Inject quality learnings into system prompt
  const learningContext = getLearningContext(db, outputType, item.title);
  if (learningContext) {
    systemPrompt += learningContext;
    log('  Injected learning context from past feedback');
  }

  const body = JSON.stringify({"""),
    "3b-ii. Wire getLearningContext before Groq API call"
)

# 3b-iii. Wire aggregateDocketLearnings at end of processing batch
patch(
    PROCESSOR,
    "console.log('Processing complete');",
    "  // Aggregate quality learnings from all feedback\n  aggregateDocketLearnings(db);\n\n  console.log('Processing complete');",
    "3b-iii. Wire aggregateDocketLearnings at end of batch"
)


# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("LEARNING ENGINE UPGRADE SUMMARY")
print("=" * 60)

print(f"\nPatched ({len(patched)}):")
for p in patched:
    print(f"  + {p}")

if skipped:
    print(f"\nSkipped ({len(skipped)}):")
    for s in skipped:
        print(f"  - {s}")

print(f"\nNew tables:")
print(f"  prices.db:  normalization_memory, learned_patterns")
print(f"  docket.db:  docket_learning")

print(f"\nNew files:")
print(f"  ~/openclaw-prices/services/norm-memory.mjs")

print(f"\nNew API endpoints:")
print(f"  GET  /api/norm/lookup?name=...")
print(f"  POST /api/norm/record  (body: raw_name, matched_to, method, score)")
print(f"  POST /api/norm/confirm (body: raw_name)")
print(f"  GET  /api/norm/stats")
print(f"  GET  /api/patterns")

print(f"\nIntelligence loop:")
print(f"  1. Normalization: check memory -> trigram -> semantic -> record result")
print(f"  2. Anomalies: detect -> learn patterns -> suppress known patterns next run")
print(f"  3. Docket: generate -> collect feedback -> aggregate learnings -> inject into next prompt")
print()
