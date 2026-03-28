/**
 * OpenClaw - USDA CSV Import
 * Imports Foundation Foods and SR Legacy items from the bulk USDA food.csv.
 * These are the canonical, non-branded food items (~10,000 total).
 * Branded foods (2M+) are skipped since Flipp handles branded items.
 */

import { getDb } from '../lib/db.mjs';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, '..', 'data', 'usda-cache', 'food.csv');

const CATEGORY_MAP = {
  'dairy and egg products': 'dairy',
  'spices and herbs': 'spices',
  'baby foods': 'pantry',
  'fats and oils': 'oils',
  'poultry products': 'poultry',
  'soups, sauces, and gravies': 'pantry',
  'sausages and luncheon meats': 'pork',
  'breakfast cereals': 'grains',
  'fruits and fruit juices': 'produce',
  'pork products': 'pork',
  'vegetables and vegetable products': 'produce',
  'nut and seed products': 'pantry',
  'beef products': 'beef',
  'beverages': 'beverages',
  'finfish and shellfish products': 'seafood',
  'legumes and legume products': 'produce',
  'lamb, veal, and game products': 'lamb',
  'baked products': 'grains',
  'sweets': 'pantry',
  'cereal grains and pasta': 'grains',
  'fast foods': 'pantry',
  'meals, entrees, and side dishes': 'pantry',
  'snacks': 'pantry',
  'american indian/alaska native foods': 'pantry',
  'restaurant foods': 'pantry',
  'alcoholic beverages': 'beverages',
  'oils edible': 'oils',
  'herbs/spices/extracts': 'spices',
};

function slugify(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

function categorize(foodCategoryDesc) {
  if (!foodCategoryDesc) return 'uncategorized';
  const lower = foodCategoryDesc.toLowerCase().trim();
  return CATEGORY_MAP[lower] || 'uncategorized';
}

function guessUnit(category, name) {
  const lower = (category + ' ' + name).toLowerCase();
  if (lower.match(/\b(beef|pork|chicken|turkey|lamb|veal|duck|bison|salmon|shrimp|cod|tuna|lobster|crab|fish|seafood|meat|steak|roast|chop|fillet|sausage|ham|bacon)\b/)) return 'lb';
  if (lower.match(/\b(milk|cream|juice|broth|stock|oil|vinegar|water|beverage|soda|wine|beer)\b/)) return 'fl_oz';
  if (lower.match(/\b(egg)\b/)) return 'each';
  if (lower.match(/\b(flour|sugar|rice|salt|spice|herb|powder|seed|grain|cereal|oat|legume|bean|lentil)\b/)) return 'lb';
  if (lower.match(/\b(fruit|vegetable|produce|apple|banana|tomato|potato|onion|carrot|lettuce)\b/)) return 'lb';
  if (lower.match(/\b(bread|bagel|muffin|roll|bun|cookie|cake|pie|cracker)\b/)) return 'each';
  return 'lb';
}

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.replace(/^"|"$/g, ''));
  return fields;
}

async function main() {
  console.log('=== OpenClaw USDA CSV Import ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Source: ${CSV_PATH}`);

  const db = getDb();
  const before = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get();
  console.log(`Existing ingredients: ${before.c}`);

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category, standard_unit)
    VALUES (?, ?, ?, ?)
  `);

  // Read CSV line by line (206MB, can't load into memory)
  const rl = createInterface({
    input: createReadStream(CSV_PATH),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  let imported = 0;
  let skipped = 0;
  let headerParsed = false;
  let descIdx, dataTypeIdx, catIdx;

  // Batch inserts for performance
  const batchInsert = db.transaction((items) => {
    for (const [id, name, category, unit] of items) {
      insertStmt.run(id, name, category, unit);
    }
  });

  let batch = [];

  for await (const line of rl) {
    lineNum++;

    if (!headerParsed) {
      const header = parseCSVLine(line);
      descIdx = header.indexOf('description');
      dataTypeIdx = header.indexOf('data_type');
      catIdx = header.indexOf('food_category_id');
      console.log(`  Header: ${header.join(', ')}`);
      console.log(`  desc=${descIdx}, data_type=${dataTypeIdx}, cat=${catIdx}`);
      headerParsed = true;
      continue;
    }

    const fields = parseCSVLine(line);
    const dataType = fields[dataTypeIdx];

    // Only import Foundation and SR Legacy (not branded_food, survey_fndds_food, etc.)
    if (dataType !== 'foundation_food' && dataType !== 'sr_legacy_food') {
      skipped++;
      continue;
    }

    const description = fields[descIdx];
    if (!description || description.length < 2) { skipped++; continue; }

    const name = description.substring(0, 100);
    const id = `usda-${slugify(name)}`;
    if (!id || id === 'usda-' || id.length < 6) { skipped++; continue; }

    const catDesc = fields[catIdx] || '';
    const category = categorize(catDesc);
    const unit = guessUnit(category, name);

    batch.push([id, name, category, unit]);

    if (batch.length >= 500) {
      batchInsert(batch);
      batch = [];
    }

    imported++;

    if (imported % 2000 === 0) {
      console.log(`  Progress: ${imported} imported, ${skipped} skipped (line ${lineNum})`);
    }
  }

  // Flush remaining batch
  if (batch.length > 0) {
    batchInsert(batch);
  }

  const after = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get();
  const newItems = after.c - before.c;

  // Category distribution
  const byCat = db.prepare('SELECT category, COUNT(*) as c FROM canonical_ingredients GROUP BY category ORDER BY c DESC').all();
  console.log('\n=== Category Distribution ===');
  byCat.forEach(s => console.log(`  ${s.category}: ${s.c}`));

  // Source distribution
  const usda = db.prepare("SELECT COUNT(*) as c FROM canonical_ingredients WHERE ingredient_id LIKE 'usda-%'").get();
  const flipp = db.prepare("SELECT COUNT(*) as c FROM canonical_ingredients WHERE ingredient_id NOT LIKE 'usda-%'").get();
  console.log(`\n  USDA items: ${usda.c}`);
  console.log(`  Flipp/manual items: ${flipp.c}`);

  console.log(`\n=== Import Complete ===`);
  console.log(`Lines processed: ${lineNum}`);
  console.log(`Foundation + SR Legacy imported: ${imported}`);
  console.log(`Branded/other skipped: ${skipped}`);
  console.log(`New ingredients added: ${newItems}`);
  console.log(`Total ingredients now: ${after.c}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
