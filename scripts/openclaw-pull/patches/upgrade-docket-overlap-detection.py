#!/usr/bin/env python3
"""
Add overlap detection to docket processor:
1. Patch context-loader.mjs with checkOverlap() function
   - Reads project-map, product-blueprint, app-complete-audit from chefflow-mirror
   - Extracts built features (checkmarks, "done", "complete", route paths)
   - Compares docket item fields against built features
   - Returns { overlaps, existingFeature, confidence }
2. Patch processor.mjs to call checkOverlap() before AI
   - High confidence overlap: auto-skip, set status 'flagged'
   - Medium confidence overlap: inject warning into prompt context
   - No overlap: proceed normally
"""
import os

# =============================================================================
# PART 1: Patch context-loader.mjs - add checkOverlap() export
# =============================================================================

CONTEXT_LOADER = os.path.expanduser("~/openclaw-docket/context-loader.mjs")

c = open(CONTEXT_LOADER).read()

# Add imports at the top (after existing imports)
old_imports = "import path from 'path';"
new_imports = """import path from 'path';
import { readdirSync, existsSync } from 'fs';"""

if old_imports in c and "readdirSync" not in c:
    c = c.replace(old_imports, new_imports)
    print("1a. Added readdirSync/existsSync imports")
else:
    print("1a. SKIP: imports already present or marker not found")

# Add the checkOverlap function at the end of the file
overlap_function = '''

// --- Overlap Detection (added by upgrade-docket-overlap-detection.py) ---

const MIRROR_DIR = path.join(os.homedir(), 'chefflow-mirror');
const PROJECT_MAP_DIR = path.join(MIRROR_DIR, 'project-map');
const BLUEPRINT_PATH = path.join(MIRROR_DIR, 'docs', 'product-blueprint.md');
const AUDIT_PATH = path.join(MIRROR_DIR, 'docs', 'app-complete-audit.md');

function extractBuiltFeatures() {
  const features = {
    routes: [],       // e.g. /dashboard, /settings/billing
    keywords: [],     // e.g. "recipe", "calendar", "inventory"
    titles: [],       // completed feature titles
  };

  // 1. Read project-map files for completed features
  if (existsSync(PROJECT_MAP_DIR)) {
    const mapFiles = readdirSync(PROJECT_MAP_DIR).filter(f => f.endsWith('.md'));
    for (const file of mapFiles) {
      try {
        const content = readFileSync(path.join(PROJECT_MAP_DIR, file), 'utf8');
        // Extract route paths
        const routeMatches = content.match(/\\/[a-z][a-z0-9\\-\\/]*/g);
        if (routeMatches) features.routes.push(...routeMatches);
        // Extract checked items (lines with [x] or checkmarks)
        const checkedLines = content.match(/^.*(?:\\[x\\]|\\[X\\]|done|complete|shipped|built|live).*$/gmi);
        if (checkedLines) {
          for (const line of checkedLines) {
            const cleaned = line.replace(/^[\\s\\-*]+/, '').replace(/\\[x\\]/gi, '').trim();
            if (cleaned.length > 3) features.titles.push(cleaned.toLowerCase());
          }
        }
      } catch {}
    }
  }

  // 2. Read product-blueprint for checked items
  if (existsSync(BLUEPRINT_PATH)) {
    try {
      const blueprint = readFileSync(BLUEPRINT_PATH, 'utf8');
      const checkedItems = blueprint.match(/^.*\\[x\\].*$/gmi);
      if (checkedItems) {
        for (const line of checkedItems) {
          const cleaned = line.replace(/^[\\s\\-*]+/, '').replace(/\\[x\\]/gi, '').trim();
          if (cleaned.length > 3) {
            features.titles.push(cleaned.toLowerCase());
            // Extract feature keywords from checked items
            const words = cleaned.split(/[\\s,;:()\\[\\]]+/).filter(w => w.length > 3);
            features.keywords.push(...words.map(w => w.toLowerCase()));
          }
        }
      }
    } catch {}
  }

  // 3. Read app-complete-audit (first 500 lines) for route listing
  if (existsSync(AUDIT_PATH)) {
    try {
      const audit = readFileSync(AUDIT_PATH, 'utf8');
      const lines = audit.split('\\n').slice(0, 500);
      for (const line of lines) {
        const routeMatch = line.match(/`(\\/[a-z][a-z0-9\\-\\/]*)`/);
        if (routeMatch) features.routes.push(routeMatch[1]);
        // Also grab headings as feature names
        const headingMatch = line.match(/^#{1,3}\\s+(.+)/);
        if (headingMatch) {
          features.titles.push(headingMatch[1].toLowerCase().trim());
        }
      }
    } catch {}
  }

  // Deduplicate
  features.routes = [...new Set(features.routes)];
  features.keywords = [...new Set(features.keywords)];
  features.titles = [...new Set(features.titles)];

  return features;
}

/**
 * Check if a docket item overlaps with an already-built feature.
 * @param {object} item - docket item with title, whats_wrong, where_in_app
 * @param {object} db - better-sqlite3 database instance (docket.db)
 * @returns {{ overlaps: boolean, existingFeature: string|null, confidence: 'high'|'medium'|'low' }}
 */
export function checkOverlap(item, db) {
  const builtFeatures = extractBuiltFeatures();
  const itemText = [
    item.title || '',
    item.whats_wrong || '',
    item.where_in_app || '',
  ].join(' ').toLowerCase();

  let bestMatch = null;
  let matchScore = 0;

  // Check 1: Route path matches (highest signal)
  if (item.where_in_app) {
    const itemRoute = item.where_in_app.toLowerCase().trim();
    for (const route of builtFeatures.routes) {
      if (itemRoute === route || itemRoute.startsWith(route + '/') || route.startsWith(itemRoute + '/')) {
        // Route exists in the audit - the area is built
        matchScore += 3;
        bestMatch = bestMatch || ('Route exists: ' + route);
      }
    }
  }

  // Check 2: Feature keyword matches against checked blueprint items
  const itemWords = itemText.split(/[\\s,;:()\\[\\]]+/).filter(w => w.length > 3);
  for (const word of itemWords) {
    if (builtFeatures.keywords.includes(word)) {
      matchScore += 1;
    }
  }

  // Check 3: Title similarity against built feature titles
  const itemTitle = (item.title || '').toLowerCase();
  for (const title of builtFeatures.titles) {
    // Exact substring match
    if (title.includes(itemTitle) || itemTitle.includes(title)) {
      matchScore += 4;
      bestMatch = bestMatch || ('Title match: ' + title);
      break;
    }
    // Word overlap (at least 3 shared words of length > 3)
    const titleWords = title.split(/[\\s,;:()\\[\\]]+/).filter(w => w.length > 3);
    const shared = itemWords.filter(w => titleWords.includes(w));
    if (shared.length >= 3) {
      matchScore += 2;
      bestMatch = bestMatch || ('Keyword overlap with: ' + title + ' (' + shared.join(', ') + ')');
    }
  }

  // Check 4: Already-done docket items with matching title
  if (db) {
    try {
      const doneItems = db.prepare(
        "SELECT title FROM docket_items WHERE (status = 'done' OR status = 'pulled') AND title IS NOT NULL"
      ).all();
      for (const done of doneItems) {
        const doneTitle = (done.title || '').toLowerCase();
        if (doneTitle === itemTitle || (doneTitle.length > 10 && itemTitle.includes(doneTitle))) {
          matchScore += 5;
          bestMatch = bestMatch || ('Duplicate of done item: ' + done.title);
          break;
        }
      }
    } catch {}
  }

  // Determine confidence from score
  let confidence;
  if (matchScore >= 5) confidence = 'high';
  else if (matchScore >= 3) confidence = 'medium';
  else confidence = 'low';

  return {
    overlaps: matchScore >= 3,
    existingFeature: bestMatch,
    confidence,
  };
}
'''

