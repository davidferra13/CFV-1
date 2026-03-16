import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeUnit,
  getUnitType,
  convertQuantity,
  convertWithDensity,
  convertCostToUnit,
  computeIngredientCost,
  lookupDensity,
  canConvert,
  COMMON_DENSITIES,
} from '@/lib/units/conversion-engine'

// ── normalizeUnit ────────────────────────────────────────────────────

test('normalizeUnit maps singular/plural volume aliases', () => {
  assert.equal(normalizeUnit('teaspoon'), 'tsp')
  assert.equal(normalizeUnit('teaspoons'), 'tsp')
  assert.equal(normalizeUnit('tsp'), 'tsp')
  assert.equal(normalizeUnit('t'), 'tsp')
  assert.equal(normalizeUnit('tablespoon'), 'tbsp')
  assert.equal(normalizeUnit('tablespoons'), 'tbsp')
  // 'T' is case-sensitive shorthand for tablespoon in recipe notation
  assert.equal(normalizeUnit('T'), 'tbsp')
  assert.equal(normalizeUnit('cup'), 'cup')
  assert.equal(normalizeUnit('cups'), 'cup')
  assert.equal(normalizeUnit('c'), 'cup')
  assert.equal(normalizeUnit('fl oz'), 'fl_oz')
  assert.equal(normalizeUnit('fluid ounce'), 'fl_oz')
  assert.equal(normalizeUnit('fluid ounces'), 'fl_oz')
  assert.equal(normalizeUnit('floz'), 'fl_oz')
  assert.equal(normalizeUnit('pint'), 'pint')
  assert.equal(normalizeUnit('pints'), 'pint')
  assert.equal(normalizeUnit('pt'), 'pint')
  assert.equal(normalizeUnit('quart'), 'quart')
  assert.equal(normalizeUnit('quarts'), 'quart')
  assert.equal(normalizeUnit('qt'), 'quart')
  assert.equal(normalizeUnit('gallon'), 'gallon')
  assert.equal(normalizeUnit('gallons'), 'gallon')
  assert.equal(normalizeUnit('gal'), 'gallon')
  assert.equal(normalizeUnit('ml'), 'ml')
  assert.equal(normalizeUnit('milliliter'), 'ml')
  assert.equal(normalizeUnit('millilitre'), 'ml')
  assert.equal(normalizeUnit('l'), 'l')
  assert.equal(normalizeUnit('liter'), 'l')
  assert.equal(normalizeUnit('litre'), 'l')
  assert.equal(normalizeUnit('dl'), 'dl')
  assert.equal(normalizeUnit('deciliter'), 'dl')
})

test('normalizeUnit maps singular/plural weight aliases', () => {
  assert.equal(normalizeUnit('ounce'), 'oz')
  assert.equal(normalizeUnit('ounces'), 'oz')
  assert.equal(normalizeUnit('oz'), 'oz')
  assert.equal(normalizeUnit('pound'), 'lb')
  assert.equal(normalizeUnit('pounds'), 'lb')
  assert.equal(normalizeUnit('lb'), 'lb')
  assert.equal(normalizeUnit('lbs'), 'lb')
  assert.equal(normalizeUnit('gram'), 'g')
  assert.equal(normalizeUnit('grams'), 'g')
  assert.equal(normalizeUnit('g'), 'g')
  assert.equal(normalizeUnit('kilogram'), 'kg')
  assert.equal(normalizeUnit('kilograms'), 'kg')
  assert.equal(normalizeUnit('kg'), 'kg')
  assert.equal(normalizeUnit('mg'), 'mg')
  assert.equal(normalizeUnit('milligram'), 'mg')
})

test('normalizeUnit maps count-based aliases', () => {
  assert.equal(normalizeUnit('each'), 'each')
  assert.equal(normalizeUnit('ea'), 'each')
  assert.equal(normalizeUnit('piece'), 'each')
  assert.equal(normalizeUnit('pieces'), 'each')
  assert.equal(normalizeUnit('whole'), 'each')
  assert.equal(normalizeUnit('unit'), 'each')
  assert.equal(normalizeUnit('clove'), 'clove')
  assert.equal(normalizeUnit('cloves'), 'clove')
  assert.equal(normalizeUnit('bunch'), 'bunch')
  assert.equal(normalizeUnit('bunches'), 'bunch')
  assert.equal(normalizeUnit('slice'), 'slice')
  assert.equal(normalizeUnit('slices'), 'slice')
  assert.equal(normalizeUnit('can'), 'can')
  assert.equal(normalizeUnit('cans'), 'can')
  assert.equal(normalizeUnit('stick'), 'stick')
  assert.equal(normalizeUnit('sticks'), 'stick')
})

