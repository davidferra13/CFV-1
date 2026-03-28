/**
 * OpenClaw - Unit Normalization Module
 * Category-aware unit standardization with conversion factors.
 *
 * Every price gets normalized to a standard unit for its category
 * so "12oz bag of chicken breast for $5.99" becomes "$7.99/lb".
 *
 * Integer math throughout (cents). Rounding happens once at the end.
 */

// Standard unit per food category
const CATEGORY_STANDARD_UNITS = {
  // Proteins
  'poultry': 'lb',
  'beef': 'lb',
  'pork': 'lb',
  'lamb': 'lb',
  'game': 'lb',
  'seafood': 'lb',
  'deli_meat': 'lb',
  'sausage': 'lb',

  // Dairy
  'dairy': 'lb',       // default for cheese, butter
  'milk': 'gallon',
  'cream': 'gallon',
  'eggs': 'dozen',
  'yogurt': 'oz',
  'cheese': 'lb',
  'butter': 'lb',

  // Produce
  'produce': 'lb',
  'vegetables': 'lb',
  'vegetable': 'lb',
  'fruit': 'lb',
  'fruits': 'lb',
  'produce_by_unit': 'each',  // avocado, artichoke, head of lettuce
  'herbs': 'bunch',
  'herb': 'bunch',

  // Spices
  'spices': 'oz',
  'spice': 'oz',
  'seasoning': 'oz',

  // Pantry
  'oil': 'fl_oz',
  'oils': 'fl_oz',
  'vinegar': 'fl_oz',
  'pantry': 'lb',       // flour, sugar, rice
  'flour': 'lb',
  'sugar': 'lb',
  'grain': 'lb',
  'grains': 'lb',
  'pasta': 'lb',
  'rice': 'lb',
  'legumes': 'lb',
  'legume': 'lb',
  'beans': 'lb',
  'nuts': 'lb',

  // Canned
  'canned': 'oz',
  'canned_goods': 'oz',
  'soup': 'oz',
  'sauce': 'oz',
  'condiment': 'oz',
  'condiments': 'oz',

  // Bakery
  'bakery': 'each',
  'bread': 'each',

  // Beverages
  'beverages': 'fl_oz',
  'beverage': 'fl_oz',
  'juice': 'fl_oz',
  'coffee': 'oz',
  'tea': 'oz',

  // Frozen
  'frozen': 'oz',

  // Snacks
  'snacks': 'oz',
  'snack': 'oz',
  'chips': 'oz',
  'crackers': 'oz',

  // Default
  'uncategorized': 'each',
  'other': 'each',
  'misc': 'each',
};

// Conversion factors: multiply source amount by factor to get target amount
const CONVERSIONS = {
  // Weight
  'oz_to_lb': 1 / 16,
  'lb_to_oz': 16,
  'g_to_lb': 1 / 453.592,
  'kg_to_lb': 2.20462,
  'g_to_oz': 1 / 28.3495,
  'kg_to_oz': 35.274,

  // Volume
  'fl_oz_to_gallon': 1 / 128,
  'cup_to_gallon': 1 / 16,
  'pint_to_gallon': 1 / 8,
  'quart_to_gallon': 1 / 4,
  'liter_to_gallon': 0.264172,
  'ml_to_fl_oz': 1 / 29.5735,
  'liter_to_fl_oz': 33.814,
  'gallon_to_fl_oz': 128,
  'cup_to_fl_oz': 8,
  'pint_to_fl_oz': 16,
  'quart_to_fl_oz': 32,

  // Count
  'half_dozen_to_dozen': 0.5,
  'each_to_dozen': 1 / 12,
};

// Unit aliases: normalize different spellings to standard keys
const UNIT_ALIASES = {
  'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
  'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
  'fl oz': 'fl_oz', 'fl_oz': 'fl_oz', 'fluid oz': 'fl_oz', 'fluid ounce': 'fl_oz', 'fluid ounces': 'fl_oz',
  'g': 'g', 'gram': 'g', 'grams': 'g',
  'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg', 'kilo': 'kg',
  'gal': 'gallon', 'gallon': 'gallon', 'gallons': 'gallon',
  'qt': 'quart', 'quart': 'quart', 'quarts': 'quart',
  'pt': 'pint', 'pint': 'pint', 'pints': 'pint',
  'cup': 'cup', 'cups': 'cup',
  'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
  'l': 'liter', 'liter': 'liter', 'liters': 'liter', 'litre': 'liter', 'litres': 'liter',
  'each': 'each', 'ea': 'each', 'ct': 'each', 'count': 'each', 'pc': 'each', 'piece': 'each', 'pieces': 'each',
  'dozen': 'dozen', 'doz': 'dozen',
  'bunch': 'bunch', 'bn': 'bunch', 'bunches': 'bunch',
  'head': 'each',
  'bag': 'each',
  'box': 'each',
  'can': 'each',
  'jar': 'each',
  'bottle': 'each',
  'pack': 'each',
  'package': 'each',
  'container': 'each',
  'tub': 'each',
  'carton': 'each',
};

