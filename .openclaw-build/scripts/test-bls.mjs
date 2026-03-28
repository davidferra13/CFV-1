import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(join(__dirname, '..', 'config', '.env'), 'utf-8');
const BLS_API_KEY = envContent.match(/BLS_API_KEY=(\S+)/)?.[1] || '';
console.log('Key:', BLS_API_KEY.substring(0, 4) + '...');

// All known BLS Average Price food series for Northeast (APU02)
const ALL_FOOD_SERIES = [
  // Cereals & bakery
  { id: 'APU0200701111', name: 'Flour, white, all purpose, per lb', ingredient: 'flour-all-purpose', unit: 'lb' },
  { id: 'APU0200703111', name: 'Rice, white, long grain, uncooked, per lb', ingredient: 'rice-white-long', unit: 'lb' },
  { id: 'APU0200703112', name: 'Flour, white, all purpose, per lb (v2)', ingredient: 'flour-all-purpose', unit: 'lb' },
  { id: 'APU0200703213', name: 'Rice, white, long grain, per lb', ingredient: 'rice-white-long', unit: 'lb' },
  { id: 'APU0200704111', name: 'Bread, white, pan, per lb', ingredient: 'bread-white', unit: 'lb' },
  { id: 'APU0200704212', name: 'Bread, whole wheat, pan, per lb', ingredient: 'bread-whole-wheat', unit: 'lb' },
  { id: 'APU0200705111', name: 'Spaghetti and macaroni, per lb', ingredient: 'pasta-spaghetti', unit: 'lb' },
  // Meats
  { id: 'APU0200706111', name: 'Ground chuck, 100% beef, per lb', ingredient: 'beef-ground-chuck', unit: 'lb' },
  { id: 'APU0200706211', name: 'Ground beef, 100% beef, per lb', ingredient: 'beef-ground', unit: 'lb' },
  { id: 'APU0200706212', name: 'Chuck roast, USDA Choice, boneless, per lb', ingredient: 'beef-chuck', unit: 'lb' },
  { id: 'APU0200706213', name: 'Round roast, USDA Choice, boneless, per lb', ingredient: 'beef-round-roast', unit: 'lb' },
  { id: 'APU0200706311', name: 'Steak, sirloin, USDA Choice, boneless, per lb', ingredient: 'beef-sirloin', unit: 'lb' },
  { id: 'APU0200706312', name: 'Steak, round, USDA Choice, boneless, per lb', ingredient: 'beef-round-steak', unit: 'lb' },
  { id: 'APU0200706411', name: 'Beef for stew, boneless, per lb', ingredient: 'beef-stew-meat', unit: 'lb' },
  // Pork
  { id: 'APU0200707111', name: 'Bacon, sliced, per lb', ingredient: 'bacon', unit: 'lb' },
  { id: 'APU0200707211', name: 'Pork chops, center cut, bone-in, per lb', ingredient: 'pork-chops', unit: 'lb' },
  { id: 'APU0200707311', name: 'Ham, boneless, exc canned, per lb', ingredient: 'ham-boneless', unit: 'lb' },
  { id: 'APU0200707411', name: 'Pork sausage, fresh, loose, per lb', ingredient: 'sausage', unit: 'lb' },
  // Poultry
  { id: 'APU0200708111', name: 'Chicken, fresh, whole, per lb', ingredient: 'chicken-whole', unit: 'lb' },
  { id: 'APU0200708112', name: 'Chicken breast, bone-in, per lb', ingredient: 'chicken-breast-bone-in', unit: 'lb' },
  { id: 'APU0200708113', name: 'Chicken legs, bone-in, per lb', ingredient: 'chicken-legs', unit: 'lb' },
  // Fish
  { id: 'APU0200709111', name: 'Canned tuna, light, per lb', ingredient: 'tuna-canned', unit: 'lb' },
  { id: 'APU0200709112', name: 'Tuna, chunk, light, per lb', ingredient: 'tuna-canned', unit: 'lb' },
  // Dairy & eggs
  { id: 'APU0200710111', name: 'Eggs, grade A, large, per doz', ingredient: 'eggs-large', unit: 'dozen' },
  { id: 'APU0200710211', name: 'Milk, fresh, whole, fortified, per gal', ingredient: 'milk-whole', unit: 'gallon' },
  { id: 'APU0200710212', name: 'Milk, fresh, low fat (2%), per gal', ingredient: 'milk-2pct', unit: 'gallon' },
  { id: 'APU0200710411', name: 'Butter, salted, grade AA, stick, per lb', ingredient: 'butter-salted', unit: 'lb' },
  { id: 'APU0200710511', name: 'American processed cheese, per lb', ingredient: 'cheese-american', unit: 'lb' },
  { id: 'APU0200710611', name: 'Cheddar cheese, natural, per lb', ingredient: 'cheese-cheddar', unit: 'lb' },
  // Fruits
  { id: 'APU0200711111', name: 'Apples, Red Delicious, per lb', ingredient: 'apple', unit: 'lb' },
  { id: 'APU0200711211', name: 'Bananas, per lb', ingredient: 'banana', unit: 'lb' },
  { id: 'APU0200711311', name: 'Oranges, Navel, per lb', ingredient: 'orange', unit: 'lb' },
  { id: 'APU0200711411', name: 'Strawberries, dry pint, per 12 oz', ingredient: 'strawberries', unit: '12oz' },
  { id: 'APU0200711412', name: 'Grapes, Thompson Seedless, per lb', ingredient: 'grapes', unit: 'lb' },
  { id: 'APU0200711413', name: 'Lemons, per lb', ingredient: 'lemon', unit: 'lb' },
  // Vegetables
  { id: 'APU0200712111', name: 'Lettuce, iceberg, per lb', ingredient: 'lettuce-iceberg', unit: 'lb' },
  { id: 'APU0200712211', name: 'Tomatoes, field grown, per lb', ingredient: 'tomato', unit: 'lb' },
  { id: 'APU0200712311', name: 'Broccoli, per lb', ingredient: 'broccoli', unit: 'lb' },
  { id: 'APU0200712401', name: 'Peppers, sweet, per lb', ingredient: 'bell-pepper', unit: 'lb' },
  { id: 'APU0200712406', name: 'Potatoes, white, per lb', ingredient: 'potato-russet', unit: 'lb' },
  { id: 'APU0200712407', name: 'Carrots, short trimmed, per lb', ingredient: 'carrot', unit: 'lb' },
  { id: 'APU0200712408', name: 'Celery, per lb', ingredient: 'celery', unit: 'lb' },
  // Other
  { id: 'APU0200713111', name: 'Sugar, white, all sizes, per lb', ingredient: 'sugar-granulated', unit: 'lb' },
  { id: 'APU0200714233', name: 'Peanut butter, creamy, all sizes, per lb', ingredient: 'peanut-butter', unit: 'lb' },
  { id: 'APU0200717311', name: 'Coffee, 100%, ground roast, all sizes, per lb', ingredient: 'coffee-ground', unit: 'lb' },
  { id: 'APU0200720111', name: 'Cookies, chocolate chip, per lb', ingredient: 'cookies', unit: 'lb' },
  { id: 'APU0200720311', name: 'Crackers, soda, per lb', ingredient: 'crackers-saltine', unit: 'lb' },
  { id: 'APU0200720411', name: 'Potato chips, per 16 oz', ingredient: 'chips-potato', unit: '16oz' },
  // Additional series to try (CPI food items)
  { id: 'APU0200FJ1101', name: 'Orange juice, frozen concentrate, 12 oz', ingredient: 'orange-juice', unit: '12oz' },
  { id: 'APU0200FN1101', name: 'Cola, per 2 liters', ingredient: 'cola', unit: '2L' },
];