test('normalizeUnit is case-insensitive', () => {
  assert.equal(normalizeUnit('CUP'), 'cup')
  assert.equal(normalizeUnit('Tablespoon'), 'tbsp')
  assert.equal(normalizeUnit('OUNCES'), 'oz')
  assert.equal(normalizeUnit('Lb'), 'lb')
})

test('normalizeUnit trims whitespace', () => {
  assert.equal(normalizeUnit('  cup  '), 'cup')
  assert.equal(normalizeUnit(' lb'), 'lb')
})

test('normalizeUnit returns input for unknown units', () => {
  assert.equal(normalizeUnit('bushel'), 'bushel')
  assert.equal(normalizeUnit('foobar'), 'foobar')
})

// ── getUnitType ──────────────────────────────────────────────────────

test('getUnitType classifies volume units', () => {
  assert.equal(getUnitType('tsp'), 'volume')
  assert.equal(getUnitType('tbsp'), 'volume')
  assert.equal(getUnitType('cup'), 'volume')
  assert.equal(getUnitType('fl oz'), 'volume')
  assert.equal(getUnitType('pint'), 'volume')
  assert.equal(getUnitType('quart'), 'volume')
  assert.equal(getUnitType('gallon'), 'volume')
  assert.equal(getUnitType('ml'), 'volume')
  assert.equal(getUnitType('l'), 'volume')
  assert.equal(getUnitType('dl'), 'volume')
})

test('getUnitType classifies weight units', () => {
  assert.equal(getUnitType('oz'), 'weight')
  assert.equal(getUnitType('lb'), 'weight')
  assert.equal(getUnitType('g'), 'weight')
  assert.equal(getUnitType('kg'), 'weight')
  assert.equal(getUnitType('mg'), 'weight')
})

test('getUnitType classifies count units', () => {
  assert.equal(getUnitType('each'), 'count')
  assert.equal(getUnitType('pinch'), 'count')
  assert.equal(getUnitType('dash'), 'count')
  assert.equal(getUnitType('clove'), 'count')
  assert.equal(getUnitType('bunch'), 'count')
  assert.equal(getUnitType('head'), 'count')
  assert.equal(getUnitType('sprig'), 'count')
  assert.equal(getUnitType('slice'), 'count')
  assert.equal(getUnitType('can'), 'count')
  assert.equal(getUnitType('stick'), 'count')
  assert.equal(getUnitType('package'), 'count')
  assert.equal(getUnitType('bag'), 'count')
  assert.equal(getUnitType('bottle'), 'count')
  assert.equal(getUnitType('jar'), 'count')
})

test('getUnitType returns unknown for unrecognized units', () => {
  assert.equal(getUnitType('bushel'), 'unknown')
  assert.equal(getUnitType('firkin'), 'unknown')
})

test('getUnitType works with alias input (normalizes first)', () => {
  assert.equal(getUnitType('tablespoons'), 'volume')
  assert.equal(getUnitType('pounds'), 'weight')
  assert.equal(getUnitType('pieces'), 'count')
})

// ── convertQuantity (same-type) ──────────────────────────────────────

test('convertQuantity returns same qty for same unit', () => {
  assert.equal(convertQuantity(5, 'cup', 'cup'), 5)
  assert.equal(convertQuantity(3.5, 'lb', 'lb'), 3.5)
})

test('convertQuantity converts volume to volume', () => {
  // 1 cup = 16 tbsp
  const result = convertQuantity(1, 'cup', 'tbsp')
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 16) < 0.1, `Expected ~16 tbsp, got ${result}`)
})

test('convertQuantity converts 1 cup to ~48 tsp', () => {
  const result = convertQuantity(1, 'cup', 'tsp')
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 48) < 0.5, `Expected ~48 tsp, got ${result}`)
})

test('convertQuantity converts 1 gallon to ~16 cups', () => {
  const result = convertQuantity(1, 'gallon', 'cup')
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 16) < 0.1, `Expected ~16 cups, got ${result}`)
})

