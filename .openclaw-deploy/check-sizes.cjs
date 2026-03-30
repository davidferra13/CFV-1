const Database = require('better-sqlite3');
const db = new Database('./data/prices.db');

const samples = db.prepare("SELECT name, size, size_value, size_unit FROM catalog_products WHERE (size_value IS NULL OR size_value = 0) AND size IS NOT NULL AND size != '' ORDER BY RANDOM() LIMIT 20").all();
console.log('=== Products with size text but no parsed value ===');
samples.forEach(s => console.log(JSON.stringify(s)));

console.log('');
const withSize = db.prepare("SELECT COUNT(*) as c FROM catalog_products WHERE size IS NOT NULL AND size != ''").get().c;
const withParsed = db.prepare("SELECT COUNT(*) as c FROM catalog_products WHERE size_value IS NOT NULL AND size_value > 0").get().c;
const total = db.prepare("SELECT COUNT(*) as c FROM catalog_products").get().c;
console.log('Total products:', total);
console.log('With size text:', withSize);
console.log('With parsed size_value:', withParsed);
console.log('Parseable gap:', withSize - withParsed);
db.close();
