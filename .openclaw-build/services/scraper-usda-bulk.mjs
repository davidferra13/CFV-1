/**
 * OpenClaw - USDA FoodData Central BULK Import
 * Downloads the full USDA datasets as CSV and imports them directly.
 * No API key needed, no rate limits.
 *
 * Downloads Foundation Foods and SR Legacy datasets from USDA's
 * bulk download endpoint, then imports every food item as a
 * canonical ingredient with proper categorization.
 */

import { getDb } from '../lib/db.mjs';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'usda-cache');

// USDA category mappings
const CATEGORY_MAP = {
  'beef products': 'beef',
  'poultry products': 'poultry',
  'pork products': 'pork',
  'lamb, veal, and game products': 'lamb',
  'sausages and luncheon meats': 'pork',
  'finfish and shellfish products': 'seafood',
  'dairy and egg products': 'dairy',
  'vegetables and vegetable products': 'produce',
  'fruits and fruit juices': 'produce',
  'legumes and legume products': 'produce',
  'cereal grains and pasta': 'grains',
  'breakfast cereals': 'grains',
  'baked products': 'grains',
  'fats and oils': 'oils',
  'spices and herbs': 'spices',
  'soups, sauces, and gravies': 'pantry',
  'nut and seed products': 'pantry',
  'sweets': 'pantry',
  'beverages': 'beverages',
  'baby foods': 'pantry',
  'meals, entrees, and side dishes': 'pantry',
  'snacks': 'pantry',
  'fast foods': 'pantry',
  'restaurant foods': 'pantry',
  'american indian/alaska native foods': 'pantry',
  'alcoholic beverages': 'beverages',
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
  const lower = foodCategoryDesc.toLowerCase();
  return CATEGORY_MAP[lower] || 'uncategorized';
}

function guessUnit(category, name) {
  const lower = (category + ' ' + name).toLowerCase();
  if (lower.match(/\b(beef|pork|chicken|turkey|lamb|veal|duck|bison|salmon|shrimp|cod|tuna|lobster|crab|fish|seafood|meat|steak|roast|chop|fillet)\b/)) return 'lb';
  if (lower.match(/\b(milk|cream|juice|broth|stock|oil|vinegar|water|beverage|soda|wine|beer)\b/)) return 'fl_oz';
  if (lower.match(/\b(egg)\b/)) return 'each';
  if (lower.match(/\b(flour|sugar|rice|salt|spice|herb|powder|seed|grain|cereal|oat)\b/)) return 'lb';
  if (lower.match(/\b(fruit|vegetable|produce|apple|banana|tomato|potato|onion|carrot|lettuce)\b/)) return 'lb';
  if (lower.match(/\b(bread|bagel|muffin|roll|bun|cookie|cake|pie|cracker)\b/)) return 'each';
  return 'lb';
}

