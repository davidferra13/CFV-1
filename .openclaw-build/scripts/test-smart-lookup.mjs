/**
 * Test the smart lookup against 74 common dinner items.
 * Run on Pi: node scripts/test-smart-lookup.mjs
 */
import Database from 'better-sqlite3';
import { smartLookup } from '../lib/smart-lookup.mjs';

const db = new Database('/home/davidferra/openclaw-prices/data/prices.db', { readonly: true });

console.log('=== Smart Lookup Test (74 common dinner items) ===\n');

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

let found = 0, priced = 0, notFound = [], noPrice = [];
for (const item of testItems) {
  const result = smartLookup(db, item);
  if (result) {
    found++;
    if (result.best_price) {
      priced++;
      console.log(`  OK  ${item.padEnd(18)} -> ${result.name.padEnd(40)} $${(result.best_price/100).toFixed(2).padStart(6)}/${result.best_unit} @ ${result.best_store}`);
    } else {
      console.log(`  --  ${item.padEnd(18)} -> ${result.name.padEnd(40)} (no price yet)`);
      noPrice.push(item);
    }
  } else {
    console.log(`  XX  ${item.padEnd(18)} -> NOT IN CATALOG`);
    notFound.push(item);
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Found in catalog: ${found}/74 (${Math.round(found/74*100)}%)`);
console.log(`With prices:      ${priced}/74 (${Math.round(priced/74*100)}%)`);
if (noPrice.length > 0) console.log(`No price yet:     ${noPrice.join(', ')}`);
if (notFound.length > 0) console.log(`Not in catalog:   ${notFound.join(', ')}`);

db.close();
