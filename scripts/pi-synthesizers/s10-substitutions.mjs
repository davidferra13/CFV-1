#!/usr/bin/env node
/**
 * S10: Ingredient Substitution Suggester
 * Finds same-category alternatives with price/season comparison.
 * Deterministic category matching, NOT AI recipe suggestion.
 *
 * Schedule: Weekly (Wednesday 5am)
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'prices.db');

// Sub-category groupings for meaningful substitutions
const SUBSTITUTION_GROUPS = {
  // Proteins
  'chicken breast':   'lean_poultry',
  'chicken thigh':    'dark_poultry',
  'turkey breast':    'lean_poultry',
  'duck breast':      'dark_poultry',
  'pork chop':        'pork_cut',
  'pork tenderloin':  'pork_cut',
  'pork loin':        'pork_cut',
  'beef tenderloin':  'premium_beef',
  'filet mignon':     'premium_beef',
  'ribeye':           'premium_beef',
  'strip steak':      'premium_beef',
  'sirloin':          'everyday_beef',
  'chuck':            'braising_beef',
  'brisket':          'braising_beef',
  'short rib':        'braising_beef',
  'ground beef':      'ground_meat',
  'ground turkey':    'ground_meat',
  'ground pork':      'ground_meat',
  'ground chicken':   'ground_meat',
  // Seafood
  'salmon':           'rich_fish',
  'tuna':             'rich_fish',
  'swordfish':        'rich_fish',
  'cod':              'white_fish',
  'halibut':          'white_fish',
  'haddock':          'white_fish',
  'tilapia':          'white_fish',
  'bass':             'white_fish',
  'snapper':          'white_fish',
  'shrimp':           'shellfish',
  'scallop':          'shellfish',
  'lobster':          'premium_shellfish',
  'crab':             'premium_shellfish',
  // Greens
  'kale':             'hearty_green',
  'collard':          'hearty_green',
  'swiss chard':      'hearty_green',
  'spinach':          'tender_green',
  'arugula':          'tender_green',
  'watercress':       'tender_green',
  'romaine':          'lettuce',
  'iceberg':          'lettuce',
  'butter lettuce':   'lettuce',
  // Alliums
  'onion':            'allium',
  'shallot':          'allium',
  'leek':             'allium',
  'scallion':         'allium',
  'garlic':           'allium',
  // Fats
  'butter':           'cooking_fat',
  'ghee':             'cooking_fat',
  'olive oil':        'cooking_oil',
  'avocado oil':      'cooking_oil',
  'vegetable oil':    'neutral_oil',
  'canola oil':       'neutral_oil',
  'coconut oil':      'cooking_fat',
  // Starches
  'potato':           'starchy_side',
  'sweet potato':     'starchy_side',
  'rice':             'grain_side',
  'quinoa':           'grain_side',
  'couscous':         'grain_side',
  'farro':            'grain_side',
  'pasta':            'pasta',
  'orzo':             'pasta',
};

function getSubGroup(name) {
  const lower = name.toLowerCase();
  for (const [key, group] of Object.entries(SUBSTITUTION_GROUPS)) {
    if (lower.includes(key)) return group;
  }
  return null;
}

async function main() {
  const db = new Database(DB_PATH, { timeout: 300000 });
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 300000');

  console.log('\n=== S10: Substitution Suggester ===');

  // Clear and rebuild
  db.prepare(`DELETE FROM synthesis_substitutions`).run();

  // Get food ingredients with prices
  const ingredients = db.prepare(`
    SELECT
      ci.id,
      ci.name,
      ci.category,
      AVG(cp.price_cents) as avg_price
    FROM canonical_ingredients ci
    JOIN current_prices cp ON cp.ingredient_id = ci.id
    WHERE ci.is_food = 1
    AND cp.scraped_at > datetime('now', '-14 days')
    AND cp.price_cents > 0
    GROUP BY ci.id
  `).all();

  console.log(`  Food ingredients with prices: ${ingredients.length}`);

  // Build sub-group index
  const groupIndex = new Map(); // group -> [ingredients]
  for (const ing of ingredients) {
    const group = getSubGroup(ing.name);
    if (!group) continue;
    if (!groupIndex.has(group)) groupIndex.set(group, []);
    groupIndex.get(group).push(ing);
  }

  console.log(`  Substitution groups found: ${groupIndex.size}`);

  // Check seasonal status
  const currentMonth = new Date().getMonth() + 1;
  const getSeasonalStatus = db.prepare(`
    SELECT status FROM synthesis_seasonal_scores
    WHERE ingredient_id = ? AND month = ?
  `);

  const insert = db.prepare(`
    INSERT INTO synthesis_substitutions
      (ingredient_id, ingredient_name, substitute_id, substitute_name,
       category, price_delta_pct, seasonal_match, confidence, reason, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  let totalSubs = 0;

  const processBatch = db.transaction(() => {
    for (const [group, items] of groupIndex) {
      if (items.length < 2) continue;

      // Sort by price
      items.sort((a, b) => a.avg_price - b.avg_price);

      // Generate substitution pairs within the group
      for (let i = 0; i < items.length; i++) {
        for (let j = 0; j < items.length; j++) {
          if (i === j) continue;

          const original = items[i];
          const substitute = items[j];

          // Price delta (positive = sub is more expensive)
          const priceDelta = original.avg_price > 0
            ? Math.round(((substitute.avg_price - original.avg_price) / original.avg_price) * 10000) / 100
            : 0;

          // Seasonal check
          const origSeason = getSeasonalStatus.get(original.id, currentMonth);
          const subSeason = getSeasonalStatus.get(substitute.id, currentMonth);
          const seasonalMatch = (origSeason?.status === subSeason?.status) ? 1 : 0;

          // Confidence (higher for closer price + same season)
          let confidence = 0.7; // base for same group
          if (seasonalMatch) confidence += 0.15;
          if (Math.abs(priceDelta) < 20) confidence += 0.1;
          if (Math.abs(priceDelta) > 50) confidence -= 0.2;
          confidence = Math.max(0.3, Math.min(1.0, confidence));

          // Generate reason
          let reason = `Same ${group.replace(/_/g, ' ')}`;
          if (priceDelta < -10) reason += `, ${Math.abs(Math.round(priceDelta))}% cheaper`;
          else if (priceDelta > 10) reason += `, ${Math.round(priceDelta)}% more`;
          if (subSeason?.status === 'peak_season') reason += ', in season';

          insert.run(
            original.id,
            original.name,
            substitute.id,
            substitute.name,
            group,
            priceDelta,
            seasonalMatch,
            Math.round(confidence * 100) / 100,
            reason
          );
          totalSubs++;
        }
      }
    }
  });

  processBatch();

  console.log(`\n  Substitutions generated: ${totalSubs}`);

  // Show best money-saving substitutions
  const savings = db.prepare(`
    SELECT ingredient_name, substitute_name, price_delta_pct, reason
    FROM synthesis_substitutions
    WHERE price_delta_pct < -15 AND confidence >= 0.7
    ORDER BY price_delta_pct ASC
    LIMIT 15
  `).all();

  if (savings.length) {
    console.log(`\n  Best savings substitutions:`);
    for (const s of savings) {
      console.log(`    ${s.ingredient_name} -> ${s.substitute_name} (${s.price_delta_pct}%): ${s.reason}`);
    }
  }

  console.log('=== S10 Complete ===\n');
  db.close();
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
