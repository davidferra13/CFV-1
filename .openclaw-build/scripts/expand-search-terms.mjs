#!/usr/bin/env node
/**
 * expand-search-terms.mjs
 *
 * Reads all canonical ingredients from the OpenClaw SQLite database,
 * extracts root search terms, deduplicates by category, and writes
 * a categorized search-terms.json file for use by scrapers.
 */

import { getDb } from '../lib/db.mjs';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'data', 'search-terms.json');

// Words that describe preparation, size, or quality - not the ingredient itself
const MODIFIERS = new Set([
  'organic', 'boneless', 'skinless', 'raw', 'fresh', 'frozen',
  'large', 'small', 'medium', 'whole', 'sliced', 'diced',
  'chopped', 'minced', 'ground', 'crushed', 'dried', 'smoked',
  'roasted', 'unsalted', 'salted', 'sweetened', 'unsweetened',
  'cooked', 'uncooked', 'canned', 'jarred', 'bottled',
  'shredded', 'grated', 'powdered', 'granulated', 'extra',
  'virgin', 'lite', 'light', 'low', 'fat', 'free', 'reduced',
  'plain', 'flavored', 'natural', 'artificial', 'pure',
  'thick', 'thin', 'cut', 'trimmed', 'peeled', 'unpeeled',
  'pitted', 'seedless', 'skin', 'on', 'off', 'bone', 'in',
  'fine', 'coarse', 'mini', 'jumbo', 'baby', 'mature',
  'premium', 'standard', 'regular', 'style', 'traditional',
  'homestyle', 'classic', 'original', 'wild', 'caught',
  'farm', 'raised', 'grass', 'fed', 'cage', 'free',
  'range', 'conventional', 'non', 'gmo', 'kosher', 'halal',
]);

// Max meaningful words to keep from an ingredient id
const MAX_WORDS = 3;

// Target cap for total terms across all categories
const TOTAL_CAP = 300;

/**
 * Extract a root search term from an ingredient_id slug.
 * e.g. "chicken-breast-boneless-skinless" -> "chicken breast"
 */
function extractSearchTerm(ingredientId) {
  const words = ingredientId.split('-');
  const meaningful = [];

  for (const word of words) {
    if (MODIFIERS.has(word)) continue;
    meaningful.push(word);
    if (meaningful.length >= MAX_WORDS) break;
  }

  // If all words were modifiers, take the first word as-is
  if (meaningful.length === 0 && words.length > 0) {
    meaningful.push(words[0]);
  }

  return meaningful.join(' ');
}

function main() {
  const db = getDb();

  // Get total ingredient count
  const totalRow = db.prepare('SELECT COUNT(*) as count FROM canonical_ingredients').get();
  const sourceIngredients = totalRow.count;

  // Query all ingredients grouped by category
  const rows = db.prepare(`
    SELECT ingredient_id, name, category
    FROM canonical_ingredients
    ORDER BY category, ingredient_id
  `).all();

  // Group by category, extract and deduplicate search terms
  const categoryTerms = {};
  for (const row of rows) {
    const category = row.category.toLowerCase();
    if (!categoryTerms[category]) categoryTerms[category] = new Set();

    const term = extractSearchTerm(row.ingredient_id);
    if (term && term.length > 1) {
      categoryTerms[category].add(term);
    }
  }

  // Convert sets to sorted arrays
  const categories = Object.keys(categoryTerms).sort();
  const result = {};
  let totalTerms = 0;

  for (const cat of categories) {
    result[cat] = [...categoryTerms[cat]].sort();
    totalTerms += result[cat].length;
  }

  // If over the cap, trim proportionally across categories
  if (totalTerms > TOTAL_CAP) {
    const ratio = TOTAL_CAP / totalTerms;
    let trimmedTotal = 0;

    for (const cat of categories) {
      const target = Math.max(3, Math.round(result[cat].length * ratio));
      // Keep a balanced sample: take evenly spaced items
      if (result[cat].length > target) {
        const step = result[cat].length / target;
        const sampled = [];
        for (let i = 0; i < target; i++) {
          sampled.push(result[cat][Math.floor(i * step)]);
        }
        result[cat] = sampled.sort();
      }
      trimmedTotal += result[cat].length;
    }

    totalTerms = trimmedTotal;
  }

  // Add metadata
  result._meta = {
    generated_at: new Date().toISOString(),
    total_terms: totalTerms,
    source_ingredients: sourceIngredients,
  };

  // Write output
  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));

  // Print summary
  console.log('Search terms generated successfully.');
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(`Source ingredients: ${sourceIngredients}`);
  console.log(`Total search terms: ${totalTerms}`);
  console.log('');
  console.log('Per category:');
  for (const cat of categories) {
    console.log(`  ${cat}: ${result[cat].length} terms`);
  }
}

main();