/**
 * Parse a unit string to a standard key.
 */
function normalizeUnitName(raw) {
  if (!raw) return 'each';
  const cleaned = raw.toLowerCase().trim().replace(/\.$/, '');
  return UNIT_ALIASES[cleaned] || cleaned;
}

/**
 * Get the standard unit for a category.
 */
function getStandardUnit(category) {
  if (!category) return 'each';
  const key = category.toLowerCase().trim().replace(/\s+/g, '_');
  return CATEGORY_STANDARD_UNITS[key] || 'each';
}

/**
 * Get conversion factor from sourceUnit to targetUnit.
 * Returns null if no conversion is available.
 */
function getConversionFactor(sourceUnit, targetUnit) {
  if (sourceUnit === targetUnit) return 1;

  const key = `${sourceUnit}_to_${targetUnit}`;
  if (CONVERSIONS[key] !== undefined) return CONVERSIONS[key];

  // Try reverse
  const reverseKey = `${targetUnit}_to_${sourceUnit}`;
  if (CONVERSIONS[reverseKey] !== undefined) return 1 / CONVERSIONS[reverseKey];

  return null;
}

/**
 * Extract package size info from a product name string.
 * e.g. "12oz bag of rice" -> { quantity: 12, unit: 'oz' }
 * e.g. "2 lb chicken breast" -> { quantity: 2, unit: 'lb' }
 */
export function extractPackageSize(rawName) {
  if (!rawName) return null;
  const s = rawName.toLowerCase();

  // Pattern: "X.X lb" or "X.X lbs" or "X.X pound"
  const lbMatch = s.match(/(\d+\.?\d*)\s*(?:lbs?\.?|pounds?)\b/);
  if (lbMatch) return { quantity: parseFloat(lbMatch[1]), unit: 'lb' };

  // Pattern: "X.X kg" or "X.X kilogram"
  const kgMatch = s.match(/(\d+\.?\d*)\s*(?:kg\.?|kilograms?|kilos?)\b/);
  if (kgMatch) return { quantity: parseFloat(kgMatch[1]), unit: 'kg' };

  // Pattern: "X fl oz" or "X fluid oz"
  const flozMatch = s.match(/(\d+\.?\d*)\s*(?:fl\.?\s*oz\.?|fluid\s*oz\.?|fluid\s*ounces?)\b/);
  if (flozMatch) return { quantity: parseFloat(flozMatch[1]), unit: 'fl_oz' };

  // Pattern: "X oz" (after fl oz to avoid false match)
  const ozMatch = s.match(/(\d+\.?\d*)\s*(?:oz\.?|ounces?)\b/);
  if (ozMatch) return { quantity: parseFloat(ozMatch[1]), unit: 'oz' };

  // Pattern: "X gallon"
  const galMatch = s.match(/(\d+\.?\d*)\s*(?:gal\.?|gallons?)\b/);
  if (galMatch) return { quantity: parseFloat(galMatch[1]), unit: 'gallon' };

  // Pattern: "X quart"
  const qtMatch = s.match(/(\d+\.?\d*)\s*(?:qt\.?|quarts?)\b/);
  if (qtMatch) return { quantity: parseFloat(qtMatch[1]), unit: 'quart' };

  // Pattern: "X pint"
  const ptMatch = s.match(/(\d+\.?\d*)\s*(?:pt\.?|pints?)\b/);
  if (ptMatch) return { quantity: parseFloat(ptMatch[1]), unit: 'pint' };

  // Pattern: "X ml" or "X milliliter"
  const mlMatch = s.match(/(\d+\.?\d*)\s*(?:ml\.?|milliliters?)\b/);
  if (mlMatch) return { quantity: parseFloat(mlMatch[1]), unit: 'ml' };

  // Pattern: "X liter"
  const literMatch = s.match(/(\d+\.?\d*)\s*(?:l\.?|liters?|litres?)\b/);
  if (literMatch && !s.match(/\d+\.?\d*\s*lb/)) return { quantity: parseFloat(literMatch[1]), unit: 'liter' };

  // Pattern: "X ct" or "X count" or "X pack"
  const ctMatch = s.match(/(\d+)\s*(?:ct\.?|count|pk\.?|pack)\b/);
  if (ctMatch) return { quantity: parseInt(ctMatch[1]), unit: 'each' };

  // Pattern: "X g" (careful: avoid matching "X gallon" or "X grain")
  const gMatch = s.match(/(\d+\.?\d*)\s*g\b(?!al|rain)/);
  if (gMatch) return { quantity: parseFloat(gMatch[1]), unit: 'g' };

  return null;
}

