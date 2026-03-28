/**
 * Add fuzzy/trigram search fallback to OpenClaw's smart-lookup.
 * When exact alias and LIKE search both miss, try Levenshtein + token matching.
 * Run on Pi: node add-fuzzy-search.mjs
 *
 * This patches lib/smart-lookup.mjs to add a fuzzySearch() function
 * and wires it as Step 4 in smartLookup().
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const lookupPath = join(__dirname, 'lib', 'smart-lookup.mjs');

let code = readFileSync(lookupPath, 'utf8');

// Check if already patched
if (code.includes('fuzzySearch')) {
  console.log('smart-lookup.mjs already has fuzzy search. Skipping.');
  process.exit(0);
}

// Add the fuzzy search function before the smartLookup export
const FUZZY_CODE = `
/**
 * Levenshtein distance (edit distance) between two strings.
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

/**
 * Token-based similarity: what fraction of query tokens appear in the candidate name?
 */
function tokenSimilarity(query, candidateName) {
  const qTokens = query.toLowerCase().split(/\\s+/);
  const cTokens = candidateName.toLowerCase().split(/[\\s,()]+/);
  let matched = 0;
  for (const qt of qTokens) {
    if (qt.length < 2) continue;
    // Check if any candidate token starts with or contains the query token
    if (cTokens.some(ct => ct.startsWith(qt) || ct.includes(qt) || qt.includes(ct))) {
      matched++;
    }
  }
  return qTokens.length > 0 ? matched / qTokens.length : 0;
}

/**
 * Fuzzy search: find the best matching canonical ingredient using
 * token matching + Levenshtein distance. Prioritizes priced items.
 * Only returns results above a minimum similarity threshold.
 */
function fuzzySearch(db, query) {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return null;

  // Get all canonical ingredients (cached in memory for performance)
  if (!fuzzySearch._cache || fuzzySearch._cacheTime < Date.now() - 300000) {
    fuzzySearch._cache = db.prepare(
      'SELECT ingredient_id, name, category FROM canonical_ingredients'
    ).all();
    fuzzySearch._cacheTime = Date.now();
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const ci of fuzzySearch._cache) {
    const name = ci.name.toLowerCase();

    // Token similarity (0-1)
    const tokenScore = tokenSimilarity(q, name);
    if (tokenScore < 0.5) continue; // Skip if less than half the tokens match

    // Levenshtein-based similarity (0-1)
    const maxLen = Math.max(q.length, name.length);
    const editDist = levenshtein(q, name);
    const levScore = 1 - (editDist / maxLen);

    // Combined score (token match matters more)
    const score = tokenScore * 0.7 + levScore * 0.3;

    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      bestMatch = ci;
    }
  }

  if (!bestMatch) return null;

  // Return in same format as smartLookup
  const priceInfo = db.prepare(\`
    SELECT MIN(cp.price_cents) as best_price,
           (SELECT cp2.price_unit FROM current_prices cp2 WHERE cp2.canonical_ingredient_id = ? ORDER BY cp2.price_cents ASC LIMIT 1) as best_unit,
           (SELECT sr.name FROM current_prices cp2 JOIN source_registry sr ON cp2.source_id = sr.source_id WHERE cp2.canonical_ingredient_id = ? ORDER BY cp2.price_cents ASC LIMIT 1) as best_store,
           COUNT(*) as price_count
    FROM current_prices cp
    WHERE cp.canonical_ingredient_id = ?
  \`).get(bestMatch.ingredient_id, bestMatch.ingredient_id, bestMatch.ingredient_id);

  return {
    ingredient_id: bestMatch.ingredient_id,
    name: bestMatch.name,
    category: bestMatch.category,
    best_price: priceInfo?.best_price || null,
    best_unit: priceInfo?.best_unit || null,
    best_store: priceInfo?.best_store || null,
    price_count: priceInfo?.price_count || 0,
    match_method: 'fuzzy',
    match_score: bestScore,
  };
}

`;

// Insert fuzzy search function before smartLookup
const smartLookupIdx = code.indexOf('export function smartLookup');
if (smartLookupIdx < 0) {
  console.error('Could not find smartLookup function in smart-lookup.mjs');
  process.exit(1);
}

code = code.slice(0, smartLookupIdx) + FUZZY_CODE + code.slice(smartLookupIdx);

// Now add Step 4 (fuzzy fallback) inside smartLookup, after Step 3
// Find "return results || null;" at the end of smartLookup
// Find "return results || null;" line
const returnPattern = 'return results || null;';
const returnIdx = code.indexOf(returnPattern, smartLookupIdx);

if (returnIdx < 0) {
  console.error('Could not find return statement in smartLookup');
  process.exit(1);
}

// Replace the return statement with fuzzy fallback
const replacement = `// Step 3 result check
  if (results) return results;

  // Step 4: Fuzzy search fallback (token matching + Levenshtein)
  const fuzzyResult = fuzzySearch(db, q);
  if (fuzzyResult) return fuzzyResult;

  return null;`;

code = code.slice(0, returnIdx) + replacement + code.slice(returnIdx + returnPattern.length);

writeFileSync(lookupPath, code);
console.log('Added fuzzy search to smart-lookup.mjs');
console.log('Restart the API server to pick up changes.');
