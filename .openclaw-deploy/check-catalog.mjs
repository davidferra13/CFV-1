import Database from 'better-sqlite3';
const db = new Database('/home/davidferra/openclaw-prices/data/prices.db');

const products = db.prepare('SELECT COUNT(*) as c FROM catalog_products').get();
const prices = db.prepare('SELECT COUNT(*) as c FROM catalog_store_products').get();
console.log('Products:', products.c, 'Prices:', prices.c);

const priceSamples = db.prepare(`
  SELECT cp.name, cp.department, csp.price_cents, cp.size, cp.is_organic, cp.is_store_brand
  FROM catalog_products cp
  JOIN catalog_store_products csp ON cp.id = csp.product_id
  ORDER BY RANDOM() LIMIT 15
`).all();
console.log('\nSample products with prices:');
priceSamples.forEach(p => {
  const price = (p.price_cents / 100).toFixed(2);
  const flags = (p.is_organic ? ' [organic]' : '') + (p.is_store_brand ? ' [store brand]' : '');
  console.log(`  $${price} | ${p.name.substring(0, 55)} | ${p.department}${flags}`);
});

const avg = db.prepare('SELECT AVG(price_cents) as avg, MIN(price_cents) as min, MAX(price_cents) as max FROM catalog_store_products').get();
console.log(`\nPrice stats: avg=$${(avg.avg/100).toFixed(2)} min=$${(avg.min/100).toFixed(2)} max=$${(avg.max/100).toFixed(2)}`);

const depts = db.prepare('SELECT department, COUNT(*) as c FROM catalog_products GROUP BY department ORDER BY c DESC').all();
console.log('\nBy department:');
depts.forEach(d => console.log(`  ${d.department}: ${d.c}`));

const run = db.prepare('SELECT * FROM catalog_scrape_runs ORDER BY id DESC LIMIT 1').get();
if (run) {
  console.log('\nLatest run:', run.scraper_name, '| found:', run.products_found, '| new:', run.products_new, '| finished:', run.finished_at || 'still running');
}