/**
 * Normalize a price to the standard unit for its category.
 *
 * @param {Object} params
 * @param {number} params.priceCents - Raw price in cents
 * @param {string} params.rawUnit - Original unit (e.g., 'oz', 'each', 'lb')
 * @param {number} params.quantity - Number of units (e.g., 12 for a 12-pack)
 * @param {string|null} params.packageSize - Package description (e.g., "12 oz")
 * @param {string} params.category - Ingredient category
 * @param {string|null} params.rawProductName - Original product name for size extraction
 * @returns {{ normalized_cents: number, normalized_unit: string, original_cents: number, original_unit: string, conversion_note: string }}
 */
export function normalizePrice({ priceCents, rawUnit, quantity, packageSize, category, rawProductName }) {
  const originalUnit = normalizeUnitName(rawUnit);
  const targetUnit = getStandardUnit(category);
  const originalCents = priceCents;

  // If units already match, compute per-unit if quantity > 1
  if (originalUnit === targetUnit) {
    const effectiveQty = quantity && quantity > 0 ? quantity : 1;
    const normalizedCents = Math.round(priceCents / effectiveQty);
    return {
      normalized_cents: normalizedCents,
      normalized_unit: targetUnit,
      original_cents: originalCents,
      original_unit: rawUnit || 'each',
      conversion_note: effectiveQty > 1 ? `divided by ${effectiveQty} ${targetUnit}` : 'no_conversion_needed',
    };
  }

  // Try to extract package size from product name if not provided
  let pkg = packageSize ? parsePackageString(packageSize) : null;
  if (!pkg && rawProductName) {
    pkg = extractPackageSize(rawProductName);
  }

  // If we have a package size, try to convert
  if (pkg) {
    const pkgUnit = normalizeUnitName(pkg.unit);
    const factor = getConversionFactor(pkgUnit, targetUnit);

    if (factor !== null && pkg.quantity > 0) {
      // Total amount in target unit
      const totalInTarget = pkg.quantity * factor;
      if (totalInTarget > 0) {
        const normalizedCents = Math.round(priceCents / totalInTarget);
        return {
          normalized_cents: normalizedCents,
          normalized_unit: targetUnit,
          original_cents: originalCents,
          original_unit: rawUnit || 'each',
          conversion_note: `${pkg.quantity} ${pkg.unit} -> ${totalInTarget.toFixed(4)} ${targetUnit}`,
        };
      }
    }
  }

  // Direct unit conversion (no package info needed)
  const factor = getConversionFactor(originalUnit, targetUnit);
  if (factor !== null) {
    const effectiveQty = quantity && quantity > 0 ? quantity : 1;
    const totalInTarget = effectiveQty * factor;
    if (totalInTarget > 0) {
      const normalizedCents = Math.round(priceCents / totalInTarget);
      return {
        normalized_cents: normalizedCents,
        normalized_unit: targetUnit,
        original_cents: originalCents,
        original_unit: rawUnit || 'each',
        conversion_note: `${effectiveQty} ${originalUnit} -> ${totalInTarget.toFixed(4)} ${targetUnit}`,
      };
    }
  }

  // Can't convert: return original price as-is
  return {
    normalized_cents: priceCents,
    normalized_unit: rawUnit || 'each',
    original_cents: originalCents,
    original_unit: rawUnit || 'each',
    conversion_note: 'no_conversion_available',
  };
}

/**
 * Parse a package size string like "12 oz" into { quantity, unit }.
 */
function parsePackageString(packageStr) {
  if (!packageStr) return null;
  const match = packageStr.match(/^(\d+\.?\d*)\s*(.+)$/);
  if (!match) return null;
  return { quantity: parseFloat(match[1]), unit: match[2].trim() };
}

/**
 * Batch normalize all current_prices in the database.
 * Adds normalized_price_cents and normalized_unit columns.
 */
export function backfillNormalization(db) {
  // Ensure columns exist
  try {
    db.exec('ALTER TABLE current_prices ADD COLUMN normalized_price_cents INTEGER');
  } catch { /* column already exists */ }
  try {
    db.exec('ALTER TABLE current_prices ADD COLUMN normalized_unit TEXT');
  } catch { /* column already exists */ }

  const rows = db.prepare(`
    SELECT cp.id, cp.price_cents, cp.price_unit, cp.package_size, cp.raw_product_name,
           ci.category
    FROM current_prices cp
    JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id
  `).all();

  const update = db.prepare(`
    UPDATE current_prices SET normalized_price_cents = ?, normalized_unit = ? WHERE id = ?
  `);

  let normalized = 0;
  let failed = 0;

  const transaction = db.transaction(() => {
    for (const row of rows) {
      try {
        const result = normalizePrice({
          priceCents: row.price_cents,
          rawUnit: row.price_unit,
          quantity: 1,
          packageSize: row.package_size,
          category: row.category,
          rawProductName: row.raw_product_name,
        });

        update.run(result.normalized_cents, result.normalized_unit, row.id);
        normalized++;
      } catch {
        failed++;
      }
    }
  });

  transaction();

  return { total: rows.length, normalized, failed };
}

export { CATEGORY_STANDARD_UNITS, CONVERSIONS, UNIT_ALIASES, getStandardUnit, normalizeUnitName, getConversionFactor };
