import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'

const dir = new URL('./usda-sr-legacy/FoodData_Central_sr_legacy_food_csv_2018-04/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

// Parse food.csv properly
const foodCsv = readFileSync(dir + 'food.csv', 'utf8')
const foods = parse(foodCsv, { columns: true, skip_empty_lines: true })

// Parse sr_legacy_food.csv for NDB numbers
const ndbCsv = readFileSync(dir + 'sr_legacy_food.csv', 'utf8')
const ndbRows = parse(ndbCsv, { columns: true, skip_empty_lines: true })
const ndbMap = Object.fromEntries(ndbRows.map(r => [r.fdc_id, r.NDB_number]))

// Parse food_category.csv
const catCsv = readFileSync(dir + 'food_category.csv', 'utf8')
const cats = parse(catCsv, { columns: true, skip_empty_lines: true })
const catMap = Object.fromEntries(cats.map(c => [c.id, c.description]))

// Group by category
const groups = {}
for (const food of foods) {
  const catId = food.food_category_id
  if (!groups[catId]) groups[catId] = []
  groups[catId].push(food.description)
}

console.log('=== ITEM COUNTS PER FOOD GROUP ===\n')
let total = 0
const excluded = ['3', '8', '21', '22', '23', '25']
let exclTotal = 0
for (const cat of cats) {
  const items = groups[cat.id] || []
  const mark = excluded.includes(cat.id) ? ' [EXCLUDED]' : ''
  console.log(`  ${cat.code} ${cat.description}: ${items.length}${mark}`)
  total += items.length
  if (excluded.includes(cat.id)) exclTotal += items.length
}
console.log(`\n  TOTAL: ${total}`)
console.log(`  EXCLUDED: ${exclTotal}`)
console.log(`  REMAINING: ${total - exclTotal}`)

// Show samples from key groups
const show = [
  ['13', 'Beef'], ['5', 'Poultry'], ['11', 'Vegetables'],
  ['2', 'Spices'], ['1', 'Dairy'], ['15', 'Seafood']
]

for (const [gid, label] of show) {
  const items = groups[gid] || []
  console.log(`\n=== ${label} (${items.length} items) - first 10 ===`)
  items.slice(0, 10).forEach(d => console.log(`  ${d}`))
}

// Check for descriptions with commas/quotes
let hasComma = 0, hasQuote = 0, maxLen = 0
for (const food of foods) {
  if (food.description.includes('"')) hasQuote++
  maxLen = Math.max(maxLen, food.description.length)
}
console.log(`\nDescriptions with embedded quotes: ${hasQuote}`)
console.log(`Max description length: ${maxLen}`)
console.log(`Total parsed foods: ${foods.length}`)

// Check for portion data
const portionCsv = readFileSync(dir + 'food_portion.csv', 'utf8')
const portions = parse(portionCsv, { columns: true, skip_empty_lines: true })
console.log(`\nTotal portion records: ${portions.length}`)

// Show sample portions
console.log('\n=== Sample Portions ===')
for (const p of portions.slice(0, 15)) {
  console.log(`  fdc_id=${p.fdc_id} amount=${p.amount} modifier="${p.modifier}" gram_weight=${p.gram_weight}`)
}