test('convertQuantity converts 1 quart to ~4 cups', () => {
  const result = convertQuantity(1, 'quart', 'cup')
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 4) < 0.1, `Expected ~4 cups, got ${result}`)
})

test('convertQuantity converts 1 pint to ~2 cups', () => {
  const result = convertQuantity(1, 'pint', 'cup')
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 2) < 0.1, `Expected ~2 cups, got ${result}`)
})

test('convertQuantity converts 1 liter to ~1000 ml', () => {
  const result = convertQuantity(1, 'l', 'ml')
  assert.ok(result !== null)
  assert.equal(result, 1000)
})

test('convertQuantity converts weight to weight', () => {
  // 1 lb = ~16 oz
  const result = convertQuantity(1, 'lb', 'oz')
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 16) < 0.1, `Expected ~16 oz, got ${result}`)
})

test('convertQuantity converts 1 kg to 1000 g', () => {
  const result = convertQuantity(1, 'kg', 'g')
  assert.ok(result !== null)
  assert.equal(result, 1000)
})

test('convertQuantity converts 1 lb to ~453.6 g', () => {
  const result = convertQuantity(1, 'lb', 'g')
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 453.592) < 0.1, `Expected ~453.6g, got ${result}`)
})

test('convertQuantity returns null for cross-type (volume to weight)', () => {
  assert.equal(convertQuantity(1, 'cup', 'oz'), null)
  assert.equal(convertQuantity(1, 'ml', 'g'), null)
})

test('convertQuantity returns null for count units', () => {
  assert.equal(convertQuantity(1, 'each', 'cup'), null)
  assert.equal(convertQuantity(1, 'lb', 'each'), null)
})

test('convertQuantity handles fractional inputs', () => {
  // 0.5 cups to tbsp = ~8
  const result = convertQuantity(0.5, 'cup', 'tbsp')
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 8) < 0.1)
})

test('convertQuantity is bidirectional', () => {
  // Convert 2 cups to ml, then back
  const ml = convertQuantity(2, 'cup', 'ml')
  assert.ok(ml !== null)
  const cups = convertQuantity(ml, 'ml', 'cup')
  assert.ok(cups !== null)
  assert.ok(Math.abs(cups - 2) < 0.01, `Round-trip: expected 2, got ${cups}`)
})

// ── convertWithDensity (cross-type) ──────────────────────────────────

test('convertWithDensity handles same-type without density', () => {
  const result = convertWithDensity(2, 'cup', 'tbsp', null)
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 32) < 0.5)
})

test('convertWithDensity converts volume to weight with density', () => {
  // 1 cup of water (density 1.0) = ~236.588 ml = ~236.588 g = ~8.35 oz
  const result = convertWithDensity(1, 'cup', 'oz', 1.0)
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 8.35) < 0.1, `Expected ~8.35 oz, got ${result}`)
})

test('convertWithDensity converts weight to volume with density', () => {
  // 1 lb of water = 453.592 g / 1.0 density = 453.592 ml = ~1.917 cups
  const result = convertWithDensity(1, 'lb', 'cup', 1.0)
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 1.917) < 0.05, `Expected ~1.917 cups, got ${result}`)
})

test('convertWithDensity uses flour density correctly', () => {
  // 1 cup flour: 236.588 ml * 0.53 = 125.39 g = ~4.42 oz
  const result = convertWithDensity(1, 'cup', 'oz', 0.53)
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 4.42) < 0.1, `Expected ~4.42 oz flour, got ${result}`)
})

test('convertWithDensity returns null without density for cross-type', () => {
  assert.equal(convertWithDensity(1, 'cup', 'oz', null), null)
  assert.equal(convertWithDensity(1, 'cup', 'oz', undefined), null)
  assert.equal(convertWithDensity(1, 'cup', 'oz', 0), null)
  assert.equal(convertWithDensity(1, 'cup', 'oz', -1), null)
})

test('convertWithDensity returns same qty for same unit', () => {
  assert.equal(convertWithDensity(3, 'cup', 'cup', null), 3)
})

test('convertWithDensity sugar: 1 cup = ~7.1 oz', () => {
  // 236.588 ml * 0.85 = 201.1 g = ~7.1 oz
  const result = convertWithDensity(1, 'cup', 'oz', 0.85)
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 7.1) < 0.2, `Expected ~7.1 oz sugar, got ${result}`)
})