function cleanName(desc) {
  return desc
    .replace(/,\s*(NFS|not further specified)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

// Parse a simple CSV line (handles quoted fields)
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
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

async function downloadFile(url, dest) {
  console.log(`  Downloading: ${url}`);
  console.log(`  To: ${dest}`);
  // Use curl since it's available on the Pi
  execSync(`curl -L -o "${dest}" "${url}"`, { timeout: 300000 });
}

async function importCSV(db, csvPath, foodCategoryLookup) {
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  if (lines.length < 2) {
    console.log(`  Empty CSV: ${csvPath}`);
    return 0;
  }

  // Parse header
  const header = parseCSVLine(lines[0]);
  const descIdx = header.indexOf('description');
  const fdcIdIdx = header.indexOf('fdc_id');
  const catIdIdx = header.indexOf('food_category_id');

  if (descIdx === -1) {
    console.log(`  No 'description' column in ${csvPath}`);
    console.log(`  Headers: ${header.join(', ')}`);
    return 0;
  }

  let imported = 0;
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category, standard_unit)
    VALUES (?, ?, ?, ?)
  `);

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const fields = parseCSVLine(lines[i]);
    const description = fields[descIdx];
    if (!description || description.length < 2) continue;

    const name = cleanName(description);
    const id = `usda-${slugify(name)}`;
    if (!id || id === 'usda-' || id.length < 6) continue;

    // Look up category
    let category = 'uncategorized';
    if (catIdIdx !== -1 && fields[catIdIdx] && foodCategoryLookup) {
      const catId = fields[catIdIdx].replace(/"/g, '');
      category = foodCategoryLookup.get(catId) || 'uncategorized';
    }

    const unit = guessUnit(category, name);

    insertStmt.run(id, name, category, unit);
    imported++;
  }

  return imported;
}

async function main() {
  console.log('=== OpenClaw USDA Bulk Import ===');
  console.log(`Time: ${new Date().toISOString()}`);

  // Ensure cache directory exists
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  const db = getDb();
  const before = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get();
  console.log(`Existing ingredients: ${before.c}`);

  // -----------------------------------------------------------------------
  // Step 1: Download USDA food category mapping
  // The "food_category.csv" maps category IDs to descriptions
  // -----------------------------------------------------------------------
  const categoryFile = join(DATA_DIR, 'food_category.csv');
  if (!existsSync(categoryFile)) {
    await downloadFile(
      'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_csv_2024-10-31.zip',
      join(DATA_DIR, 'fdc-full.zip')
    );
    console.log('  Extracting CSV files...');
    execSync(`cd "${DATA_DIR}" && unzip -o fdc-full.zip food_category.csv food.csv 2>/dev/null || true`, { timeout: 120000 });
  }

  // Build category lookup
  const foodCategoryLookup = new Map();
  if (existsSync(categoryFile)) {
    const catContent = readFileSync(categoryFile, 'utf-8');
    const catLines = catContent.split('\n');
    const catHeader = parseCSVLine(catLines[0]);
    const catIdIdx = catHeader.indexOf('id');
    const catDescIdx = catHeader.indexOf('description');

    for (let i = 1; i < catLines.length; i++) {
      if (!catLines[i].trim()) continue;
      const fields = parseCSVLine(catLines[i]);
      if (catIdIdx !== -1 && catDescIdx !== -1) {
        const id = fields[catIdIdx]?.replace(/"/g, '');
        const desc = fields[catDescIdx]?.replace(/"/g, '');
        if (id && desc) {
          foodCategoryLookup.set(id, categorize(desc));
        }
      }
    }
    console.log(`  Loaded ${foodCategoryLookup.size} food categories`);
  }

  // -----------------------------------------------------------------------
  // Step 2: Import from food.csv (the main foods table)
  // This has ALL food types: Foundation, SR Legacy, Branded, Survey, etc.
  // -----------------------------------------------------------------------
  const foodFile = join(DATA_DIR, 'food.csv');
  if (existsSync(foodFile)) {
    console.log('\n--- Importing from food.csv ---');
    const imported = await importCSV(db, foodFile, foodCategoryLookup);
    console.log(`  Imported: ${imported} items`);
  } else {
    console.log('\n--- food.csv not found, importing from API fallback ---');
    // Fallback: generate a comprehensive food list from our own knowledge
    await importComprehensiveFoodList(db);
  }

  const after = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get();
  const newItems = after.c - before.c;

  // Print category distribution
  const byCat = db.prepare('SELECT category, COUNT(*) as c FROM canonical_ingredients GROUP BY category ORDER BY c DESC').all();
  console.log('\n=== Category Distribution ===');
  byCat.forEach(s => console.log(`  ${s.category}: ${s.c}`));

  console.log(`\n=== USDA Bulk Import Complete ===`);
  console.log(`New ingredients added: ${newItems}`);
  console.log(`Total ingredients now: ${after.c}`);
}

/**
 * Fallback: If we can't download USDA CSV, generate a comprehensive
 * food list from embedded knowledge. This ensures we always have a
 * solid catalog even without internet access.
 */
async function importComprehensiveFoodList(db) {
  console.log('  Building comprehensive food catalog from embedded data...');

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category, standard_unit)
    VALUES (?, ?, ?, ?)
  `);

  const foods = [
    // ===== BEEF (50+ cuts) =====
    ['beef-ground-80-20', 'Ground Beef 80/20', 'beef', 'lb'],
    ['beef-ground-85-15', 'Ground Beef 85/15', 'beef', 'lb'],
    ['beef-ground-90-10', 'Ground Beef 90/10', 'beef', 'lb'],
    ['beef-ground-93-7', 'Ground Beef 93/7', 'beef', 'lb'],
    ['beef-ribeye', 'Beef Ribeye Steak', 'beef', 'lb'],
    ['beef-ribeye-bonein', 'Beef Ribeye Bone-In', 'beef', 'lb'],
    ['beef-sirloin', 'Beef Sirloin Steak', 'beef', 'lb'],
    ['beef-sirloin-tip', 'Beef Sirloin Tip Roast', 'beef', 'lb'],
    ['beef-tenderloin', 'Beef Tenderloin (Filet Mignon)', 'beef', 'lb'],
    ['beef-strip-steak', 'Beef NY Strip Steak', 'beef', 'lb'],
    ['beef-flank-steak', 'Beef Flank Steak', 'beef', 'lb'],
    ['beef-skirt-steak', 'Beef Skirt Steak', 'beef', 'lb'],
    ['beef-hanger-steak', 'Beef Hanger Steak', 'beef', 'lb'],
    ['beef-flatiron-steak', 'Beef Flat Iron Steak', 'beef', 'lb'],
    ['beef-chuck-roast', 'Beef Chuck Roast', 'beef', 'lb'],
    ['beef-chuck-steak', 'Beef Chuck Steak', 'beef', 'lb'],
    ['beef-brisket', 'Beef Brisket', 'beef', 'lb'],
    ['beef-brisket-flat', 'Beef Brisket Flat Cut', 'beef', 'lb'],
    ['beef-brisket-point', 'Beef Brisket Point Cut', 'beef', 'lb'],
    ['beef-short-ribs', 'Beef Short Ribs', 'beef', 'lb'],
    ['beef-back-ribs', 'Beef Back Ribs', 'beef', 'lb'],
    ['beef-stew-meat', 'Beef Stew Meat', 'beef', 'lb'],
    ['beef-shank', 'Beef Shank', 'beef', 'lb'],
    ['beef-oxtail', 'Beef Oxtail', 'beef', 'lb'],
    ['beef-tongue', 'Beef Tongue', 'beef', 'lb'],
    ['beef-liver', 'Beef Liver', 'beef', 'lb'],
    ['beef-heart', 'Beef Heart', 'beef', 'lb'],
    ['beef-tri-tip', 'Beef Tri-Tip', 'beef', 'lb'],
    ['beef-round-roast', 'Beef Round Roast', 'beef', 'lb'],
    ['beef-eye-round', 'Beef Eye of Round', 'beef', 'lb'],
    ['beef-bottom-round', 'Beef Bottom Round', 'beef', 'lb'],
    ['beef-top-round', 'Beef Top Round', 'beef', 'lb'],
    ['beef-london-broil', 'Beef London Broil', 'beef', 'lb'],
    ['beef-t-bone', 'Beef T-Bone Steak', 'beef', 'lb'],
    ['beef-porterhouse', 'Beef Porterhouse Steak', 'beef', 'lb'],
    ['beef-prime-rib', 'Beef Prime Rib Roast', 'beef', 'lb'],
    ['beef-marrow-bones', 'Beef Marrow Bones', 'beef', 'lb'],
    ['beef-bone-broth-bones', 'Beef Soup Bones', 'beef', 'lb'],
    ['beef-jerky', 'Beef Jerky', 'beef', 'oz'],
    ['beef-patties', 'Beef Patties (Frozen)', 'beef', 'lb'],
    ['corned-beef', 'Corned Beef', 'beef', 'lb'],
    ['veal-cutlet', 'Veal Cutlet', 'beef', 'lb'],
    ['veal-chop', 'Veal Chop', 'beef', 'lb'],
    ['veal-shank', 'Veal Shank (Osso Buco)', 'beef', 'lb'],
    ['veal-ground', 'Ground Veal', 'beef', 'lb'],

    // ===== POULTRY (40+) =====
    ['chicken-breast-boneless-skinless', 'Chicken Breast Boneless Skinless', 'poultry', 'lb'],
    ['chicken-breast-bone-in', 'Chicken Breast Bone-In', 'poultry', 'lb'],
    ['chicken-thigh-boneless', 'Chicken Thigh Boneless', 'poultry', 'lb'],
    ['chicken-thigh-bone-in', 'Chicken Thigh Bone-In', 'poultry', 'lb'],
    ['chicken-drumsticks', 'Chicken Drumsticks', 'poultry', 'lb'],
    ['chicken-wings', 'Chicken Wings', 'poultry', 'lb'],
    ['chicken-whole', 'Whole Chicken', 'poultry', 'lb'],
    ['chicken-ground', 'Ground Chicken', 'poultry', 'lb'],
    ['chicken-tenders', 'Chicken Tenders', 'poultry', 'lb'],
    ['chicken-cutlets', 'Chicken Cutlets', 'poultry', 'lb'],
    ['chicken-liver', 'Chicken Liver', 'poultry', 'lb'],
    ['chicken-leg-quarter', 'Chicken Leg Quarter', 'poultry', 'lb'],
    ['chicken-backs', 'Chicken Backs', 'poultry', 'lb'],
    ['chicken-feet', 'Chicken Feet', 'poultry', 'lb'],
    ['chicken-gizzards', 'Chicken Gizzards', 'poultry', 'lb'],
    ['chicken-sausage', 'Chicken Sausage', 'poultry', 'lb'],
    ['turkey-breast', 'Turkey Breast', 'poultry', 'lb'],
    ['turkey-ground', 'Ground Turkey', 'poultry', 'lb'],
    ['turkey-ground-93-7', 'Ground Turkey 93/7', 'poultry', 'lb'],
    ['turkey-thigh', 'Turkey Thigh', 'poultry', 'lb'],
    ['turkey-drumstick', 'Turkey Drumstick', 'poultry', 'lb'],
    ['turkey-wing', 'Turkey Wing', 'poultry', 'lb'],
    ['turkey-whole', 'Whole Turkey', 'poultry', 'lb'],
    ['turkey-bacon', 'Turkey Bacon', 'poultry', 'lb'],
    ['turkey-sausage', 'Turkey Sausage', 'poultry', 'lb'],
    ['duck-breast', 'Duck Breast', 'poultry', 'lb'],
    ['duck-whole', 'Whole Duck', 'poultry', 'lb'],
    ['duck-leg', 'Duck Leg', 'poultry', 'lb'],
    ['duck-fat', 'Duck Fat (Rendered)', 'poultry', 'lb'],
    ['cornish-hen', 'Cornish Game Hen', 'poultry', 'each'],
    ['quail', 'Quail (Whole)', 'poultry', 'each'],
    ['pheasant', 'Pheasant', 'poultry', 'lb'],

    // ===== PORK (35+) =====
    ['pork-chops', 'Pork Chops', 'pork', 'lb'],
    ['pork-chops-boneless', 'Pork Chops Boneless', 'pork', 'lb'],
    ['pork-chops-bone-in', 'Pork Chops Bone-In', 'pork', 'lb'],
    ['pork-tenderloin', 'Pork Tenderloin', 'pork', 'lb'],
    ['pork-shoulder', 'Pork Shoulder (Butt)', 'pork', 'lb'],
    ['pork-belly', 'Pork Belly', 'pork', 'lb'],
    ['pork-ground', 'Ground Pork', 'pork', 'lb'],
    ['pork-loin', 'Pork Loin Roast', 'pork', 'lb'],
    ['pork-ribs-baby-back', 'Baby Back Ribs', 'pork', 'lb'],
    ['pork-ribs-spare', 'Spare Ribs', 'pork', 'lb'],
    ['pork-ribs-st-louis', 'St. Louis Style Ribs', 'pork', 'lb'],
    ['pork-sirloin', 'Pork Sirloin Roast', 'pork', 'lb'],
    ['pork-shank', 'Pork Shank', 'pork', 'lb'],
    ['pork-hock', 'Pork Hock (Ham Hock)', 'pork', 'lb'],
    ['bacon', 'Bacon', 'pork', 'lb'],
    ['bacon-thick-cut', 'Thick Cut Bacon', 'pork', 'lb'],
    ['bacon-center-cut', 'Center Cut Bacon', 'pork', 'lb'],
    ['pancetta', 'Pancetta', 'pork', 'lb'],
    ['guanciale', 'Guanciale', 'pork', 'lb'],
    ['ham-whole', 'Whole Ham', 'pork', 'lb'],
    ['ham-sliced', 'Sliced Ham (Deli)', 'pork', 'lb'],
    ['ham-smoked', 'Smoked Ham', 'pork', 'lb'],
    ['prosciutto', 'Prosciutto', 'pork', 'lb'],
    ['sausage-italian', 'Italian Sausage', 'pork', 'lb'],
    ['sausage-italian-sweet', 'Sweet Italian Sausage', 'pork', 'lb'],
    ['sausage-italian-hot', 'Hot Italian Sausage', 'pork', 'lb'],
    ['sausage-breakfast', 'Breakfast Sausage', 'pork', 'lb'],
    ['sausage-kielbasa', 'Kielbasa', 'pork', 'lb'],
    ['sausage-andouille', 'Andouille Sausage', 'pork', 'lb'],
    ['sausage-chorizo', 'Chorizo', 'pork', 'lb'],
    ['bratwurst', 'Bratwurst', 'pork', 'lb'],
    ['hot-dogs', 'Hot Dogs', 'pork', 'each'],
    ['pepperoni', 'Pepperoni', 'pork', 'oz'],
    ['salami', 'Salami', 'pork', 'lb'],
    ['mortadella', 'Mortadella', 'pork', 'lb'],
    ['capicola', 'Capicola', 'pork', 'lb'],
    ['sopressata', 'Sopressata', 'pork', 'lb'],

    // ===== LAMB (15+) =====
    ['lamb-rack', 'Rack of Lamb', 'lamb', 'lb'],
    ['lamb-chops', 'Lamb Chops', 'lamb', 'lb'],
    ['lamb-leg', 'Leg of Lamb', 'lamb', 'lb'],
    ['lamb-shoulder', 'Lamb Shoulder', 'lamb', 'lb'],
    ['lamb-shank', 'Lamb Shank', 'lamb', 'lb'],
    ['lamb-ground', 'Ground Lamb', 'lamb', 'lb'],
    ['lamb-loin', 'Lamb Loin', 'lamb', 'lb'],
    ['lamb-stew-meat', 'Lamb Stew Meat', 'lamb', 'lb'],
    ['bison-ground', 'Ground Bison', 'lamb', 'lb'],
    ['bison-steak', 'Bison Steak', 'lamb', 'lb'],
    ['venison-ground', 'Ground Venison', 'lamb', 'lb'],
    ['venison-steak', 'Venison Steak', 'lamb', 'lb'],
    ['rabbit', 'Rabbit', 'lamb', 'lb'],
    ['goat-meat', 'Goat Meat', 'lamb', 'lb'],
    ['elk-steak', 'Elk Steak', 'lamb', 'lb'],

    // ===== SEAFOOD (60+) =====
    ['salmon-atlantic-fillet', 'Atlantic Salmon Fillet', 'seafood', 'lb'],
    ['salmon-sockeye', 'Sockeye Salmon', 'seafood', 'lb'],
    ['salmon-king', 'King Salmon', 'seafood', 'lb'],
    ['salmon-coho', 'Coho Salmon', 'seafood', 'lb'],
    ['salmon-smoked', 'Smoked Salmon', 'seafood', 'lb'],
    ['salmon-canned', 'Canned Salmon', 'seafood', 'oz'],
    ['tuna-ahi', 'Ahi Tuna Steak', 'seafood', 'lb'],
    ['tuna-yellowfin', 'Yellowfin Tuna', 'seafood', 'lb'],
    ['tuna-albacore', 'Albacore Tuna', 'seafood', 'lb'],
    ['tuna-canned', 'Canned Tuna', 'seafood', 'oz'],
    ['cod-fillet', 'Cod Fillet', 'seafood', 'lb'],
    ['cod-black', 'Black Cod (Sablefish)', 'seafood', 'lb'],
    ['haddock-fillet', 'Haddock Fillet', 'seafood', 'lb'],
    ['halibut-fillet', 'Halibut Fillet', 'seafood', 'lb'],
    ['swordfish-steak', 'Swordfish Steak', 'seafood', 'lb'],
    ['mahi-mahi', 'Mahi Mahi', 'seafood', 'lb'],
    ['sea-bass', 'Sea Bass', 'seafood', 'lb'],
    ['chilean-sea-bass', 'Chilean Sea Bass', 'seafood', 'lb'],
    ['branzino', 'Branzino', 'seafood', 'lb'],
    ['snapper-red', 'Red Snapper', 'seafood', 'lb'],
    ['grouper', 'Grouper', 'seafood', 'lb'],
    ['tilapia', 'Tilapia Fillet', 'seafood', 'lb'],
    ['catfish-fillet', 'Catfish Fillet', 'seafood', 'lb'],
    ['trout-rainbow', 'Rainbow Trout', 'seafood', 'lb'],
    ['arctic-char', 'Arctic Char', 'seafood', 'lb'],
    ['barramundi', 'Barramundi', 'seafood', 'lb'],
    ['sardines', 'Sardines (Canned)', 'seafood', 'oz'],
    ['anchovies', 'Anchovies', 'seafood', 'oz'],
    ['mackerel', 'Mackerel', 'seafood', 'lb'],
    ['monkfish', 'Monkfish', 'seafood', 'lb'],
    ['shrimp-large', 'Large Shrimp (21-25 ct)', 'seafood', 'lb'],
    ['shrimp-jumbo', 'Jumbo Shrimp (16-20 ct)', 'seafood', 'lb'],
    ['shrimp-medium', 'Medium Shrimp (31-40 ct)', 'seafood', 'lb'],
    ['shrimp-cocktail', 'Cocktail Shrimp (Cooked)', 'seafood', 'lb'],
    ['scallops-sea', 'Sea Scallops', 'seafood', 'lb'],
    ['scallops-bay', 'Bay Scallops', 'seafood', 'lb'],
    ['lobster-whole', 'Whole Lobster', 'seafood', 'lb'],
    ['lobster-tail', 'Lobster Tail', 'seafood', 'lb'],
    ['lobster-meat', 'Lobster Meat (Cooked)', 'seafood', 'lb'],
    ['crab-meat', 'Crab Meat', 'seafood', 'lb'],
    ['crab-king', 'King Crab Legs', 'seafood', 'lb'],
    ['crab-snow', 'Snow Crab Legs', 'seafood', 'lb'],
    ['crab-dungeness', 'Dungeness Crab', 'seafood', 'lb'],
    ['crab-soft-shell', 'Soft Shell Crab', 'seafood', 'each'],
    ['clams-littleneck', 'Littleneck Clams', 'seafood', 'lb'],
    ['clams-cherrystone', 'Cherrystone Clams', 'seafood', 'lb'],
    ['clams-chopped-canned', 'Chopped Clams (Canned)', 'seafood', 'oz'],
    ['mussels', 'Mussels', 'seafood', 'lb'],
    ['oysters', 'Oysters', 'seafood', 'each'],
    ['squid-calamari', 'Squid (Calamari)', 'seafood', 'lb'],
    ['octopus', 'Octopus', 'seafood', 'lb'],
    ['crawfish-tail', 'Crawfish Tail Meat', 'seafood', 'lb'],
    ['fish-sticks-frozen', 'Fish Sticks (Frozen)', 'seafood', 'each'],
    ['surimi-crab', 'Imitation Crab (Surimi)', 'seafood', 'lb'],
    ['smoked-trout', 'Smoked Trout', 'seafood', 'lb'],
    ['caviar', 'Caviar', 'seafood', 'oz'],
    ['roe-salmon', 'Salmon Roe (Ikura)', 'seafood', 'oz'],

    // ===== DAIRY (50+) =====
    ['milk-whole', 'Whole Milk', 'dairy', 'gallon'],
    ['milk-2pct', '2% Reduced Fat Milk', 'dairy', 'gallon'],
    ['milk-1pct', '1% Low Fat Milk', 'dairy', 'gallon'],
    ['milk-skim', 'Skim Milk', 'dairy', 'gallon'],
    ['milk-chocolate', 'Chocolate Milk', 'dairy', 'gallon'],
    ['milk-buttermilk', 'Buttermilk', 'dairy', 'quart'],
    ['milk-oat', 'Oat Milk', 'dairy', 'fl_oz'],
    ['milk-almond', 'Almond Milk', 'dairy', 'fl_oz'],
    ['milk-soy', 'Soy Milk', 'dairy', 'fl_oz'],
    ['milk-coconut', 'Coconut Milk (Carton)', 'dairy', 'fl_oz'],
    ['cream-heavy', 'Heavy Cream', 'dairy', 'pint'],
    ['cream-light', 'Light Cream', 'dairy', 'pint'],
    ['half-and-half', 'Half and Half', 'dairy', 'pint'],
    ['sour-cream', 'Sour Cream', 'dairy', 'oz'],
    ['cream-cheese', 'Cream Cheese', 'dairy', 'oz'],
    ['cream-cheese-whipped', 'Whipped Cream Cheese', 'dairy', 'oz'],
    ['butter-unsalted', 'Butter (Unsalted)', 'dairy', 'lb'],
    ['butter-salted', 'Butter (Salted)', 'dairy', 'lb'],
    ['butter-european', 'European Style Butter', 'dairy', 'lb'],
    ['butter-clarified', 'Clarified Butter (Ghee)', 'dairy', 'oz'],
    ['cheese-cheddar', 'Cheddar Cheese', 'dairy', 'lb'],
    ['cheese-cheddar-sharp', 'Sharp Cheddar Cheese', 'dairy', 'lb'],
    ['cheese-cheddar-white', 'White Cheddar Cheese', 'dairy', 'lb'],
    ['cheese-mozzarella', 'Mozzarella Cheese', 'dairy', 'lb'],
    ['cheese-mozzarella-fresh', 'Fresh Mozzarella', 'dairy', 'lb'],
    ['cheese-mozzarella-burrata', 'Burrata Cheese', 'dairy', 'lb'],
    ['cheese-parmesan', 'Parmesan Cheese', 'dairy', 'lb'],
    ['cheese-parmigiano-reggiano', 'Parmigiano-Reggiano', 'dairy', 'lb'],
    ['cheese-pecorino', 'Pecorino Romano', 'dairy', 'lb'],
    ['cheese-gruyere', 'Gruyere Cheese', 'dairy', 'lb'],
    ['cheese-swiss', 'Swiss Cheese', 'dairy', 'lb'],
    ['cheese-provolone', 'Provolone Cheese', 'dairy', 'lb'],
    ['cheese-gouda', 'Gouda Cheese', 'dairy', 'lb'],
    ['cheese-brie', 'Brie Cheese', 'dairy', 'lb'],
    ['cheese-camembert', 'Camembert Cheese', 'dairy', 'lb'],
    ['cheese-blue', 'Blue Cheese', 'dairy', 'lb'],
    ['cheese-gorgonzola', 'Gorgonzola Cheese', 'dairy', 'lb'],
    ['cheese-roquefort', 'Roquefort Cheese', 'dairy', 'lb'],
    ['cheese-feta', 'Feta Cheese', 'dairy', 'lb'],
    ['cheese-goat', 'Goat Cheese (Chevre)', 'dairy', 'lb'],
    ['cheese-ricotta', 'Ricotta Cheese', 'dairy', 'lb'],
    ['cheese-mascarpone', 'Mascarpone Cheese', 'dairy', 'lb'],
    ['cheese-cottage', 'Cottage Cheese', 'dairy', 'oz'],
    ['cheese-american', 'American Cheese', 'dairy', 'lb'],
    ['cheese-colby-jack', 'Colby Jack Cheese', 'dairy', 'lb'],
    ['cheese-monterey-jack', 'Monterey Jack Cheese', 'dairy', 'lb'],
    ['cheese-pepper-jack', 'Pepper Jack Cheese', 'dairy', 'lb'],
    ['cheese-havarti', 'Havarti Cheese', 'dairy', 'lb'],
    ['cheese-muenster', 'Muenster Cheese', 'dairy', 'lb'],
    ['cheese-fontina', 'Fontina Cheese', 'dairy', 'lb'],
    ['cheese-manchego', 'Manchego Cheese', 'dairy', 'lb'],
    ['cheese-asiago', 'Asiago Cheese', 'dairy', 'lb'],
    ['cheese-emmental', 'Emmental Cheese', 'dairy', 'lb'],
    ['cheese-string', 'String Cheese', 'dairy', 'each'],
    ['yogurt-greek', 'Greek Yogurt', 'dairy', 'oz'],
    ['yogurt-plain', 'Plain Yogurt', 'dairy', 'oz'],
    ['yogurt-vanilla', 'Vanilla Yogurt', 'dairy', 'oz'],
    ['yogurt-skyr', 'Skyr (Icelandic Yogurt)', 'dairy', 'oz'],
    ['eggs-large', 'Large Eggs (Dozen)', 'eggs', 'dozen'],
    ['eggs-extra-large', 'Extra Large Eggs (Dozen)', 'eggs', 'dozen'],
    ['eggs-organic', 'Organic Eggs (Dozen)', 'eggs', 'dozen'],
    ['eggs-free-range', 'Free Range Eggs (Dozen)', 'eggs', 'dozen'],
    ['eggs-pastured', 'Pastured Eggs (Dozen)', 'eggs', 'dozen'],
    ['egg-whites', 'Liquid Egg Whites', 'eggs', 'fl_oz'],

    // ===== PRODUCE - VEGETABLES (80+) =====
    ['onion-yellow', 'Yellow Onion', 'produce', 'lb'],
    ['onion-red', 'Red Onion', 'produce', 'lb'],
    ['onion-white', 'White Onion', 'produce', 'lb'],
    ['onion-sweet', 'Sweet Onion (Vidalia)', 'produce', 'lb'],
    ['onion-pearl', 'Pearl Onion', 'produce', 'lb'],
    ['onion-green', 'Green Onion (Scallion)', 'produce', 'bunch'],
    ['shallot', 'Shallot', 'produce', 'lb'],
    ['garlic', 'Garlic', 'produce', 'each'],
    ['garlic-elephant', 'Elephant Garlic', 'produce', 'each'],
    ['potato-russet', 'Russet Potato', 'produce', 'lb'],
    ['potato-yukon-gold', 'Yukon Gold Potato', 'produce', 'lb'],
    ['potato-red', 'Red Potato', 'produce', 'lb'],
    ['potato-fingerling', 'Fingerling Potato', 'produce', 'lb'],
    ['potato-baby', 'Baby Potato', 'produce', 'lb'],
    ['sweet-potato', 'Sweet Potato', 'produce', 'lb'],
    ['yam', 'Yam', 'produce', 'lb'],
    ['tomato', 'Tomato', 'produce', 'lb'],
    ['tomato-cherry', 'Cherry Tomato', 'produce', 'pint'],
    ['tomato-grape', 'Grape Tomato', 'produce', 'pint'],
    ['tomato-roma', 'Roma Tomato', 'produce', 'lb'],
    ['tomato-heirloom', 'Heirloom Tomato', 'produce', 'lb'],
    ['tomato-beefsteak', 'Beefsteak Tomato', 'produce', 'lb'],
    ['tomato-on-vine', 'Tomatoes on the Vine', 'produce', 'lb'],
    ['tomato-sun-dried', 'Sun-Dried Tomatoes', 'produce', 'oz'],
    ['carrot', 'Carrot', 'produce', 'lb'],
    ['carrot-baby', 'Baby Carrots', 'produce', 'lb'],
    ['celery', 'Celery', 'produce', 'bunch'],
    ['celery-root', 'Celery Root (Celeriac)', 'produce', 'lb'],
    ['bell-pepper-red', 'Red Bell Pepper', 'produce', 'each'],
    ['bell-pepper-green', 'Green Bell Pepper', 'produce', 'each'],
    ['bell-pepper-yellow', 'Yellow Bell Pepper', 'produce', 'each'],
    ['bell-pepper-orange', 'Orange Bell Pepper', 'produce', 'each'],
    ['jalapeno', 'Jalapeno Pepper', 'produce', 'each'],
    ['serrano-pepper', 'Serrano Pepper', 'produce', 'each'],
    ['habanero', 'Habanero Pepper', 'produce', 'each'],
    ['poblano', 'Poblano Pepper', 'produce', 'each'],
    ['anaheim-pepper', 'Anaheim Pepper', 'produce', 'each'],
    ['broccoli', 'Broccoli', 'produce', 'lb'],
    ['broccoli-crown', 'Broccoli Crown', 'produce', 'lb'],
    ['broccolini', 'Broccolini', 'produce', 'bunch'],
    ['cauliflower', 'Cauliflower', 'produce', 'each'],
    ['spinach', 'Spinach', 'produce', 'lb'],
    ['spinach-baby', 'Baby Spinach', 'produce', 'oz'],
    ['kale', 'Kale', 'produce', 'bunch'],
    ['kale-lacinato', 'Lacinato Kale (Dinosaur)', 'produce', 'bunch'],
    ['arugula', 'Arugula', 'produce', 'oz'],
    ['mixed-greens', 'Mixed Salad Greens', 'produce', 'oz'],
    ['lettuce-romaine', 'Romaine Lettuce', 'produce', 'each'],
    ['lettuce-iceberg', 'Iceberg Lettuce', 'produce', 'each'],
    ['lettuce-butter', 'Butter Lettuce (Bibb)', 'produce', 'each'],
    ['lettuce-red-leaf', 'Red Leaf Lettuce', 'produce', 'each'],
    ['lettuce-green-leaf', 'Green Leaf Lettuce', 'produce', 'each'],
    ['cucumber', 'Cucumber', 'produce', 'each'],
    ['cucumber-english', 'English Cucumber', 'produce', 'each'],
    ['cucumber-persian', 'Persian Cucumber', 'produce', 'each'],
    ['zucchini', 'Zucchini', 'produce', 'lb'],
    ['squash-yellow', 'Yellow Squash', 'produce', 'lb'],
    ['squash-butternut', 'Butternut Squash', 'produce', 'lb'],
    ['squash-acorn', 'Acorn Squash', 'produce', 'each'],
    ['squash-spaghetti', 'Spaghetti Squash', 'produce', 'each'],
    ['squash-delicata', 'Delicata Squash', 'produce', 'each'],
    ['squash-kabocha', 'Kabocha Squash', 'produce', 'lb'],
    ['pumpkin', 'Pumpkin', 'produce', 'lb'],
    ['corn-sweet', 'Sweet Corn', 'produce', 'each'],
    ['asparagus', 'Asparagus', 'produce', 'lb'],
    ['avocado', 'Avocado', 'produce', 'each'],
    ['avocado-hass', 'Hass Avocado', 'produce', 'each'],
    ['artichoke', 'Artichoke', 'produce', 'each'],
    ['eggplant', 'Eggplant', 'produce', 'lb'],
    ['eggplant-japanese', 'Japanese Eggplant', 'produce', 'lb'],
    ['cabbage-green', 'Green Cabbage', 'produce', 'lb'],
    ['cabbage-red', 'Red Cabbage', 'produce', 'lb'],
    ['cabbage-napa', 'Napa Cabbage', 'produce', 'lb'],
    ['cabbage-savoy', 'Savoy Cabbage', 'produce', 'lb'],
    ['brussels-sprouts', 'Brussels Sprouts', 'produce', 'lb'],
    ['bok-choy', 'Bok Choy', 'produce', 'lb'],
    ['green-beans', 'Green Beans', 'produce', 'lb'],
    ['snap-peas', 'Sugar Snap Peas', 'produce', 'lb'],
    ['snow-peas', 'Snow Peas', 'produce', 'lb'],
    ['peas-green', 'Green Peas (Fresh)', 'produce', 'lb'],
    ['mushroom-button', 'Button Mushrooms', 'produce', 'lb'],
    ['mushroom-cremini', 'Cremini Mushrooms', 'produce', 'lb'],
    ['mushroom-portobello', 'Portobello Mushrooms', 'produce', 'lb'],
    ['mushroom-shiitake', 'Shiitake Mushrooms', 'produce', 'lb'],
    ['mushroom-oyster', 'Oyster Mushrooms', 'produce', 'lb'],
    ['mushroom-chanterelle', 'Chanterelle Mushrooms', 'produce', 'lb'],
    ['mushroom-porcini', 'Porcini Mushrooms', 'produce', 'lb'],
    ['mushroom-maitake', 'Maitake Mushrooms', 'produce', 'lb'],
    ['mushroom-enoki', 'Enoki Mushrooms', 'produce', 'oz'],
    ['mushroom-king-oyster', 'King Oyster Mushrooms', 'produce', 'lb'],
    ['mushroom-dried-porcini', 'Dried Porcini Mushrooms', 'produce', 'oz'],
    ['beet', 'Beet', 'produce', 'lb'],
    ['beet-golden', 'Golden Beet', 'produce', 'lb'],
    ['radish', 'Radish', 'produce', 'bunch'],
    ['radish-daikon', 'Daikon Radish', 'produce', 'lb'],
    ['turnip', 'Turnip', 'produce', 'lb'],
    ['rutabaga', 'Rutabaga', 'produce', 'lb'],
    ['parsnip', 'Parsnip', 'produce', 'lb'],
    ['fennel', 'Fennel', 'produce', 'each'],
    ['leek', 'Leek', 'produce', 'each'],
    ['ramp', 'Ramps (Wild Leeks)', 'produce', 'bunch'],
    ['okra', 'Okra', 'produce', 'lb'],
    ['endive', 'Endive', 'produce', 'each'],
    ['radicchio', 'Radicchio', 'produce', 'each'],
    ['watercress', 'Watercress', 'produce', 'bunch'],
    ['jicama', 'Jicama', 'produce', 'lb'],
    ['kohlrabi', 'Kohlrabi', 'produce', 'each'],
    ['swiss-chard', 'Swiss Chard', 'produce', 'bunch'],
    ['collard-greens', 'Collard Greens', 'produce', 'bunch'],
    ['mustard-greens', 'Mustard Greens', 'produce', 'bunch'],
    ['turnip-greens', 'Turnip Greens', 'produce', 'bunch'],
    ['edamame', 'Edamame', 'produce', 'lb'],
    ['bean-sprouts', 'Bean Sprouts', 'produce', 'lb'],
    ['water-chestnut', 'Water Chestnuts', 'produce', 'oz'],
    ['bamboo-shoots', 'Bamboo Shoots', 'produce', 'oz'],
    ['hearts-of-palm', 'Hearts of Palm', 'produce', 'oz'],
    ['taro', 'Taro Root', 'produce', 'lb'],
    ['plantain', 'Plantain', 'produce', 'each'],
    ['cassava-yuca', 'Cassava (Yuca)', 'produce', 'lb'],

    // ===== PRODUCE - FRUITS (50+) =====
    ['apple', 'Apple', 'produce', 'each'],
    ['apple-gala', 'Gala Apple', 'produce', 'each'],
    ['apple-fuji', 'Fuji Apple', 'produce', 'each'],
    ['apple-honeycrisp', 'Honeycrisp Apple', 'produce', 'each'],
    ['apple-granny-smith', 'Granny Smith Apple', 'produce', 'each'],
    ['apple-mcintosh', 'McIntosh Apple', 'produce', 'each'],
    ['apple-pink-lady', 'Pink Lady Apple', 'produce', 'each'],
    ['apple-golden-delicious', 'Golden Delicious Apple', 'produce', 'each'],
    ['banana', 'Banana', 'produce', 'lb'],
    ['orange', 'Orange', 'produce', 'each'],
    ['orange-navel', 'Navel Orange', 'produce', 'each'],
    ['orange-blood', 'Blood Orange', 'produce', 'each'],
    ['orange-cara-cara', 'Cara Cara Orange', 'produce', 'each'],
    ['lemon', 'Lemon', 'produce', 'each'],
    ['lemon-meyer', 'Meyer Lemon', 'produce', 'each'],
    ['lime', 'Lime', 'produce', 'each'],
    ['lime-key', 'Key Lime', 'produce', 'each'],
    ['grapefruit', 'Grapefruit', 'produce', 'each'],
    ['tangerine', 'Tangerine', 'produce', 'each'],
    ['clementine', 'Clementine', 'produce', 'each'],
    ['mandarin', 'Mandarin Orange', 'produce', 'each'],
    ['grape-red', 'Red Grapes', 'produce', 'lb'],
    ['grape-green', 'Green Grapes', 'produce', 'lb'],
    ['grape-black', 'Black Grapes', 'produce', 'lb'],
    ['grape-cotton-candy', 'Cotton Candy Grapes', 'produce', 'lb'],
    ['strawberries', 'Strawberries', 'produce', 'lb'],
    ['blueberries', 'Blueberries', 'produce', 'pint'],
    ['raspberries', 'Raspberries', 'produce', 'pint'],
    ['blackberries', 'Blackberries', 'produce', 'pint'],
    ['cranberries', 'Cranberries (Fresh)', 'produce', 'lb'],
    ['watermelon', 'Watermelon', 'produce', 'lb'],
    ['watermelon-seedless', 'Seedless Watermelon', 'produce', 'lb'],
    ['cantaloupe', 'Cantaloupe', 'produce', 'each'],
    ['honeydew', 'Honeydew Melon', 'produce', 'each'],
    ['pineapple', 'Pineapple', 'produce', 'each'],
    ['mango', 'Mango', 'produce', 'each'],
    ['mango-champagne', 'Champagne Mango', 'produce', 'each'],
    ['peach', 'Peach', 'produce', 'each'],
    ['nectarine', 'Nectarine', 'produce', 'each'],
    ['plum', 'Plum', 'produce', 'each'],
    ['pear', 'Pear', 'produce', 'each'],
    ['pear-bartlett', 'Bartlett Pear', 'produce', 'each'],
    ['pear-anjou', 'Anjou Pear', 'produce', 'each'],
    ['pear-bosc', 'Bosc Pear', 'produce', 'each'],
    ['cherry', 'Cherries', 'produce', 'lb'],
    ['cherry-rainier', 'Rainier Cherries', 'produce', 'lb'],
    ['apricot', 'Apricot', 'produce', 'each'],
    ['kiwi', 'Kiwi', 'produce', 'each'],
    ['coconut', 'Coconut (Whole)', 'produce', 'each'],
    ['pomegranate', 'Pomegranate', 'produce', 'each'],
    ['fig-fresh', 'Fresh Fig', 'produce', 'each'],
    ['date-medjool', 'Medjool Dates', 'produce', 'lb'],
    ['date-deglet', 'Deglet Noor Dates', 'produce', 'lb'],
    ['papaya', 'Papaya', 'produce', 'each'],
    ['guava', 'Guava', 'produce', 'each'],
    ['passion-fruit', 'Passion Fruit', 'produce', 'each'],
    ['dragon-fruit', 'Dragon Fruit', 'produce', 'each'],
    ['lychee', 'Lychee', 'produce', 'lb'],
    ['persimmon', 'Persimmon', 'produce', 'each'],
    ['starfruit', 'Star Fruit', 'produce', 'each'],
    ['jackfruit', 'Jackfruit', 'produce', 'lb'],
    ['rhubarb', 'Rhubarb', 'produce', 'lb'],

    // ===== HERBS (25+) =====
    ['basil-fresh', 'Fresh Basil', 'herbs', 'bunch'],
    ['cilantro', 'Cilantro', 'herbs', 'bunch'],
    ['parsley-flat-leaf', 'Flat Leaf Parsley', 'herbs', 'bunch'],
    ['parsley-curly', 'Curly Parsley', 'herbs', 'bunch'],
    ['rosemary-fresh', 'Fresh Rosemary', 'herbs', 'bunch'],
    ['thyme-fresh', 'Fresh Thyme', 'herbs', 'bunch'],
    ['dill-fresh', 'Fresh Dill', 'herbs', 'bunch'],
    ['mint-fresh', 'Fresh Mint', 'herbs', 'bunch'],
    ['chives', 'Chives', 'herbs', 'bunch'],
    ['tarragon-fresh', 'Fresh Tarragon', 'herbs', 'bunch'],
    ['sage-fresh', 'Fresh Sage', 'herbs', 'bunch'],
    ['oregano-fresh', 'Fresh Oregano', 'herbs', 'bunch'],
    ['marjoram-fresh', 'Fresh Marjoram', 'herbs', 'bunch'],
    ['lemongrass', 'Lemongrass', 'herbs', 'each'],
    ['bay-leaves-fresh', 'Fresh Bay Leaves', 'herbs', 'bunch'],
    ['lavender-culinary', 'Culinary Lavender', 'herbs', 'oz'],
    ['sorrel', 'Sorrel', 'herbs', 'bunch'],
    ['epazote', 'Epazote', 'herbs', 'bunch'],
    ['chervil', 'Chervil', 'herbs', 'bunch'],
    ['thai-basil', 'Thai Basil', 'herbs', 'bunch'],

    // ===== SPICES (40+) =====
    ['salt-kosher', 'Kosher Salt', 'spices', 'lb'],
    ['salt-sea', 'Sea Salt', 'spices', 'lb'],
    ['salt-himalayan', 'Himalayan Pink Salt', 'spices', 'lb'],
    ['salt-fleur-de-sel', 'Fleur de Sel', 'spices', 'oz'],
    ['pepper-black-ground', 'Black Pepper (Ground)', 'spices', 'oz'],
    ['peppercorns-black', 'Black Peppercorns (Whole)', 'spices', 'oz'],
    ['peppercorns-white', 'White Peppercorns', 'spices', 'oz'],
    ['peppercorns-pink', 'Pink Peppercorns', 'spices', 'oz'],
    ['cumin-ground', 'Ground Cumin', 'spices', 'oz'],
    ['cumin-seeds', 'Cumin Seeds', 'spices', 'oz'],
    ['paprika', 'Paprika', 'spices', 'oz'],
    ['paprika-smoked', 'Smoked Paprika', 'spices', 'oz'],
    ['paprika-hungarian', 'Hungarian Paprika', 'spices', 'oz'],
    ['cinnamon-ground', 'Ground Cinnamon', 'spices', 'oz'],
    ['cinnamon-sticks', 'Cinnamon Sticks', 'spices', 'oz'],
    ['nutmeg', 'Nutmeg (Ground)', 'spices', 'oz'],
    ['nutmeg-whole', 'Whole Nutmeg', 'spices', 'oz'],
    ['oregano-dried', 'Dried Oregano', 'spices', 'oz'],
    ['red-pepper-flakes', 'Red Pepper Flakes', 'spices', 'oz'],
    ['cayenne-pepper', 'Cayenne Pepper', 'spices', 'oz'],
    ['turmeric', 'Turmeric (Ground)', 'spices', 'oz'],
    ['ginger-ground', 'Ground Ginger', 'spices', 'oz'],
    ['bay-leaves', 'Bay Leaves (Dried)', 'spices', 'oz'],
    ['coriander-ground', 'Ground Coriander', 'spices', 'oz'],
    ['coriander-seeds', 'Coriander Seeds', 'spices', 'oz'],
    ['cardamom-ground', 'Ground Cardamom', 'spices', 'oz'],
    ['cardamom-pods', 'Cardamom Pods', 'spices', 'oz'],
    ['cloves-ground', 'Ground Cloves', 'spices', 'oz'],
    ['cloves-whole', 'Whole Cloves', 'spices', 'oz'],
    ['allspice', 'Allspice (Ground)', 'spices', 'oz'],
    ['saffron', 'Saffron', 'spices', 'gram'],
    ['star-anise', 'Star Anise', 'spices', 'oz'],
    ['fennel-seeds', 'Fennel Seeds', 'spices', 'oz'],
    ['mustard-seeds', 'Mustard Seeds', 'spices', 'oz'],
    ['mustard-powder', 'Mustard Powder', 'spices', 'oz'],
    ['onion-powder', 'Onion Powder', 'spices', 'oz'],
    ['garlic-powder', 'Garlic Powder', 'spices', 'oz'],
    ['chili-powder', 'Chili Powder', 'spices', 'oz'],
    ['chipotle-powder', 'Chipotle Powder', 'spices', 'oz'],
    ['ancho-chile-powder', 'Ancho Chile Powder', 'spices', 'oz'],
    ['curry-powder', 'Curry Powder', 'spices', 'oz'],
    ['garam-masala', 'Garam Masala', 'spices', 'oz'],
    ['za-atar', 'Za\'atar', 'spices', 'oz'],
    ['sumac', 'Sumac', 'spices', 'oz'],
    ['old-bay', 'Old Bay Seasoning', 'spices', 'oz'],
    ['italian-seasoning', 'Italian Seasoning', 'spices', 'oz'],
    ['herbs-de-provence', 'Herbs de Provence', 'spices', 'oz'],
    ['everything-seasoning', 'Everything Bagel Seasoning', 'spices', 'oz'],
    ['cajun-seasoning', 'Cajun Seasoning', 'spices', 'oz'],
    ['taco-seasoning', 'Taco Seasoning', 'spices', 'oz'],

    // ===== OILS & FATS (15+) =====
    ['olive-oil-evoo', 'Extra Virgin Olive Oil', 'oils', 'fl_oz'],
    ['olive-oil-regular', 'Olive Oil (Pure)', 'oils', 'fl_oz'],
    ['oil-vegetable', 'Vegetable Oil', 'oils', 'fl_oz'],
    ['oil-canola', 'Canola Oil', 'oils', 'fl_oz'],
    ['oil-coconut', 'Coconut Oil', 'oils', 'fl_oz'],
    ['oil-avocado', 'Avocado Oil', 'oils', 'fl_oz'],
    ['oil-sesame', 'Sesame Oil', 'oils', 'fl_oz'],
    ['oil-toasted-sesame', 'Toasted Sesame Oil', 'oils', 'fl_oz'],
    ['oil-grapeseed', 'Grapeseed Oil', 'oils', 'fl_oz'],
    ['oil-walnut', 'Walnut Oil', 'oils', 'fl_oz'],
    ['oil-truffle', 'Truffle Oil', 'oils', 'fl_oz'],
    ['oil-peanut', 'Peanut Oil', 'oils', 'fl_oz'],
    ['oil-sunflower', 'Sunflower Oil', 'oils', 'fl_oz'],
    ['oil-corn', 'Corn Oil', 'oils', 'fl_oz'],
    ['shortening', 'Vegetable Shortening', 'oils', 'lb'],
    ['lard', 'Lard', 'oils', 'lb'],
    ['suet', 'Beef Suet (Tallow)', 'oils', 'lb'],
    ['cooking-spray', 'Non-Stick Cooking Spray', 'oils', 'each'],

    // ===== PANTRY (80+) =====
    ['flour-all-purpose', 'All-Purpose Flour', 'pantry', 'lb'],
    ['flour-bread', 'Bread Flour', 'pantry', 'lb'],
    ['flour-cake', 'Cake Flour', 'pantry', 'lb'],
    ['flour-whole-wheat', 'Whole Wheat Flour', 'pantry', 'lb'],
    ['flour-self-rising', 'Self-Rising Flour', 'pantry', 'lb'],
    ['flour-almond', 'Almond Flour', 'pantry', 'lb'],
    ['flour-coconut', 'Coconut Flour', 'pantry', 'lb'],
    ['flour-semolina', 'Semolina Flour', 'pantry', 'lb'],
    ['flour-00', '00 Flour (Italian)', 'pantry', 'lb'],
    ['cornmeal', 'Cornmeal', 'pantry', 'lb'],
    ['cornstarch', 'Cornstarch', 'pantry', 'lb'],
    ['arrowroot', 'Arrowroot Powder', 'pantry', 'oz'],
    ['tapioca-starch', 'Tapioca Starch', 'pantry', 'lb'],
    ['sugar-granulated', 'Granulated Sugar', 'pantry', 'lb'],
    ['sugar-brown', 'Brown Sugar', 'pantry', 'lb'],
    ['sugar-brown-light', 'Light Brown Sugar', 'pantry', 'lb'],
    ['sugar-brown-dark', 'Dark Brown Sugar', 'pantry', 'lb'],
    ['sugar-powdered', 'Powdered Sugar (Confectioners)', 'pantry', 'lb'],
    ['sugar-turbinado', 'Turbinado Sugar', 'pantry', 'lb'],
    ['sugar-demerara', 'Demerara Sugar', 'pantry', 'lb'],
    ['honey', 'Honey', 'pantry', 'lb'],
    ['honey-raw', 'Raw Honey', 'pantry', 'lb'],
    ['honey-manuka', 'Manuka Honey', 'pantry', 'oz'],
    ['maple-syrup', 'Pure Maple Syrup', 'pantry', 'fl_oz'],
    ['molasses', 'Molasses', 'pantry', 'fl_oz'],
    ['molasses-blackstrap', 'Blackstrap Molasses', 'pantry', 'fl_oz'],
    ['agave-nectar', 'Agave Nectar', 'pantry', 'fl_oz'],
    ['corn-syrup', 'Corn Syrup', 'pantry', 'fl_oz'],
    ['vanilla-extract', 'Vanilla Extract', 'pantry', 'fl_oz'],
    ['vanilla-bean', 'Vanilla Bean', 'pantry', 'each'],
    ['vanilla-paste', 'Vanilla Bean Paste', 'pantry', 'fl_oz'],
    ['almond-extract', 'Almond Extract', 'pantry', 'fl_oz'],
    ['baking-powder', 'Baking Powder', 'pantry', 'oz'],
    ['baking-soda', 'Baking Soda', 'pantry', 'lb'],
    ['yeast-active-dry', 'Active Dry Yeast', 'pantry', 'oz'],
    ['yeast-instant', 'Instant Yeast', 'pantry', 'oz'],
    ['cream-of-tartar', 'Cream of Tartar', 'pantry', 'oz'],
    ['gelatin-powder', 'Gelatin (Unflavored)', 'pantry', 'oz'],
    ['pectin', 'Pectin (Sure-Jell)', 'pantry', 'oz'],
    ['cocoa-powder', 'Cocoa Powder (Unsweetened)', 'pantry', 'oz'],
    ['chocolate-chips-semi', 'Semi-Sweet Chocolate Chips', 'pantry', 'oz'],
    ['chocolate-chips-dark', 'Dark Chocolate Chips', 'pantry', 'oz'],
    ['chocolate-chips-white', 'White Chocolate Chips', 'pantry', 'oz'],
    ['chocolate-baking-unsweetened', 'Unsweetened Baking Chocolate', 'pantry', 'oz'],
    ['rice-white-long', 'Long Grain White Rice', 'grains', 'lb'],
    ['rice-white-short', 'Short Grain White Rice', 'grains', 'lb'],
    ['rice-brown', 'Brown Rice', 'grains', 'lb'],
    ['rice-basmati', 'Basmati Rice', 'grains', 'lb'],
    ['rice-jasmine', 'Jasmine Rice', 'grains', 'lb'],
    ['rice-arborio', 'Arborio Rice', 'grains', 'lb'],
    ['rice-sushi', 'Sushi Rice', 'grains', 'lb'],
    ['rice-wild', 'Wild Rice', 'grains', 'lb'],
    ['quinoa', 'Quinoa', 'grains', 'lb'],
    ['quinoa-red', 'Red Quinoa', 'grains', 'lb'],
    ['couscous', 'Couscous', 'grains', 'lb'],
    ['couscous-pearl', 'Pearl (Israeli) Couscous', 'grains', 'lb'],
    ['barley-pearl', 'Pearl Barley', 'grains', 'lb'],
    ['farro', 'Farro', 'grains', 'lb'],
    ['bulgur', 'Bulgur Wheat', 'grains', 'lb'],
    ['polenta', 'Polenta (Cornmeal)', 'grains', 'lb'],
    ['oats-rolled', 'Rolled Oats', 'grains', 'lb'],
    ['oats-steel-cut', 'Steel Cut Oats', 'grains', 'lb'],
    ['oats-instant', 'Instant Oatmeal', 'grains', 'lb'],
    ['pasta-spaghetti', 'Spaghetti', 'grains', 'lb'],
    ['pasta-penne', 'Penne', 'grains', 'lb'],
    ['pasta-rigatoni', 'Rigatoni', 'grains', 'lb'],
    ['pasta-fusilli', 'Fusilli', 'grains', 'lb'],
    ['pasta-farfalle', 'Farfalle (Bow Tie)', 'grains', 'lb'],
    ['pasta-linguine', 'Linguine', 'grains', 'lb'],
    ['pasta-fettuccine', 'Fettuccine', 'grains', 'lb'],
    ['pasta-angel-hair', 'Angel Hair Pasta', 'grains', 'lb'],
    ['pasta-orzo', 'Orzo', 'grains', 'lb'],
    ['pasta-lasagna', 'Lasagna Noodles', 'grains', 'lb'],
    ['pasta-macaroni', 'Elbow Macaroni', 'grains', 'lb'],
    ['pasta-ziti', 'Ziti', 'grains', 'lb'],
    ['pasta-shells', 'Pasta Shells', 'grains', 'lb'],
    ['pasta-ditalini', 'Ditalini', 'grains', 'lb'],
    ['pasta-bucatini', 'Bucatini', 'grains', 'lb'],
    ['pasta-pappardelle', 'Pappardelle', 'grains', 'lb'],
    ['pasta-orecchiette', 'Orecchiette', 'grains', 'lb'],
    ['pasta-egg-noodles', 'Egg Noodles', 'grains', 'lb'],
    ['pasta-ramen-noodles', 'Ramen Noodles', 'grains', 'oz'],
    ['pasta-rice-noodles', 'Rice Noodles', 'grains', 'lb'],
    ['pasta-soba-noodles', 'Soba Noodles', 'grains', 'lb'],
    ['pasta-udon-noodles', 'Udon Noodles', 'grains', 'lb'],
    ['tortellini-cheese', 'Cheese Tortellini', 'grains', 'oz'],
    ['ravioli-cheese', 'Cheese Ravioli', 'grains', 'oz'],
    ['gnocchi', 'Gnocchi', 'grains', 'lb'],
    ['vinegar-balsamic', 'Balsamic Vinegar', 'pantry', 'fl_oz'],
    ['vinegar-red-wine', 'Red Wine Vinegar', 'pantry', 'fl_oz'],
    ['vinegar-white-wine', 'White Wine Vinegar', 'pantry', 'fl_oz'],
    ['vinegar-apple-cider', 'Apple Cider Vinegar', 'pantry', 'fl_oz'],
    ['vinegar-rice', 'Rice Vinegar', 'pantry', 'fl_oz'],
    ['vinegar-sherry', 'Sherry Vinegar', 'pantry', 'fl_oz'],
    ['vinegar-distilled', 'Distilled White Vinegar', 'pantry', 'fl_oz'],
    ['soy-sauce', 'Soy Sauce', 'pantry', 'fl_oz'],
    ['soy-sauce-low-sodium', 'Low Sodium Soy Sauce', 'pantry', 'fl_oz'],
    ['tamari', 'Tamari', 'pantry', 'fl_oz'],
    ['fish-sauce', 'Fish Sauce', 'pantry', 'fl_oz'],
    ['oyster-sauce', 'Oyster Sauce', 'pantry', 'fl_oz'],
    ['hoisin-sauce', 'Hoisin Sauce', 'pantry', 'fl_oz'],
    ['sriracha', 'Sriracha', 'pantry', 'fl_oz'],
    ['hot-sauce', 'Hot Sauce', 'pantry', 'fl_oz'],
    ['worcestershire-sauce', 'Worcestershire Sauce', 'pantry', 'fl_oz'],
    ['teriyaki-sauce', 'Teriyaki Sauce', 'pantry', 'fl_oz'],
    ['mustard-dijon', 'Dijon Mustard', 'pantry', 'oz'],
    ['mustard-yellow', 'Yellow Mustard', 'pantry', 'oz'],
    ['mustard-whole-grain', 'Whole Grain Mustard', 'pantry', 'oz'],
    ['ketchup', 'Ketchup', 'pantry', 'oz'],
    ['mayonnaise', 'Mayonnaise', 'pantry', 'oz'],
    ['tahini', 'Tahini', 'pantry', 'oz'],
    ['miso-white', 'White Miso Paste', 'pantry', 'oz'],
    ['miso-red', 'Red Miso Paste', 'pantry', 'oz'],
    ['curry-paste-red', 'Red Curry Paste', 'pantry', 'oz'],
    ['curry-paste-green', 'Green Curry Paste', 'pantry', 'oz'],
    ['harissa', 'Harissa Paste', 'pantry', 'oz'],
    ['gochujang', 'Gochujang (Korean Red Pepper Paste)', 'pantry', 'oz'],
    ['sambal-oelek', 'Sambal Oelek', 'pantry', 'oz'],
    ['tomato-paste', 'Tomato Paste', 'pantry', 'oz'],
    ['tomato-sauce', 'Tomato Sauce', 'pantry', 'oz'],
    ['tomatoes-crushed-canned', 'Crushed Tomatoes (Canned)', 'pantry', 'oz'],
    ['tomatoes-diced-canned', 'Diced Tomatoes (Canned)', 'pantry', 'oz'],
    ['tomatoes-whole-canned', 'Whole Peeled Tomatoes (Canned)', 'pantry', 'oz'],
    ['tomatoes-san-marzano', 'San Marzano Tomatoes', 'pantry', 'oz'],
    ['stock-chicken', 'Chicken Stock', 'pantry', 'fl_oz'],
    ['stock-beef', 'Beef Stock', 'pantry', 'fl_oz'],
    ['stock-vegetable', 'Vegetable Stock', 'pantry', 'fl_oz'],
    ['stock-bone-broth', 'Bone Broth', 'pantry', 'fl_oz'],
    ['coconut-milk', 'Coconut Milk (Canned)', 'pantry', 'oz'],
    ['coconut-cream', 'Coconut Cream', 'pantry', 'oz'],
    ['breadcrumbs', 'Breadcrumbs', 'pantry', 'oz'],
    ['panko', 'Panko Breadcrumbs', 'pantry', 'oz'],
    ['stuffing-mix', 'Stuffing Mix', 'pantry', 'oz'],
    ['croutons', 'Croutons', 'pantry', 'oz'],
    ['peanut-butter', 'Peanut Butter', 'pantry', 'oz'],
    ['almond-butter', 'Almond Butter', 'pantry', 'oz'],
    ['cashew-butter', 'Cashew Butter', 'pantry', 'oz'],

    // ===== NUTS & SEEDS (20+) =====
    ['almonds', 'Almonds', 'pantry', 'lb'],
    ['almonds-sliced', 'Sliced Almonds', 'pantry', 'oz'],
    ['walnuts', 'Walnuts', 'pantry', 'lb'],
    ['pecans', 'Pecans', 'pantry', 'lb'],
    ['cashews', 'Cashews', 'pantry', 'lb'],
    ['pistachios', 'Pistachios', 'pantry', 'lb'],
    ['peanuts', 'Peanuts', 'pantry', 'lb'],
    ['macadamia-nuts', 'Macadamia Nuts', 'pantry', 'lb'],
    ['hazelnuts', 'Hazelnuts (Filberts)', 'pantry', 'lb'],
    ['pine-nuts', 'Pine Nuts', 'pantry', 'oz'],
    ['brazil-nuts', 'Brazil Nuts', 'pantry', 'lb'],
    ['chestnuts', 'Chestnuts', 'pantry', 'lb'],
    ['sunflower-seeds', 'Sunflower Seeds', 'pantry', 'lb'],
    ['pumpkin-seeds', 'Pumpkin Seeds (Pepitas)', 'pantry', 'oz'],
    ['chia-seeds', 'Chia Seeds', 'pantry', 'oz'],
    ['flaxseed', 'Flaxseed (Ground)', 'pantry', 'oz'],
    ['hemp-seeds', 'Hemp Hearts', 'pantry', 'oz'],
    ['sesame-seeds', 'Sesame Seeds', 'pantry', 'oz'],
    ['poppy-seeds', 'Poppy Seeds', 'pantry', 'oz'],

    // ===== LEGUMES (15+) =====
    ['black-beans-canned', 'Black Beans (Canned)', 'pantry', 'oz'],
    ['black-beans-dried', 'Black Beans (Dried)', 'pantry', 'lb'],
    ['kidney-beans-canned', 'Kidney Beans (Canned)', 'pantry', 'oz'],
    ['cannellini-beans-canned', 'Cannellini Beans (Canned)', 'pantry', 'oz'],
    ['navy-beans-dried', 'Navy Beans (Dried)', 'pantry', 'lb'],
    ['pinto-beans-canned', 'Pinto Beans (Canned)', 'pantry', 'oz'],
    ['chickpeas-canned', 'Chickpeas (Canned)', 'pantry', 'oz'],
    ['chickpeas-dried', 'Chickpeas (Dried)', 'pantry', 'lb'],
    ['lentils-green', 'Green Lentils', 'pantry', 'lb'],
    ['lentils-red', 'Red Lentils', 'pantry', 'lb'],
    ['lentils-brown', 'Brown Lentils', 'pantry', 'lb'],
    ['lentils-french', 'French Lentils (Du Puy)', 'pantry', 'lb'],
    ['split-peas-green', 'Green Split Peas', 'pantry', 'lb'],
    ['split-peas-yellow', 'Yellow Split Peas', 'pantry', 'lb'],
    ['lima-beans', 'Lima Beans', 'pantry', 'lb'],
    ['great-northern-beans', 'Great Northern Beans', 'pantry', 'lb'],
    ['refried-beans', 'Refried Beans (Canned)', 'pantry', 'oz'],

    // ===== BREAD & BAKERY (25+) =====
    ['bread-white', 'White Bread', 'grains', 'loaf'],
    ['bread-whole-wheat', 'Whole Wheat Bread', 'grains', 'loaf'],
    ['bread-sourdough', 'Sourdough Bread', 'grains', 'loaf'],
    ['bread-rye', 'Rye Bread', 'grains', 'loaf'],
    ['bread-pumpernickel', 'Pumpernickel Bread', 'grains', 'loaf'],
    ['bread-ciabatta', 'Ciabatta Bread', 'grains', 'each'],
    ['bread-french', 'French Bread (Baguette)', 'grains', 'each'],
    ['bread-italian', 'Italian Bread', 'grains', 'each'],
    ['bread-focaccia', 'Focaccia', 'grains', 'each'],
    ['bread-naan', 'Naan Bread', 'grains', 'each'],
    ['bread-pita', 'Pita Bread', 'grains', 'each'],
    ['tortilla-flour', 'Flour Tortilla', 'grains', 'each'],
    ['tortilla-corn', 'Corn Tortilla', 'grains', 'each'],
    ['bagels', 'Bagels', 'grains', 'each'],
    ['english-muffins', 'English Muffins', 'grains', 'each'],
    ['hamburger-buns', 'Hamburger Buns', 'grains', 'each'],
    ['hot-dog-buns', 'Hot Dog Buns', 'grains', 'each'],
    ['dinner-rolls', 'Dinner Rolls', 'grains', 'each'],
    ['croissants', 'Croissants', 'grains', 'each'],
    ['brioche', 'Brioche', 'grains', 'each'],
    ['cornbread', 'Cornbread', 'grains', 'each'],
    ['crackers-saltine', 'Saltine Crackers', 'grains', 'oz'],
    ['crackers-ritz', 'Ritz Crackers', 'grains', 'oz'],
    ['matzo', 'Matzo', 'grains', 'each'],
    ['wonton-wrappers', 'Wonton Wrappers', 'grains', 'each'],
    ['spring-roll-wrappers', 'Spring Roll Wrappers', 'grains', 'each'],
    ['puff-pastry', 'Puff Pastry (Frozen)', 'grains', 'each'],
    ['phyllo-dough', 'Phyllo Dough', 'grains', 'each'],
    ['pie-crust', 'Pie Crust (Frozen)', 'grains', 'each'],
    ['pizza-dough', 'Pizza Dough', 'grains', 'lb'],

    // ===== BEVERAGES (20+) =====
    ['coffee-whole-bean', 'Whole Bean Coffee', 'beverages', 'lb'],
    ['coffee-ground', 'Ground Coffee', 'beverages', 'lb'],
    ['coffee-instant', 'Instant Coffee', 'beverages', 'oz'],
    ['tea-black', 'Black Tea', 'beverages', 'each'],
    ['tea-green', 'Green Tea', 'beverages', 'each'],
    ['tea-herbal', 'Herbal Tea', 'beverages', 'each'],
    ['juice-orange', 'Orange Juice', 'beverages', 'fl_oz'],
    ['juice-apple', 'Apple Juice', 'beverages', 'fl_oz'],
    ['juice-cranberry', 'Cranberry Juice', 'beverages', 'fl_oz'],
    ['juice-grape', 'Grape Juice', 'beverages', 'fl_oz'],
    ['juice-lemon', 'Lemon Juice', 'beverages', 'fl_oz'],
    ['juice-lime', 'Lime Juice', 'beverages', 'fl_oz'],
    ['juice-tomato', 'Tomato Juice', 'beverages', 'fl_oz'],
    ['coconut-water', 'Coconut Water', 'beverages', 'fl_oz'],

    // ===== TOFU & PLANT PROTEINS (10+) =====
    ['tofu-firm', 'Firm Tofu', 'pantry', 'oz'],
    ['tofu-extra-firm', 'Extra Firm Tofu', 'pantry', 'oz'],
    ['tofu-silken', 'Silken Tofu', 'pantry', 'oz'],
    ['tempeh', 'Tempeh', 'pantry', 'oz'],
    ['seitan', 'Seitan', 'pantry', 'oz'],
    ['beyond-burger', 'Beyond Burger', 'pantry', 'each'],
    ['impossible-burger', 'Impossible Burger', 'pantry', 'each'],
    ['tvp', 'Textured Vegetable Protein (TVP)', 'pantry', 'oz'],
    ['nutritional-yeast', 'Nutritional Yeast', 'pantry', 'oz'],
    ['vital-wheat-gluten', 'Vital Wheat Gluten', 'pantry', 'oz'],

    // ===== DRIED FRUITS (15+) =====
    ['raisins', 'Raisins', 'pantry', 'oz'],
    ['raisins-golden', 'Golden Raisins', 'pantry', 'oz'],
    ['cranberries-dried', 'Dried Cranberries (Craisins)', 'pantry', 'oz'],
    ['apricots-dried', 'Dried Apricots', 'pantry', 'oz'],
    ['figs-dried', 'Dried Figs', 'pantry', 'oz'],
    ['prunes', 'Prunes', 'pantry', 'oz'],
    ['dates-medjool', 'Medjool Dates', 'pantry', 'oz'],
    ['coconut-shredded', 'Shredded Coconut', 'pantry', 'oz'],
    ['coconut-flakes', 'Coconut Flakes', 'pantry', 'oz'],
    ['mango-dried', 'Dried Mango', 'pantry', 'oz'],
    ['pineapple-dried', 'Dried Pineapple', 'pantry', 'oz'],
    ['banana-chips', 'Banana Chips', 'pantry', 'oz'],
    ['goji-berries', 'Goji Berries', 'pantry', 'oz'],
    ['cherries-dried', 'Dried Cherries', 'pantry', 'oz'],

    // ===== CANNED & JARRED (20+) =====
    ['olives-black', 'Black Olives (Canned)', 'pantry', 'oz'],
    ['olives-kalamata', 'Kalamata Olives', 'pantry', 'oz'],
    ['olives-green', 'Green Olives', 'pantry', 'oz'],
    ['capers', 'Capers', 'pantry', 'oz'],
    ['artichoke-hearts-canned', 'Artichoke Hearts (Canned)', 'pantry', 'oz'],
    ['roasted-red-peppers', 'Roasted Red Peppers (Jarred)', 'pantry', 'oz'],
    ['pickles-dill', 'Dill Pickles', 'pantry', 'oz'],
    ['pickles-bread-butter', 'Bread and Butter Pickles', 'pantry', 'oz'],
    ['sauerkraut', 'Sauerkraut', 'pantry', 'oz'],
    ['kimchi', 'Kimchi', 'pantry', 'oz'],
    ['pumpkin-puree-canned', 'Pumpkin Puree (Canned)', 'pantry', 'oz'],
    ['corn-canned', 'Corn (Canned)', 'pantry', 'oz'],
    ['peas-canned', 'Green Peas (Canned)', 'pantry', 'oz'],
    ['green-beans-canned', 'Green Beans (Canned)', 'pantry', 'oz'],
    ['beets-canned', 'Beets (Canned)', 'pantry', 'oz'],
    ['corn-creamed', 'Creamed Corn (Canned)', 'pantry', 'oz'],
    ['bamboo-shoots-canned', 'Bamboo Shoots (Canned)', 'pantry', 'oz'],
    ['water-chestnuts-canned', 'Water Chestnuts (Canned)', 'pantry', 'oz'],
    ['hearts-of-palm-canned', 'Hearts of Palm (Canned)', 'pantry', 'oz'],
    ['chipotle-in-adobo', 'Chipotle Peppers in Adobo', 'pantry', 'oz'],
    ['sun-dried-tomatoes-jarred', 'Sun-Dried Tomatoes (Oil-Packed)', 'pantry', 'oz'],
    ['pesto-jarred', 'Pesto (Jarred)', 'pantry', 'oz'],
    ['marinara-jarred', 'Marinara Sauce (Jarred)', 'pantry', 'oz'],
    ['alfredo-jarred', 'Alfredo Sauce (Jarred)', 'pantry', 'oz'],
    ['salsa-jarred', 'Salsa (Jarred)', 'pantry', 'oz'],
  ];

  let imported = 0;
  for (const [id, name, category, unit] of foods) {
    insertStmt.run(id, name, category, unit);
    imported++;
  }

  console.log(`  Imported ${imported} items from comprehensive food list`);
  return imported;
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