if "export function checkOverlap" not in c:
    c += overlap_function
    print("1b. Added checkOverlap() function to context-loader.mjs")
else:
    print("1b. SKIP: checkOverlap already exists")

open(CONTEXT_LOADER, "w").write(c)
print("   context-loader.mjs saved")


# =============================================================================
# PART 2: Patch processor.mjs - call checkOverlap() before AI
# =============================================================================

PROCESSOR = os.path.expanduser("~/openclaw-docket/processor.mjs")

p = open(PROCESSOR).read()

# Add the import for checkOverlap
old_context_import = "import { loadContext } from './context-loader.mjs';"
new_context_import = "import { loadContext, checkOverlap } from './context-loader.mjs';"

if old_context_import in p and "checkOverlap" not in p:
    p = p.replace(old_context_import, new_context_import)
    print("2a. Added checkOverlap import to processor.mjs")
elif "checkOverlap" in p:
    print("2a. SKIP: checkOverlap import already present")
else:
    print("2a. SKIP: loadContext import not found")

# Insert overlap check before the AI call
# Look for the pattern where context is loaded and AI is called
old_process_block = """  // Load codebase context
  const { context, filesRead } = await loadContext(item);

  // Build prompts"""

new_process_block = """  // Load codebase context
  const { context, filesRead } = await loadContext(item);

  // --- Overlap Detection ---
  const overlap = checkOverlap(item, db);
  if (overlap.overlaps && overlap.confidence === 'high') {
    const msg = 'Overlap: feature already built: ' + overlap.existingFeature;
    log('  SKIP (high-confidence overlap): ' + msg);
    db.prepare(
      "UPDATE docket_items SET status = 'flagged', error_message = ?, completed_at = datetime('now') WHERE id = ?"
    ).run(msg, item.id);
    continue;
  }

  let overlapWarning = '';
  if (overlap.overlaps && overlap.confidence === 'medium') {
    overlapWarning = '\\n\\nWARNING: This docket item may overlap with an existing feature: ' +
      overlap.existingFeature + '. Confidence: medium. ' +
      'If this feature already exists, focus your output on what is DIFFERENT or MISSING ' +
      'rather than re-specifying what is already built. Call out the overlap explicitly.\\n';
    log('  Medium-confidence overlap detected: ' + overlap.existingFeature);
  }

  // Build prompts"""

if old_process_block in p and "Overlap Detection" not in p:
    p = p.replace(old_process_block, new_process_block)
    print("2b. Added overlap check before AI call")
elif "Overlap Detection" in p:
    print("2b. SKIP: overlap check already present")
else:
    print("2b. SKIP: process block marker not found")

# Inject the overlapWarning into the user prompt
old_user_prompt = """  const userPrompt = `DOCKET ITEM:
Title: ${item.title}"""

new_user_prompt = """  const userPrompt = `${overlapWarning}DOCKET ITEM:
Title: ${item.title}"""

if old_user_prompt in p and "overlapWarning" not in old_user_prompt:
    p = p.replace(old_user_prompt, new_user_prompt)
    print("2c. Injected overlapWarning into user prompt")
elif "${overlapWarning}" in p:
    print("2c. SKIP: overlapWarning already in user prompt")
else:
    print("2c. SKIP: user prompt marker not found")

open(PROCESSOR, "w").write(p)
print("   processor.mjs saved")

print("\nOverlap detection upgrade complete!")
print("  - context-loader.mjs: checkOverlap() reads project-map, blueprint, audit")
print("  - processor.mjs: auto-skips high-confidence overlaps, warns on medium")