test('convertWithDensity honey: 1 cup = ~11.8 oz', () => {
  // 236.588 ml * 1.42 = 335.95 g = ~11.85 oz
  const result = convertWithDensity(1, 'cup', 'oz', 1.42)
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 11.85) < 0.2, `Expected ~11.85 oz honey, got ${result}`)
})

// ── convertCostToUnit ────────────────────────────────────────────────

test('convertCostToUnit: same unit returns same cost', () => {
  // Flour costs 500 cents per lb, target is also lb
  const result = convertCostToUnit(500, 'lb', 'lb', null)
  assert.equal(result, 500)
})

test('convertCostToUnit: lb to oz', () => {
  // 500 cents per lb / ~16 oz per lb = ~31 cents per oz
  const result = convertCostToUnit(500, 'lb', 'oz', null)
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 31) < 2, `Expected ~31 cents/oz, got ${result}`)
})

test('convertCostToUnit: lb to cup (flour, density 0.53)', () => {
  // 1 lb flour = how many cups? 453.592g / 0.53 = 855.8 ml / 236.588 = 3.617 cups
  // 300 cents per lb / 3.617 cups per lb = ~83 cents per cup
  const result = convertCostToUnit(300, 'lb', 'cup', 0.53)
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 83) < 5, `Expected ~83 cents/cup flour, got ${result}`)
})

test('convertCostToUnit returns null for impossible conversion', () => {
  assert.equal(convertCostToUnit(500, 'lb', 'cup', null), null) // no density
  assert.equal(convertCostToUnit(500, 'each', 'cup', 1.0), null) // count to volume
})

// ── computeIngredientCost ────────────────────────────────────────────

test('computeIngredientCost: same units, simple multiplication', () => {
  // 2 lbs at 500 cents/lb = 1000 cents
  assert.equal(computeIngredientCost(2, 'lb', 500, 'lb'), 1000)
})

test('computeIngredientCost: same units with fractional qty', () => {
  // 0.5 lb at 800 cents/lb = 400 cents
  assert.equal(computeIngredientCost(0.5, 'lb', 800, 'lb'), 400)
})

test('computeIngredientCost: weight to weight conversion', () => {
  // 8 oz at 500 cents/lb
  // 8 oz = 0.5 lb -> 0.5 * 500 = 250 cents
  const result = computeIngredientCost(8, 'oz', 500, 'lb')
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 250) < 2, `Expected ~250 cents, got ${result}`)
})

test('computeIngredientCost: volume to weight with density (flour)', () => {
  // 2 cups flour at 300 cents/lb, density 0.53
  // 2 cups = 473.176 ml * 0.53 = 250.78 g = 0.5529 lb
  // 0.5529 * 300 = 165.87 -> 166 cents
  const result = computeIngredientCost(2, 'cup', 300, 'lb', 0.53)
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 166) < 5, `Expected ~166 cents for 2 cups flour, got ${result}`)
})

test('computeIngredientCost: tsp of salt at cost per lb', () => {
  // 1 tsp salt at 200 cents/lb, density 1.22
  // 1 tsp = 4.929 ml * 1.22 = 6.013 g = 0.01325 lb
  // 0.01325 * 200 = 2.65 -> 3 cents
  const result = computeIngredientCost(1, 'tsp', 200, 'lb', 1.22)
  assert.ok(result !== null)
  assert.ok(result >= 2 && result <= 4, `Expected 2-4 cents for 1 tsp salt, got ${result}`)
})

test('computeIngredientCost returns null for impossible conversion', () => {
  // cup to lb with no density
  assert.equal(computeIngredientCost(1, 'cup', 500, 'lb'), null)
  // each to lb (even with density, count doesn't convert)
  assert.equal(computeIngredientCost(1, 'each', 500, 'lb', 1.0), null)
})

test('computeIngredientCost: zero quantity returns 0', () => {
  assert.equal(computeIngredientCost(0, 'lb', 500, 'lb'), 0)
})

test('computeIngredientCost: volume to volume conversion', () => {
  // 2 tbsp at 400 cents/cup
  // 2 tbsp = 2/16 cup = 0.125 cup -> 0.125 * 400 = 50 cents
  const result = computeIngredientCost(2, 'tbsp', 400, 'cup')
  assert.ok(result !== null)
  assert.ok(Math.abs(result - 50) < 2, `Expected ~50 cents for 2 tbsp, got ${result}`)
})

