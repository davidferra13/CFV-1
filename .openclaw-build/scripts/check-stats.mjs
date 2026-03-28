import Database from 'better-sqlite3';
const db = new Database('/home/davidferra/openclaw-prices/data/prices.db', { readonly: true });

console.log('=== OpenClaw Database Stats ===');
console.log('Ingredients:', db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get().c);
console.log('Prices:', db.prepare('SELECT COUNT(*) as c FROM current_prices').get().c);
console.log('Priced ingredients:', db.prepare('SELECT COUNT(DISTINCT canonical_ingredient_id) as c FROM current_prices').get().c);
console.log('Sources:', db.prepare('SELECT COUNT(*) as c FROM source_registry').get().c);

console.log('\n=== Category Coverage ===');
const cats = db.prepare(`
  SELECT ci.category, COUNT(DISTINCT ci.ingredient_id) as total,
    COUNT(DISTINCT cp.canonical_ingredient_id) as priced
  FROM canonical_ingredients ci
  LEFT JOIN current_prices cp ON ci.ingredient_id = cp.canonical_ingredient_id
  GROUP BY ci.category ORDER BY total DESC
`).all();
cats.forEach(c => console.log(`  ${c.category}: ${c.priced}/${c.total} (${Math.round(c.priced/c.total*100)}%)`));

// Test lookups for common dinner items
console.log('\n=== Dinner Lookup Test (74 items) ===');
const testItems = [
  'chicken breast', 'ground beef', 'salmon', 'shrimp', 'pork chop',
  'bacon', 'sausage', 'steak', 'turkey', 'ham',
  'rice', 'pasta', 'bread', 'flour', 'sugar',
  'butter', 'milk', 'cheese', 'eggs', 'cream',
  'olive oil', 'vegetable oil', 'soy sauce', 'vinegar', 'ketchup',
  'mustard', 'mayonnaise', 'salt', 'pepper', 'garlic',
  'onion', 'potato', 'tomato', 'carrot', 'broccoli',
  'spinach', 'lettuce', 'corn', 'bell pepper', 'mushroom',
  'apple', 'banana', 'lemon', 'orange', 'strawberry',
  'blueberry', 'avocado', 'celery', 'cucumber', 'green bean',
  'honey', 'peanut butter', 'jelly', 'cereal', 'oatmeal',
  'yogurt', 'sour cream', 'cream cheese', 'mozzarella', 'cheddar',
  'chicken thigh', 'ribeye', 'ground turkey', 'cod', 'tuna',
  'hot sauce', 'soda', 'ice cream', 'cookie', 'lamb chop',
  'veal', 'black bean', 'lentil', 'cumin'
];

let found = 0, priced = 0, notFound = [];
for (const item of testItems) {
  // Search by name and ID
  const result = db.prepare(`
    SELECT ci.ingredient_id, ci.name, ci.category,
      (SELECT MIN(cp.price_cents) FROM current_prices cp WHERE cp.canonical_ingredient_id = ci.ingredient_id) as best_price,
      (SELECT sr.name FROM current_prices cp JOIN source_registry sr ON cp.source_id = sr.source_id WHERE cp.canonical_ingredient_id = ci.ingredient_id ORDER BY cp.price_cents ASC LIMIT 1) as best_store
    FROM canonical_ingredients ci
    WHERE ci.name LIKE ? OR ci.ingredient_id LIKE ?
    ORDER BY
      CASE WHEN LOWER(ci.name) = ? THEN 0
           WHEN LOWER(ci.name) LIKE ? THEN 1
           WHEN ci.ingredient_id LIKE ? THEN 2
           ELSE 3 END,
      LENGTH(ci.name) ASC
    LIMIT 1
  `).get(`%${item}%`, `%${item.replace(/\s+/g, '-')}%`, item, `${item}%`, `%${item.replace(/\s+/g, '-')}%`);

  if (result) {
    found++;
    if (result.best_price) {
      priced++;
      console.log(`  OK  ${item} -> ${result.name} $${(result.best_price/100).toFixed(2)} @ ${result.best_store}`);
    } else {
      console.log(`  --  ${item} -> ${result.name} (no price yet)`);
      notFound.push(item);
    }
  } else {
    console.log(`  XX  ${item} -> NOT IN CATALOG`);
    notFound.push(item);
  }
}

console.log(`\n=== Results: ${found}/74 found in catalog, ${priced}/74 with prices ===`);
if (notFound.length > 0) console.log('Missing/no price:', notFound.join(', '));

db.close();