// Request in batches of 25 (BLS limit is 50 per request for v2)
const BATCH_SIZE = 25;
let found = 0;

for (let i = 0; i < ALL_FOOD_SERIES.length; i += BATCH_SIZE) {
  const batch = ALL_FOOD_SERIES.slice(i, i + BATCH_SIZE);
  const ids = batch.map(s => s.id);

  console.log(`\nBatch ${Math.floor(i/BATCH_SIZE)+1}: requesting ${ids.length} series...`);

  try {
    const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationkey: BLS_API_KEY,
        seriesid: ids,
        startyear: '2025',
        endyear: '2026'
      })
    });

    const data = await res.json();
    if (data.status === 'REQUEST_SUCCEEDED') {
      for (const s of data.Results?.series || []) {
        const latest = s.data?.[0];
        if (latest && latest.value !== '-') {
          const info = ALL_FOOD_SERIES.find(x => x.id === s.seriesID);
          console.log(`  ${s.seriesID} = $${latest.value}/${info?.unit || '?'} - ${info?.name || '?'} (${latest.periodName} ${latest.year})`);
          found++;
        }
      }
    } else {
      console.log('  Status:', data.status, data.message?.join(' '));
    }
  } catch (err) {
    console.error('  Error:', err.message);
  }

  // Rate limit - BLS allows 500 requests/day with key
  await new Promise(r => setTimeout(r, 2000));
}

console.log(`\nTotal BLS series with data: ${found}`);