test('computeIngredientCost: ml to l conversion', () => {
  // 500 ml at 800 cents per liter
  // 500 ml = 0.5 l -> 0.5 * 800 = 400 cents
  const result = computeIngredientCost(500, 'ml', 800, 'l')
  assert.ok(result !== null)
  assert.equal(result, 400)
})

// ── lookupDensity ────────────────────────────────────────────────────

test('lookupDensity finds exact matches', () => {
  assert.equal(lookupDensity('flour'), 0.53)
  assert.equal(lookupDensity('sugar'), 0.85)
  assert.equal(lookupDensity('butter'), 0.91)
  assert.equal(lookupDensity('water'), 1.0)
  assert.equal(lookupDensity('honey'), 1.42)
  assert.equal(lookupDensity('salt'), 1.22)
  assert.equal(lookupDensity('milk'), 1.03)
})

test('lookupDensity is case-insensitive', () => {
  assert.equal(lookupDensity('FLOUR'), 0.53)
  assert.equal(lookupDensity('Sugar'), 0.85)
  assert.equal(lookupDensity('OLIVE OIL'), 0.92)
})

test('lookupDensity finds partial matches', () => {
  assert.equal(lookupDensity('organic all-purpose flour'), 0.53)
  assert.equal(lookupDensity('unsweetened cocoa powder'), 0.42)
  assert.equal(lookupDensity('fresh whole milk'), 1.03)
})

test('lookupDensity returns null for unknown ingredients', () => {
  assert.equal(lookupDensity('unobtanium'), null)
  assert.equal(lookupDensity('dragon fruit'), null)
  assert.equal(lookupDensity(''), null)
})

test('lookupDensity distinguishes flour types', () => {
  assert.equal(lookupDensity('bread flour'), 0.55)
  assert.equal(lookupDensity('cake flour'), 0.49)
  assert.equal(lookupDensity('almond flour'), 0.4)
  assert.equal(lookupDensity('coconut flour'), 0.5)
})

test('lookupDensity distinguishes salt types', () => {
  assert.equal(lookupDensity('salt'), 1.22)
  assert.equal(lookupDensity('kosher salt'), 0.64)
  assert.equal(lookupDensity('sea salt'), 1.1)
})

test('lookupDensity finds sugar variants', () => {
  assert.equal(lookupDensity('granulated sugar'), 0.85)
  assert.equal(lookupDensity('brown sugar'), 0.83)
  assert.equal(lookupDensity('powdered sugar'), 0.56)
})

test('lookupDensity finds liquid densities', () => {
  assert.equal(lookupDensity('soy sauce'), 1.15)
  assert.equal(lookupDensity('fish sauce'), 1.2)
  assert.equal(lookupDensity('maple syrup'), 1.33)
})

// ── canConvert ───────────────────────────────────────────────────────

test('canConvert returns true for same unit', () => {
  assert.equal(canConvert('cup', 'cup'), true)
  assert.equal(canConvert('lb', 'lb'), true)
})

test('canConvert returns true for same-type units', () => {
  assert.equal(canConvert('cup', 'tbsp'), true)
  assert.equal(canConvert('lb', 'oz'), true)
  assert.equal(canConvert('ml', 'l'), true)
  assert.equal(canConvert('g', 'kg'), true)
})

test('canConvert returns false for cross-type without density', () => {
  assert.equal(canConvert('cup', 'lb'), false)
  assert.equal(canConvert('oz', 'ml'), false)
})

test('canConvert returns true for cross-type with density', () => {
  assert.equal(canConvert('cup', 'lb', 0.53), true)
  assert.equal(canConvert('oz', 'ml', 1.0), true)
})

test('canConvert returns false for count-to-anything', () => {
  assert.equal(canConvert('each', 'cup'), false)
  assert.equal(canConvert('each', 'lb'), false)
  assert.equal(canConvert('each', 'cup', 1.0), false)
})

test('canConvert returns true for same count units', () => {
  assert.equal(canConvert('each', 'each'), true)
})

test('canConvert returns false for invalid density values', () => {
  assert.equal(canConvert('cup', 'lb', 0), false)
  assert.equal(canConvert('cup', 'lb', -1), false)
  assert.equal(canConvert('cup', 'lb', null), false)
})

test('canConvert works with aliases', () => {
  assert.equal(canConvert('tablespoons', 'teaspoons'), true)
  assert.equal(canConvert('pounds', 'ounces'), true)
  assert.equal(canConvert('liter', 'milliliter'), true)
})

// ── COMMON_DENSITIES sanity checks ───────────────────────────────────

test('COMMON_DENSITIES all values are positive numbers', () => {
  for (const [name, density] of Object.entries(COMMON_DENSITIES)) {
    assert.ok(typeof density === 'number', `${name} density is not a number`)
    assert.ok(density > 0, `${name} density ${density} is not positive`)
    assert.ok(density < 5, `${name} density ${density} seems unreasonably high`)
  }
})

test('COMMON_DENSITIES water is exactly 1.0', () => {
  assert.equal(COMMON_DENSITIES['water'], 1.0)
})

test('COMMON_DENSITIES flour is lighter than water', () => {
  assert.ok(COMMON_DENSITIES['flour'] < 1.0)
})

test('COMMON_DENSITIES honey is heavier than water', () => {
  assert.ok(COMMON_DENSITIES['honey'] > 1.0)
})

test('COMMON_DENSITIES has coverage for major ingredient categories', () => {
  // Flours
  assert.ok('flour' in COMMON_DENSITIES)
  assert.ok('bread flour' in COMMON_DENSITIES)
  assert.ok('cake flour' in COMMON_DENSITIES)
  // Sugars
  assert.ok('sugar' in COMMON_DENSITIES)
  assert.ok('brown sugar' in COMMON_DENSITIES)
  // Fats
  assert.ok('butter' in COMMON_DENSITIES)
  assert.ok('olive oil' in COMMON_DENSITIES)
  // Dairy
  assert.ok('milk' in COMMON_DENSITIES)
  assert.ok('heavy cream' in COMMON_DENSITIES)
  // Liquids
  assert.ok('water' in COMMON_DENSITIES)
  assert.ok('soy sauce' in COMMON_DENSITIES)
  // Grains
  assert.ok('rice' in COMMON_DENSITIES)
  assert.ok('oats' in COMMON_DENSITIES)
})

// ── Real-world costing scenarios ─────────────────────────────────────

test('scenario: cost 2 cups flour at $3/5lb bag', () => {
  // $3 per 5 lb = 60 cents/lb
  // 2 cups flour (density 0.53): 473.176 ml * 0.53 = 250.78g = 0.5529 lb
  // 0.5529 lb * 60 cents/lb = 33.17 -> 33 cents
  const cost = computeIngredientCost(2, 'cup', 60, 'lb', 0.53)
  assert.ok(cost !== null)
  assert.ok(cost >= 30 && cost <= 36, `Expected 30-36 cents for 2 cups cheap flour, got ${cost}`)
})

test('scenario: cost 1 tbsp olive oil at $12/liter', () => {
  // $12 per liter = 1200 cents/l
  // 1 tbsp = 14.787 ml = 0.014787 l
  // 0.014787 * 1200 = 17.74 -> 18 cents
  const cost = computeIngredientCost(1, 'tbsp', 1200, 'l')
  assert.ok(cost !== null)
  assert.ok(cost >= 16 && cost <= 20, `Expected 16-20 cents for 1 tbsp olive oil, got ${cost}`)
})

test('scenario: cost 500g butter at $5/lb', () => {
  // $5/lb = 500 cents/lb
  // 500g = 1.1023 lb
  // 1.1023 * 500 = 551.15 -> 551 cents
  const cost = computeIngredientCost(500, 'g', 500, 'lb')
  assert.ok(cost !== null)
  assert.ok(Math.abs(cost - 551) < 5, `Expected ~551 cents for 500g butter, got ${cost}`)
})

test('scenario: round-trip conversion preserves cost', () => {
  // Convert 1 lb cost to oz cost, then compute for 16 oz (should be ~same as 1 lb)
  const costPerLb = 500
  const costPerOz = convertCostToUnit(costPerLb, 'lb', 'oz')
  assert.ok(costPerOz !== null)

  // 16 oz at costPerOz should be ~500
  const totalFor16oz = Math.round(16 * costPerOz)
  assert.ok(
    Math.abs(totalFor16oz - costPerLb) < 10,
    `Round-trip: 16 oz should cost ~${costPerLb}, got ${totalFor16oz}`
  )
})
